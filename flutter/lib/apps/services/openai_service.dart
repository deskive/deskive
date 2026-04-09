import 'package:dio/dio.dart';
import '../../api/base_api_client.dart';
import '../../config/app_config.dart';
import '../models/openai_models.dart';

/// Service for OpenAI API operations
class OpenAIService {
  static OpenAIService? _instance;
  final BaseApiClient _apiClient = BaseApiClient.instance;

  static OpenAIService get instance => _instance ??= OpenAIService._internal();

  OpenAIService._internal();

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /// Connect to OpenAI with API key
  Future<OpenAIConnection> connect({
    required String apiKey,
    String? model,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/openai/connect',
      data: {
        'apiKey': apiKey,
        if (model != null) 'model': model,
      },
    );

    final data = _extractData(response.data);
    return OpenAIConnection.fromJson(data as Map<String, dynamic>);
  }

  /// Get current OpenAI connection status
  Future<OpenAIConnection?> getConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    try {
      final response = await _apiClient.get(
        '/workspaces/$workspaceId/openai/connection',
      );

      final data = _extractData(response.data);
      if (data == null) return null;

      return OpenAIConnection.fromJson(data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  /// Disconnect OpenAI
  Future<void> disconnect() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    await _apiClient.delete('/workspaces/$workspaceId/openai/disconnect');
  }

  /// Test the OpenAI API key connection
  Future<OpenAITestConnectionResponse> testConnection() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/openai/test',
      data: {},
    );

    final data = _extractData(response.data);
    return OpenAITestConnectionResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Models
  // ==========================================================================

  /// List available OpenAI models
  Future<OpenAIListModelsResponse> listModels() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/openai/models',
    );

    final data = _extractData(response.data);
    return OpenAIListModelsResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Completions
  // ==========================================================================

  /// Generate text completion
  Future<OpenAICompletionResponse> completion({
    required String prompt,
    int? maxTokens,
    double? temperature,
    String? model,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/openai/completion',
      data: {
        'prompt': prompt,
        if (maxTokens != null) 'maxTokens': maxTokens,
        if (temperature != null) 'temperature': temperature,
        if (model != null) 'model': model,
      },
    );

    final data = _extractData(response.data);
    return OpenAICompletionResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Chat
  // ==========================================================================

  /// Generate chat completion
  Future<OpenAIChatResponse> chat({
    required List<OpenAIChatMessage> messages,
    String? model,
    int? maxTokens,
    double? temperature,
  }) async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.post(
      '/workspaces/$workspaceId/openai/chat',
      data: {
        'messages': messages.map((m) => m.toJson()).toList(),
        if (model != null) 'model': model,
        if (maxTokens != null) 'maxTokens': maxTokens,
        if (temperature != null) 'temperature': temperature,
      },
    );

    final data = _extractData(response.data);
    return OpenAIChatResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Usage
  // ==========================================================================

  /// Get usage statistics
  Future<OpenAIUsageResponse> getUsage() async {
    final workspaceId = await AppConfig.getCurrentWorkspaceId();
    if (workspaceId == null) {
      throw Exception('No workspace selected');
    }

    final response = await _apiClient.get(
      '/workspaces/$workspaceId/openai/usage',
    );

    final data = _extractData(response.data);
    return OpenAIUsageResponse.fromJson(data as Map<String, dynamic>);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  dynamic _extractData(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      if (responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }
    return responseData;
  }
}
