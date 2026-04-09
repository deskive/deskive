import '../../models/workflow.dart';
import '../base_api_client.dart';
import '../../services/auth_service.dart';

class WorkflowApiService {
  static final WorkflowApiService _instance = WorkflowApiService._internal();
  static WorkflowApiService get instance => _instance;

  WorkflowApiService._internal();

  /// Helper to safely extract data from response
  dynamic _extractData(dynamic responseData) {
    if (responseData is Map && responseData.containsKey('data')) {
      return responseData['data'];
    }
    return responseData;
  }

  /// Helper to safely extract error message from response
  String? _extractMessage(dynamic responseData) {
    if (responseData is Map && responseData.containsKey('message')) {
      return responseData['message']?.toString();
    }
    return null;
  }

  // ============================================
  // WORKFLOWS
  // ============================================

  /// Get all workflows for a workspace
  Future<ApiResponse<List<Workflow>>> getWorkflows(
    String workspaceId, {
    bool? isActive,
    String? triggerType,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (isActive != null) queryParams['isActive'] = isActive.toString();
      if (triggerType != null) queryParams['triggerType'] = triggerType;
      if (limit != null) queryParams['limit'] = limit.toString();
      if (offset != null) queryParams['offset'] = offset.toString();

      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/workflows',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final workflows = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => Workflow.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(workflows);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch workflows');
    } catch (e) {
      return ApiResponse.error('Failed to fetch workflows: $e');
    }
  }

  /// Get pending workflows (scheduled or with pending executions)
  Future<ApiResponse<List<PendingWorkflow>>> getPendingWorkflows(
    String workspaceId, {
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (limit != null) queryParams['limit'] = limit.toString();
      if (offset != null) queryParams['offset'] = offset.toString();

      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/workflows/pending',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final pendingWorkflows = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => PendingWorkflow.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(pendingWorkflows);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch pending workflows');
    } catch (e) {
      return ApiResponse.error('Failed to fetch pending workflows: $e');
    }
  }

  /// Get a single workflow with steps
  Future<ApiResponse<Workflow>> getWorkflow(String workspaceId, String workflowId) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/workflows/$workflowId',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(Workflow.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch workflow');
    } catch (e) {
      return ApiResponse.error('Failed to fetch workflow: $e');
    }
  }

  /// Create a new workflow
  Future<ApiResponse<Workflow>> createWorkflow(
    String workspaceId, {
    required String name,
    String? description,
    String? icon,
    String? color,
    required WorkflowTriggerType triggerType,
    required Map<String, dynamic> triggerConfig,
    List<Map<String, dynamic>>? steps,
    bool isActive = true,
  }) async {
    try {
      final body = {
        'name': name,
        'triggerType': triggerType.value,
        'triggerConfig': triggerConfig,
        'isActive': isActive,
      };

      if (description != null) body['description'] = description;
      if (icon != null) body['icon'] = icon;
      if (color != null) body['color'] = color;
      if (steps != null) body['steps'] = steps;

      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows',
        data: body,
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(Workflow.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to create workflow');
    } catch (e) {
      return ApiResponse.error('Failed to create workflow: $e');
    }
  }

  /// Update a workflow
  Future<ApiResponse<Workflow>> updateWorkflow(
    String workspaceId,
    String workflowId, {
    String? name,
    String? description,
    String? icon,
    String? color,
    WorkflowTriggerType? triggerType,
    Map<String, dynamic>? triggerConfig,
    bool? isActive,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (name != null) body['name'] = name;
      if (description != null) body['description'] = description;
      if (icon != null) body['icon'] = icon;
      if (color != null) body['color'] = color;
      if (triggerType != null) body['triggerType'] = triggerType.value;
      if (triggerConfig != null) body['triggerConfig'] = triggerConfig;
      if (isActive != null) body['isActive'] = isActive;

      final response = await AuthService.instance.dio.patch(
        '/workspaces/$workspaceId/workflows/$workflowId',
        data: body,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(Workflow.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to update workflow');
    } catch (e) {
      return ApiResponse.error('Failed to update workflow: $e');
    }
  }

  /// Delete a workflow
  Future<ApiResponse<void>> deleteWorkflow(String workspaceId, String workflowId) async {
    try {
      final response = await AuthService.instance.dio.delete(
        '/workspaces/$workspaceId/workflows/$workflowId',
      );

      if (response.statusCode == 204 || response.statusCode == 200) {
        return ApiResponse.success(null);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to delete workflow');
    } catch (e) {
      return ApiResponse.error('Failed to delete workflow: $e');
    }
  }

  /// Toggle workflow active state
  Future<ApiResponse<Workflow>> toggleWorkflow(String workspaceId, String workflowId) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/$workflowId/toggle',
        data: {},
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(Workflow.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to toggle workflow');
    } catch (e) {
      return ApiResponse.error('Failed to toggle workflow: $e');
    }
  }

  /// Duplicate a workflow
  Future<ApiResponse<Workflow>> duplicateWorkflow(String workspaceId, String workflowId) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/$workflowId/duplicate',
        data: {},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(Workflow.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to duplicate workflow');
    } catch (e) {
      return ApiResponse.error('Failed to duplicate workflow: $e');
    }
  }

  // ============================================
  // WORKFLOW STEPS
  // ============================================

  /// Add a step to workflow
  Future<ApiResponse<WorkflowStep>> addWorkflowStep(
    String workspaceId,
    String workflowId, {
    required int stepOrder,
    required WorkflowStepType stepType,
    String? stepName,
    required Map<String, dynamic> stepConfig,
    String? parentStepId,
    String? branchPath,
    int? positionX,
    int? positionY,
  }) async {
    try {
      final body = {
        'stepOrder': stepOrder,
        'stepType': stepType.value,
        'stepConfig': stepConfig,
      };

      if (stepName != null) body['stepName'] = stepName;
      if (parentStepId != null) body['parentStepId'] = parentStepId;
      if (branchPath != null) body['branchPath'] = branchPath;
      if (positionX != null) body['positionX'] = positionX;
      if (positionY != null) body['positionY'] = positionY;

      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/$workflowId/steps',
        data: body,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(WorkflowStep.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to add step');
    } catch (e) {
      return ApiResponse.error('Failed to add step: $e');
    }
  }

  /// Update a workflow step
  Future<ApiResponse<WorkflowStep>> updateWorkflowStep(
    String workspaceId,
    String workflowId,
    String stepId, {
    int? stepOrder,
    WorkflowStepType? stepType,
    String? stepName,
    Map<String, dynamic>? stepConfig,
    String? parentStepId,
    String? branchPath,
    bool? isActive,
    int? positionX,
    int? positionY,
  }) async {
    try {
      final body = <String, dynamic>{};

      if (stepOrder != null) body['stepOrder'] = stepOrder;
      if (stepType != null) body['stepType'] = stepType.value;
      if (stepName != null) body['stepName'] = stepName;
      if (stepConfig != null) body['stepConfig'] = stepConfig;
      if (parentStepId != null) body['parentStepId'] = parentStepId;
      if (branchPath != null) body['branchPath'] = branchPath;
      if (isActive != null) body['isActive'] = isActive;
      if (positionX != null) body['positionX'] = positionX;
      if (positionY != null) body['positionY'] = positionY;

      final response = await AuthService.instance.dio.patch(
        '/workspaces/$workspaceId/workflows/$workflowId/steps/$stepId',
        data: body,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(WorkflowStep.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to update step');
    } catch (e) {
      return ApiResponse.error('Failed to update step: $e');
    }
  }

  /// Delete a workflow step
  Future<ApiResponse<void>> deleteWorkflowStep(
    String workspaceId,
    String workflowId,
    String stepId,
  ) async {
    try {
      final response = await AuthService.instance.dio.delete(
        '/workspaces/$workspaceId/workflows/$workflowId/steps/$stepId',
      );

      if (response.statusCode == 204 || response.statusCode == 200) {
        return ApiResponse.success(null);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to delete step');
    } catch (e) {
      return ApiResponse.error('Failed to delete step: $e');
    }
  }

  // ============================================
  // WORKFLOW EXECUTION
  // ============================================

  /// Execute a workflow manually
  Future<ApiResponse<Map<String, dynamic>>> executeWorkflow(
    String workspaceId,
    String workflowId, {
    Map<String, dynamic>? context,
    Map<String, dynamic>? triggerData,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (context != null) body['context'] = context;
      if (triggerData != null) body['triggerData'] = triggerData;

      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/$workflowId/execute',
        data: body,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);
        return ApiResponse.success(data is Map<String, dynamic> ? data : {});
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to execute workflow');
    } catch (e) {
      return ApiResponse.error('Failed to execute workflow: $e');
    }
  }

  /// Test a workflow
  Future<ApiResponse<Map<String, dynamic>>> testWorkflow(
    String workspaceId,
    String workflowId, {
    Map<String, dynamic>? context,
    Map<String, dynamic>? triggerData,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (context != null) body['context'] = context;
      if (triggerData != null) body['triggerData'] = triggerData;

      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/$workflowId/test',
        data: body,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);
        return ApiResponse.success(data is Map<String, dynamic> ? data : {});
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to test workflow');
    } catch (e) {
      return ApiResponse.error('Failed to test workflow: $e');
    }
  }

  /// Get workflow executions
  Future<ApiResponse<List<WorkflowExecution>>> getWorkflowExecutions(
    String workspaceId,
    String workflowId, {
    String? status,
    int? limit,
    int? offset,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (limit != null) queryParams['limit'] = limit.toString();
      if (offset != null) queryParams['offset'] = offset.toString();

      final response = await AuthService.instance.dio.get(
        '/workspaces/$workspaceId/workflows/$workflowId/executions',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.success([]);
        }

        final executions = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => WorkflowExecution.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(executions);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch executions');
    } catch (e) {
      return ApiResponse.error('Failed to fetch executions: $e');
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================

  /// Get all automation templates
  Future<ApiResponse<List<AutomationTemplate>>> getTemplates({
    String? category,
    bool? featured,
    int? limit,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (category != null) queryParams['category'] = category;
      if (featured != null) queryParams['featured'] = featured.toString();
      if (limit != null) queryParams['limit'] = limit.toString();

      final response = await AuthService.instance.dio.get(
        '/automation-templates',
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final templates = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => AutomationTemplate.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(templates);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch templates');
    } catch (e) {
      return ApiResponse.error('Failed to fetch templates: $e');
    }
  }

  /// Get featured templates
  Future<ApiResponse<List<AutomationTemplate>>> getFeaturedTemplates() async {
    try {
      final response = await AuthService.instance.dio.get(
        '/automation-templates/featured',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final templates = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => AutomationTemplate.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(templates);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch templates');
    } catch (e) {
      return ApiResponse.error('Failed to fetch templates: $e');
    }
  }

  /// Get template categories
  Future<ApiResponse<List<TemplateCategory>>> getTemplateCategories() async {
    try {
      final response = await AuthService.instance.dio.get(
        '/automation-templates/categories',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        final categories = data
            .where((item) => item != null && item is Map<String, dynamic>)
            .map((item) => TemplateCategory.fromJson(item as Map<String, dynamic>))
            .toList();
        return ApiResponse.success(categories);
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch categories');
    } catch (e) {
      return ApiResponse.error('Failed to fetch categories: $e');
    }
  }

  /// Get a single template
  Future<ApiResponse<AutomationTemplate>> getTemplate(String templateId) async {
    try {
      final response = await AuthService.instance.dio.get(
        '/automation-templates/$templateId',
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(AutomationTemplate.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to fetch template');
    } catch (e) {
      return ApiResponse.error('Failed to fetch template: $e');
    }
  }

  /// Use a template to create a workflow
  Future<ApiResponse<Workflow>> useTemplate(
    String templateId,
    String workspaceId, {
    String? name,
    Map<String, dynamic>? variables,
  }) async {
    try {
      final body = <String, dynamic>{
        'workspaceId': workspaceId,
      };

      if (name != null) body['name'] = name;
      if (variables != null) body['variables'] = variables;

      final response = await AuthService.instance.dio.post(
        '/automation-templates/$templateId/use',
        data: body,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(Workflow.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to use template');
    } catch (e) {
      return ApiResponse.error('Failed to use template: $e');
    }
  }

  /// Save workflow as template
  Future<ApiResponse<AutomationTemplate>> saveAsTemplate(
    String workspaceId,
    String workflowId, {
    required String name,
    String? description,
    required String category,
    String? icon,
    String? color,
    List<Map<String, dynamic>>? variables,
  }) async {
    try {
      final body = <String, dynamic>{
        'name': name,
        'category': category,
      };

      if (description != null) body['description'] = description;
      if (icon != null) body['icon'] = icon;
      if (color != null) body['color'] = color;
      if (variables != null) body['variables'] = variables;

      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/$workflowId/save-as-template',
        data: body,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(AutomationTemplate.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to save template');
    } catch (e) {
      return ApiResponse.error('Failed to save template: $e');
    }
  }

  // ============================================
  // AI WORKFLOW GENERATION
  // ============================================

  /// Generate workflow from natural language description
  Future<ApiResponse<GeneratedWorkflowResult>> generateWorkflow(
    String workspaceId,
    String description,
  ) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/generate',
        data: {'description': description},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = _extractData(response.data);

        if (data is! Map<String, dynamic>) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(GeneratedWorkflowResult.fromJson(data));
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to generate workflow');
    } catch (e) {
      return ApiResponse.error('Failed to generate workflow: $e');
    }
  }

  /// Get AI suggestions for workflow description
  Future<ApiResponse<List<String>>> getAISuggestions(
    String partialDescription,
  ) async {
    try {
      // Use a fixed workspaceId or make it optional on the backend
      final response = await AuthService.instance.dio.post(
        '/workspaces/default/workflows/generate/suggestions',
        data: {'partialDescription': partialDescription},
      );

      if (response.statusCode == 200) {
        final data = _extractData(response.data);

        if (data is! List) {
          return ApiResponse.error('Invalid response format');
        }

        return ApiResponse.success(data.cast<String>());
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to get suggestions');
    } catch (e) {
      // Return empty suggestions on error instead of failing
      return ApiResponse.success([
        'When a task is created, notify the assignee',
        'When a high-priority task is completed, send a Slack message',
        'Every day at 9 AM, send a summary of overdue tasks',
        'When a note is created, add a follow-up task',
        'When an event starts, send a reminder to attendees',
      ]);
    }
  }

  /// Generate and create workflow in one step
  Future<ApiResponse<Workflow>> generateAndCreateWorkflow(
    String workspaceId,
    String description,
  ) async {
    try {
      final response = await AuthService.instance.dio.post(
        '/workspaces/$workspaceId/workflows/generate/create',
        data: {'description': description},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = response.data;

        // Check if workflow was created
        if (responseData is Map<String, dynamic>) {
          final created = responseData['created'] ?? false;
          if (!created) {
            final errors = responseData['errors'] as List?;
            return ApiResponse.error(
              errors?.join(', ') ?? 'Workflow validation failed',
            );
          }

          final data = responseData['data'];
          if (data is Map<String, dynamic> && data['workflow'] != null) {
            return ApiResponse.success(
              Workflow.fromJson(data['workflow'] as Map<String, dynamic>),
            );
          }
        }

        return ApiResponse.error('Invalid response format');
      }
      return ApiResponse.error(_extractMessage(response.data) ?? 'Failed to create workflow');
    } catch (e) {
      return ApiResponse.error('Failed to create workflow: $e');
    }
  }
}

/// Result from AI workflow generation
class GeneratedWorkflowResult {
  final Map<String, dynamic> workflow;
  final double confidence;
  final List<String> suggestions;
  final List<String> warnings;

  GeneratedWorkflowResult({
    required this.workflow,
    required this.confidence,
    required this.suggestions,
    required this.warnings,
  });

  factory GeneratedWorkflowResult.fromJson(Map<String, dynamic> json) {
    return GeneratedWorkflowResult(
      workflow: json['workflow'] as Map<String, dynamic>? ?? {},
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      suggestions: (json['suggestions'] as List?)?.cast<String>() ?? [],
      warnings: (json['warnings'] as List?)?.cast<String>() ?? [],
    );
  }
}
