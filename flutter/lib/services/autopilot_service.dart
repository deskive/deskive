import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../api/base_api_client.dart';
import '../config/api_config.dart';
import '../models/smart_suggestion.dart';

/// Stream event types from SSE
enum StreamEventType {
  status,
  action,
  text,
  textDelta,
  complete,
  error,
}

/// Stream event from AutoPilot SSE
class AutoPilotStreamEvent {
  final StreamEventType type;
  final Map<String, dynamic> data;

  AutoPilotStreamEvent({
    required this.type,
    required this.data,
  });

  factory AutoPilotStreamEvent.fromJson(Map<String, dynamic> json) {
    final typeStr = json['type'] as String? ?? 'text';
    StreamEventType type;
    switch (typeStr) {
      case 'status':
        type = StreamEventType.status;
        break;
      case 'action':
        type = StreamEventType.action;
        break;
      case 'text':
        type = StreamEventType.text;
        break;
      case 'text_delta':
        type = StreamEventType.textDelta;
        break;
      case 'complete':
        type = StreamEventType.complete;
        break;
      case 'error':
        type = StreamEventType.error;
        break;
      default:
        type = StreamEventType.text;
    }
    return AutoPilotStreamEvent(
      type: type,
      data: json['data'] as Map<String, dynamic>? ?? {},
    );
  }

  // Getters for common data fields
  String get statusMessage => data['message'] as String? ?? '';
  String get statusType => data['status'] as String? ?? '';
  String get toolName => data['tool'] as String? ?? '';
  bool get actionSuccess => data['success'] as bool? ?? false;
  String get textContent => data['content'] as String? ?? '';
  String get errorMessage => data['message'] as String? ?? 'Unknown error';
}

/// Referenced item that can be attached to messages
class ReferencedItem {
  final String id;
  final String type; // 'note' | 'task' | 'event' | 'project' | 'file'
  final String title;
  final String? description;

  ReferencedItem({
    required this.id,
    required this.type,
    required this.title,
    this.description,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'title': title,
    if (description != null) 'description': description,
  };

  factory ReferencedItem.fromJson(Map<String, dynamic> json) {
    return ReferencedItem(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
    );
  }
}

/// Attached file for AutoPilot messages
class AttachedFile {
  final String name;
  final String path;
  final String mimeType;
  final int size;
  final String? base64Content; // For images

  AttachedFile({
    required this.name,
    required this.path,
    required this.mimeType,
    required this.size,
    this.base64Content,
  });

  bool get isImage => mimeType.startsWith('image/');
  bool get isPdf => mimeType == 'application/pdf';
  bool get isText => mimeType.startsWith('text/') ||
                     mimeType == 'application/json' ||
                     mimeType == 'application/xml';
}

/// Session info for history
class AutoPilotSession {
  final String id;
  final String sessionId;
  final String title;
  final int messageCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  AutoPilotSession({
    required this.id,
    required this.sessionId,
    required this.title,
    required this.messageCount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AutoPilotSession.fromJson(Map<String, dynamic> json) {
    return AutoPilotSession(
      id: json['id'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? '',
      title: json['title'] as String? ?? 'New conversation',
      messageCount: json['messageCount'] as int? ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }
}

/// Represents an action executed by AutoPilot
class ExecutedAction {
  final String tool;
  final Map<String, dynamic> input;
  final dynamic output;
  final bool success;
  final String? error;

  ExecutedAction({
    required this.tool,
    required this.input,
    this.output,
    required this.success,
    this.error,
  });

  factory ExecutedAction.fromJson(Map<String, dynamic> json) {
    return ExecutedAction(
      tool: json['tool'] ?? '',
      input: json['input'] as Map<String, dynamic>? ?? {},
      output: json['output'],
      success: json['success'] ?? false,
      error: json['error'] as String?,
    );
  }
}

/// Response from AutoPilot command execution
class AutoPilotResponse {
  final bool success;
  final String sessionId;
  final String message;
  final List<ExecutedAction> actions;
  final List<String> suggestions;
  final String? reasoning;
  final String? error;

  AutoPilotResponse({
    required this.success,
    required this.sessionId,
    required this.message,
    this.actions = const [],
    this.suggestions = const [],
    this.reasoning,
    this.error,
  });

  factory AutoPilotResponse.fromJson(Map<String, dynamic> json) {
    // Handle error field that might be String, List, or Map
    String? errorMsg;
    final errorField = json['error'];
    if (errorField is String) {
      errorMsg = errorField;
    } else if (errorField is List) {
      errorMsg = errorField.map((e) => e.toString()).join(', ');
    } else if (errorField is Map) {
      errorMsg = errorField['message']?.toString() ?? errorField.toString();
    }

    // Handle reasoning field that might be String or other type
    String? reasoningMsg;
    final reasoningField = json['reasoning'];
    if (reasoningField is String) {
      reasoningMsg = reasoningField;
    } else if (reasoningField != null) {
      reasoningMsg = reasoningField.toString();
    }

    return AutoPilotResponse(
      success: json['success'] ?? false,
      sessionId: json['sessionId']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      actions: (json['actions'] as List?)
              ?.map((a) => ExecutedAction.fromJson(a as Map<String, dynamic>))
              .toList() ??
          [],
      suggestions: (json['suggestions'] as List?)
              ?.map((s) => s.toString())
              .toList() ??
          [],
      reasoning: reasoningMsg,
      error: errorMsg,
    );
  }
}

/// Conversation message in AutoPilot session
class ConversationMessage {
  final String role;
  final String content;
  final DateTime timestamp;
  final List<ExecutedAction>? actions;

  ConversationMessage({
    required this.role,
    required this.content,
    required this.timestamp,
    this.actions,
  });

  factory ConversationMessage.fromJson(Map<String, dynamic> json) {
    return ConversationMessage(
      role: json['role'] ?? 'user',
      content: json['content'] ?? '',
      timestamp: DateTime.tryParse(json['timestamp'] ?? '') ?? DateTime.now(),
      actions: (json['actions'] as List?)
          ?.map((a) => ExecutedAction.fromJson(a as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';
}

/// Scheduled action from AutoPilot (one-time future actions)
class ScheduledAction {
  final String id;
  final String workspaceId;
  final String userId;
  final String actionType;
  final Map<String, dynamic> actionConfig;
  final DateTime scheduledAt;
  final String status;
  final DateTime? executedAt;
  final dynamic result;
  final String? description;
  final int retryCount;
  final int maxRetries;
  final DateTime createdAt;
  final DateTime updatedAt;

  ScheduledAction({
    required this.id,
    required this.workspaceId,
    required this.userId,
    required this.actionType,
    required this.actionConfig,
    required this.scheduledAt,
    required this.status,
    this.executedAt,
    this.result,
    this.description,
    required this.retryCount,
    required this.maxRetries,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ScheduledAction.fromJson(Map<String, dynamic> json) {
    return ScheduledAction(
      id: json['id'] as String? ?? '',
      workspaceId: json['workspaceId'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      actionType: json['actionType'] as String? ?? '',
      actionConfig: json['actionConfig'] as Map<String, dynamic>? ?? {},
      scheduledAt: DateTime.tryParse(json['scheduledAt'] ?? '') ?? DateTime.now(),
      status: json['status'] as String? ?? 'pending',
      executedAt: json['executedAt'] != null
          ? DateTime.tryParse(json['executedAt'])
          : null,
      result: json['result'],
      description: json['description'] as String?,
      retryCount: json['retryCount'] as int? ?? 0,
      maxRetries: json['maxRetries'] as int? ?? 3,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }

  bool get isPending => status == 'pending';
  bool get isExecuting => status == 'executing';
  bool get isCompleted => status == 'completed';
  bool get isFailed => status == 'failed';
  bool get isCancelled => status == 'cancelled';
}

/// AutoPilot capability description
class AutoPilotCapability {
  final String name;
  final String description;
  final String category;
  final List<String> examples;

  AutoPilotCapability({
    required this.name,
    required this.description,
    required this.category,
    this.examples = const [],
  });

  factory AutoPilotCapability.fromJson(Map<String, dynamic> json) {
    return AutoPilotCapability(
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      examples: (json['examples'] as List?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }
}

/// AutoPilot Service - Global AI Assistant for Deskive
///
/// This service provides a natural language interface to automate tasks
/// across the entire Deskive platform including:
/// - Calendar management (create, update, list events)
/// - Task management (create, update, assign tasks)
/// - Chat messaging (send messages, search conversations)
/// - File management (search, list files)
/// - Workspace queries (list members, projects)
class AutoPilotService {
  static final AutoPilotService _instance = AutoPilotService._internal();
  factory AutoPilotService() => _instance;
  AutoPilotService._internal();

  late BaseApiClient _apiClient;
  bool _isInitialized = false;

  String? _currentSessionId;
  final List<ConversationMessage> _conversationHistory = [];
  final StreamController<List<ConversationMessage>> _historyController =
      StreamController<List<ConversationMessage>>.broadcast();

  /// Stream of conversation history updates
  Stream<List<ConversationMessage>> get historyStream => _historyController.stream;

  /// Current conversation history
  List<ConversationMessage> get conversationHistory => List.unmodifiable(_conversationHistory);

  /// Current session ID
  String? get currentSessionId => _currentSessionId;

  /// Initialize the service
  Future<void> initialize() async {
    if (!_isInitialized) {
      _apiClient = BaseApiClient.instance;
      _isInitialized = true;
    }
  }

  /// Create a new AutoPilot session
  Future<String> createSession(String workspaceId) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/sessions/new',
        data: {
          'workspaceId': workspaceId,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _currentSessionId = response.data['sessionId'];
        _conversationHistory.clear();
        _historyController.add(_conversationHistory);
        return _currentSessionId!;
      } else {
        throw Exception('Failed to create session: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to create AutoPilot session: $e');
    }
  }

  /// Resume an existing session or create a new one
  /// This ensures the user continues their previous conversation
  Future<({String sessionId, bool isNew})> resumeOrCreateSession(String workspaceId) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/sessions/resume',
        data: {
          'workspaceId': workspaceId,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        _currentSessionId = response.data['sessionId'];
        final isNew = response.data['isNew'] as bool? ?? true;

        // If resuming existing session, load history
        if (!isNew && _currentSessionId != null) {
          await _loadSessionHistory(_currentSessionId!);
        } else {
          _conversationHistory.clear();
          _historyController.add(_conversationHistory);
        }

        return (sessionId: _currentSessionId!, isNew: isNew);
      } else {
        throw Exception('Failed to resume/create session: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to resume/create AutoPilot session: $e');
    }
  }

  /// Load session history from the server
  Future<void> _loadSessionHistory(String sessionId) async {
    try {
      final history = await getHistory(sessionId: sessionId);
      _conversationHistory.clear();
      _conversationHistory.addAll(history);
      _historyController.add(_conversationHistory);
    } catch (e) {
      // If loading history fails, start fresh
      _conversationHistory.clear();
      _historyController.add(_conversationHistory);
    }
  }

  /// Execute a natural language command
  Future<AutoPilotResponse> executeCommand({
    required String command,
    required String workspaceId,
    String? sessionId,
    bool executeActions = true,
    Map<String, dynamic>? context,
    List<AttachedFile>? attachments,
    List<ReferencedItem>? references,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    final effectiveSessionId = sessionId ?? _currentSessionId;

    try {
      // Add user message to local history
      final userMessage = ConversationMessage(
        role: 'user',
        content: command,
        timestamp: DateTime.now(),
      );
      _conversationHistory.add(userMessage);
      _historyController.add(_conversationHistory);

      // Build context with attachments and references
      final Map<String, dynamic> fullContext = context != null
          ? Map<String, dynamic>.from(context)
          : <String, dynamic>{};

      // Add attachments to context
      if (attachments != null && attachments.isNotEmpty) {
        fullContext['attachments'] = attachments.map((file) => {
          'name': file.name,
          'mimeType': file.mimeType,
          'size': file.size,
          if (file.base64Content != null) 'content': file.base64Content,
        }).toList();
      }

      // Add references to context
      if (references != null && references.isNotEmpty) {
        fullContext['references'] = references.map((ref) => ref.toJson()).toList();
      }

      // Use longer timeout for AI operations (2 minutes)
      final response = await _apiClient.post(
        '/autopilot/execute',
        data: {
          'command': command,
          'workspaceId': workspaceId,
          if (effectiveSessionId != null) 'sessionId': effectiveSessionId,
          'executeActions': executeActions,
          if (fullContext.isNotEmpty) 'context': fullContext,
        },
        options: Options(
          receiveTimeout: const Duration(seconds: 120),
          sendTimeout: const Duration(seconds: 30),
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = AutoPilotResponse.fromJson(response.data);

        // Update session ID if returned
        if (result.sessionId.isNotEmpty) {
          _currentSessionId = result.sessionId;
        }

        // Add assistant response to local history
        final assistantMessage = ConversationMessage(
          role: 'assistant',
          content: result.message,
          timestamp: DateTime.now(),
          actions: result.actions,
        );
        _conversationHistory.add(assistantMessage);
        _historyController.add(_conversationHistory);

        return result;
      } else {
        throw Exception('Failed to execute command: ${response.statusCode}');
      }
    } catch (e) {
      // Add error message to history
      final errorMessage = ConversationMessage(
        role: 'assistant',
        content: 'Sorry, I encountered an error: ${e.toString()}',
        timestamp: DateTime.now(),
      );
      _conversationHistory.add(errorMessage);
      _historyController.add(_conversationHistory);

      return AutoPilotResponse(
        success: false,
        sessionId: effectiveSessionId ?? '',
        message: 'Sorry, I encountered an error while processing your request.',
        error: e.toString(),
      );
    }
  }

  /// Preview what actions would be taken without executing them
  Future<AutoPilotResponse> previewCommand({
    required String command,
    required String workspaceId,
    String? sessionId,
    Map<String, dynamic>? context,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/preview',
        data: {
          'command': command,
          'workspaceId': workspaceId,
          if (sessionId != null) 'sessionId': sessionId,
          if (context != null) 'context': context,
        },
      );

      if (response.statusCode == 200) {
        return AutoPilotResponse.fromJson(response.data);
      } else {
        throw Exception('Failed to preview command: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to preview AutoPilot command: $e');
    }
  }

  /// Get conversation history for a session
  Future<List<ConversationMessage>> getHistory({
    String? sessionId,
    int? limit,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    final effectiveSessionId = sessionId ?? _currentSessionId;
    if (effectiveSessionId == null) {
      return [];
    }

    try {
      final queryParams = <String, dynamic>{};
      if (limit != null) queryParams['limit'] = limit.toString();

      final response = await _apiClient.get(
        '/autopilot/history/$effectiveSessionId',
        queryParameters: queryParams,
        options: Options(
          receiveTimeout: const Duration(seconds: 60),
        ),
      );

      if (response.statusCode == 200) {
        final messages = (response.data as List?)
                ?.map((m) => ConversationMessage.fromJson(m as Map<String, dynamic>))
                .toList() ??
            [];

        // Update local history
        _conversationHistory.clear();
        _conversationHistory.addAll(messages);
        _historyController.add(_conversationHistory);

        return messages;
      } else {
        throw Exception('Failed to get history: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get AutoPilot history: $e');
    }
  }

  /// Get all AutoPilot capabilities
  Future<List<AutoPilotCapability>> getCapabilities() async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.get('/autopilot/capabilities');

      if (response.statusCode == 200) {
        return (response.data as List?)
                ?.map((c) => AutoPilotCapability.fromJson(c as Map<String, dynamic>))
                .toList() ??
            [];
      } else {
        throw Exception('Failed to get capabilities: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to get AutoPilot capabilities: $e');
    }
  }

  /// Get smart contextual suggestions
  /// Returns suggestions based on user's current data (overdue tasks, upcoming events, etc.)
  Future<SmartSuggestionsResponse> getSmartSuggestions({
    required String workspaceId,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.get(
        '/autopilot/suggestions',
        queryParameters: {
          'workspaceId': workspaceId,
        },
      );

      if (response.statusCode == 200) {
        return SmartSuggestionsResponse.fromJson(response.data as Map<String, dynamic>);
      } else {
        throw Exception('Failed to get smart suggestions: ${response.statusCode}');
      }
    } catch (e) {
      // Return empty suggestions on error
      return SmartSuggestionsResponse(
        suggestions: [],
        generatedAt: DateTime.now().toIso8601String(),
      );
    }
  }

  /// Clear session memory
  Future<bool> clearSession({String? sessionId}) async {
    if (!_isInitialized) {
      await initialize();
    }

    final effectiveSessionId = sessionId ?? _currentSessionId;
    if (effectiveSessionId == null) {
      return false;
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/sessions/$effectiveSessionId/clear',
        data: {},
      );

      if (response.statusCode == 200) {
        _conversationHistory.clear();
        _historyController.add(_conversationHistory);
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  /// Provide feedback on an action
  Future<bool> provideFeedback({
    required String sessionId,
    required String actionId,
    required bool helpful,
    String? feedback,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/feedback',
        data: {
          'sessionId': sessionId,
          'actionId': actionId,
          'helpful': helpful,
          if (feedback != null) 'feedback': feedback,
        },
      );

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Clear local conversation history
  void clearLocalHistory() {
    _conversationHistory.clear();
    _historyController.add(_conversationHistory);
  }

  /// Notify listeners of history update (useful when reattaching to stream)
  void notifyHistoryUpdate() {
    _historyController.add(List.unmodifiable(_conversationHistory));
  }

  /// End the current session
  void endSession() {
    _currentSessionId = null;
    _conversationHistory.clear();
    _historyController.add(_conversationHistory);
  }

  /// Dispose resources
  void dispose() {
    _historyController.close();
  }

  /// Execute a command with SSE streaming
  /// Returns a stream of events for real-time updates
  Stream<AutoPilotStreamEvent> executeCommandStream({
    required String command,
    required String workspaceId,
    String? sessionId,
    bool executeActions = true,
    Map<String, dynamic>? context,
    List<ReferencedItem>? referencedItems,
    List<AttachedFile>? attachedFiles,
  }) async* {
    if (!_isInitialized) {
      await initialize();
    }

    final effectiveSessionId = sessionId ?? _currentSessionId;

    // Add user message to local history
    final userMessage = ConversationMessage(
      role: 'user',
      content: command,
      timestamp: DateTime.now(),
    );
    _conversationHistory.add(userMessage);
    _historyController.add(_conversationHistory);

    try {
      final baseUrl = ApiConfig.baseUrl;
      final token = await _apiClient.getAuthToken();

      // Build request body
      final body = {
        'command': command,
        'workspaceId': workspaceId,
        if (effectiveSessionId != null) 'sessionId': effectiveSessionId,
        'executeActions': executeActions,
        'context': {
          'currentView': 'modal',
          ...?context,
          if (referencedItems != null && referencedItems.isNotEmpty)
            'referencedItems': referencedItems.map((r) => r.toJson()).toList(),
          if (attachedFiles != null)
            'attachedImages': attachedFiles
                .where((f) => f.isImage && f.base64Content != null)
                .map((f) => {
                  'name': f.name,
                  'base64': f.base64Content,
                  'mimeType': f.mimeType,
                })
                .toList(),
        },
      };

      // Use Dio for SSE streaming with longer timeout for AI operations
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(minutes: 5), // 5 minutes for streaming
        sendTimeout: const Duration(seconds: 30),
      ));
      final response = await dio.post<ResponseBody>(
        '$baseUrl/autopilot/execute/stream',
        data: body,
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            if (token != null) 'Authorization': 'Bearer $token',
          },
          responseType: ResponseType.stream,
        ),
      );

      // Accept both 200 and 201 as success codes
      if (response.statusCode != 200 && response.statusCode != 201) {
        yield AutoPilotStreamEvent(
          type: StreamEventType.error,
          data: {'message': 'Failed to connect: ${response.statusCode}'},
        );
        dio.close();
        return;
      }

      String buffer = '';
      String assistantContent = '';
      List<ExecutedAction> actions = [];

      final stream = response.data?.stream;
      if (stream == null) {
        yield AutoPilotStreamEvent(
          type: StreamEventType.error,
          data: {'message': 'No response stream available'},
        );
        dio.close();
        return;
      }

      await for (final List<int> chunk in stream) {
        final decoded = utf8.decode(chunk);
        buffer += decoded;

        // Process complete SSE messages
        while (buffer.contains('\n\n')) {
          final index = buffer.indexOf('\n\n');
          final message = buffer.substring(0, index);
          buffer = buffer.substring(index + 2);

          if (message.startsWith('data: ')) {
            final data = message.substring(6).trim();

            if (data == '[DONE]') {
              // Stream complete
              break;
            }

            try {
              final json = jsonDecode(data) as Map<String, dynamic>;
              final event = AutoPilotStreamEvent.fromJson(json);

              // Handle different event types
              switch (event.type) {
                case StreamEventType.text:
                  assistantContent = event.textContent;
                  break;
                case StreamEventType.textDelta:
                  assistantContent += event.textContent;
                  break;
                case StreamEventType.action:
                  actions.add(ExecutedAction(
                    tool: event.toolName,
                    input: {},
                    success: event.actionSuccess,
                  ));
                  break;
                case StreamEventType.complete:
                  // Update session ID if returned
                  final newSessionId = json['data']?['sessionId'] as String?;
                  if (newSessionId != null && newSessionId.isNotEmpty) {
                    _currentSessionId = newSessionId;
                  }
                  break;
                default:
                  break;
              }

              yield event;
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

      // Add assistant response to local history
      if (assistantContent.isNotEmpty) {
        final assistantMessage = ConversationMessage(
          role: 'assistant',
          content: assistantContent,
          timestamp: DateTime.now(),
          actions: actions.isNotEmpty ? actions : null,
        );
        _conversationHistory.add(assistantMessage);
        _historyController.add(_conversationHistory);
      }

      dio.close();
    } catch (e) {
      yield AutoPilotStreamEvent(
        type: StreamEventType.error,
        data: {'message': 'Stream error: ${e.toString()}'},
      );

      // Add error message to history
      final errorMessage = ConversationMessage(
        role: 'assistant',
        content: 'Sorry, I encountered an error: ${e.toString()}',
        timestamp: DateTime.now(),
      );
      _conversationHistory.add(errorMessage);
      _historyController.add(_conversationHistory);
    }
  }

  /// List all sessions for the current user in a workspace
  Future<List<AutoPilotSession>> listSessions({
    required String workspaceId,
    int limit = 20,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.get(
        '/autopilot/sessions',
        queryParameters: {
          'workspaceId': workspaceId,
          'limit': limit.toString(),
        },
      );

      if (response.statusCode == 200) {
        return (response.data as List?)
                ?.map((s) => AutoPilotSession.fromJson(s as Map<String, dynamic>))
                .toList() ??
            [];
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Delete a session
  Future<bool> deleteSession(String sessionId) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/sessions/$sessionId/delete',
        data: {},
      );

      if (response.statusCode == 200) {
        // If deleting current session, clear local history
        if (sessionId == _currentSessionId) {
          _currentSessionId = null;
          _conversationHistory.clear();
          _historyController.add(_conversationHistory);
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Switch to a different session
  Future<bool> switchSession(String sessionId) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      _currentSessionId = sessionId;
      await _loadSessionHistory(sessionId);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Extract text from a PDF file
  Future<({String text, int numPages})?> extractPdfText(File file) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path),
      });

      final response = await _apiClient.post(
        '/autopilot/extract-pdf',
        data: formData,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return (
          text: data['text'] as String? ?? '',
          numPages: data['numPages'] as int? ?? 0,
        );
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Get pending scheduled actions for a workspace
  Future<List<ScheduledAction>> getScheduledActions({
    required String workspaceId,
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      debugPrint('[AutoPilotService] Fetching scheduled actions for workspace: $workspaceId');

      final response = await _apiClient.get(
        '/autopilot/scheduled-actions',
        queryParameters: {
          'workspaceId': workspaceId,
        },
      );

      debugPrint('[AutoPilotService] Response status: ${response.statusCode}');
      debugPrint('[AutoPilotService] Response data type: ${response.data?.runtimeType}');

      if (response.statusCode == 200) {
        final responseData = response.data;

        // Handle both wrapped {data: [...]} and raw [...] responses
        List<dynamic>? dataList;
        if (responseData is List) {
          dataList = responseData;
          debugPrint('[AutoPilotService] Response is a direct List with ${dataList.length} items');
        } else if (responseData is Map) {
          debugPrint('[AutoPilotService] Response is a Map with keys: ${responseData.keys.toList()}');
          if (responseData['data'] is List) {
            dataList = responseData['data'] as List;
            debugPrint('[AutoPilotService] Extracted ${dataList.length} items from data key');
          } else if (responseData.containsKey('data')) {
            final innerData = responseData['data'];
            debugPrint('[AutoPilotService] data key exists but is type: ${innerData?.runtimeType}');
            if (innerData is List) {
              dataList = innerData;
            }
          }
        }

        if (dataList != null && dataList.isNotEmpty) {
          final actions = dataList
              .where((item) => item != null && item is Map<String, dynamic>)
              .map((item) => ScheduledAction.fromJson(item as Map<String, dynamic>))
              .toList();
          debugPrint('[AutoPilotService] Parsed ${actions.length} scheduled actions');
          return actions;
        }

        debugPrint('[AutoPilotService] No scheduled actions found');
      }
      return [];
    } catch (e) {
      debugPrint('[AutoPilotService] Error fetching scheduled actions: $e');
      return [];
    }
  }

  /// Cancel a scheduled action
  Future<bool> cancelScheduledAction(String actionId) async {
    if (!_isInitialized) {
      await initialize();
    }

    try {
      final response = await _apiClient.post(
        '/autopilot/scheduled-actions/$actionId/cancel',
        data: {},
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['success'] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
