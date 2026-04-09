import 'dart:convert';
import '../api/base_api_client.dart';
import 'auth_service.dart';
import '../models/ai/ai_image_request.dart';
import '../models/ai/ai_image_response.dart';

/// Response from the unified AI Assistant
class AIAssistantResponse {
  final bool success;
  final String agentUsed;
  final String action;
  final String message;
  final Map<String, dynamic>? data;
  final String? error;
  final double? routingConfidence;

  AIAssistantResponse({
    required this.success,
    required this.agentUsed,
    required this.action,
    required this.message,
    this.data,
    this.error,
    this.routingConfidence,
  });

  factory AIAssistantResponse.fromJson(Map<String, dynamic> json) {
    return AIAssistantResponse(
      success: json['success'] ?? false,
      agentUsed: json['agentUsed'] ?? json['agent_used'] ?? 'unknown',
      action: json['action'] ?? '',
      message: json['message'] ?? '',
      data: json['data'] as Map<String, dynamic>?,
      error: json['error'] as String?,
      routingConfidence: (json['routingConfidence'] ?? json['routing_confidence'])?.toDouble(),
    );
  }
}

class AIService {
  static final AIService _instance = AIService._internal();
  factory AIService() => _instance;
  AIService._internal();

  late BaseApiClient _apiClient;
  bool _isInitialized = false;

  Future<void> initialize() async {
    if (!_isInitialized) {
      _apiClient = BaseApiClient.instance;
      _isInitialized = true;
    }
  }

  Future<String> sendMessage(String message, List<String> conversationHistory) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final messages = [
        {'role': 'system', 'content': 'You are a helpful AI assistant for the Deskive workspace management platform.'},
        ...conversationHistory.map((msg) => {'role': 'user', 'content': msg}),
        {'role': 'user', 'content': message},
      ];

      final response = await _apiClient.post(
        '/ai/chat',
        data: {
          'messages': messages,
          'max_tokens': 150,
          'temperature': 0.7,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['response'] ?? data['message'] ?? 'Sorry, I encountered an error. Please try again.';
      } else {
        return 'Sorry, I encountered an error. Please try again.';
      }
    } catch (e) {
      throw Exception('AI service error: $e');
    }
  }

  /// Generate project description based on project title
  Future<String> generateProjectDescription(String projectTitle, {String? projectType}) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final prompt = projectType != null
          ? 'Generate a professional project description for a project titled "$projectTitle" of type "$projectType". Include key objectives, scope, and expected outcomes. Keep it concise and under 200 words.'
          : 'Generate a professional project description for a project titled "$projectTitle". Include key objectives, scope, and expected outcomes. Keep it concise and under 200 words.';


      final response = await _apiClient.post(
        '/ai/generate-text',
        data: {
          'prompt': prompt,
          'text_type': 'general',  // Required field - must be one of the valid types
          'tone': 'professional',
          'word_count': 200,
          'max_tokens': 300,
        },
      );


      if (response.statusCode == 200) {
        final data = response.data;
        // Handle different possible response formats
        final generatedText = data['content'] ?? data['generated_text'] ?? data['result'] ?? data['text'] ?? data['description'] ?? '';


        if (generatedText.isEmpty) {
          throw Exception('Empty response from AI API');
        }

        return generatedText;
      } else {
        throw Exception('Failed to generate description: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to generate AI description: $e');
    }
  }

  /// Generate AI image from text prompt
  Future<AIImageResponse> generateImage(AIImageRequest request) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }


      final response = await _apiClient.post(
        '/ai/generate-image',
        data: request.toJson(),
      );


      if (response.statusCode == 200) {
        return AIImageResponse.fromJson(response.data);
      } else {
        throw Exception('Failed to generate image: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to generate AI image: $e');
    }
  }

  /// Generate AI image with retry logic for queued responses
  /// This polls the backend until the image is ready (no timeout limit)
  Future<AIImageResponse> generateImageWithRetry(
    AIImageRequest request, {
    Duration delayBetweenAttempts = const Duration(seconds: 3),
    Function(int attempt)? onRetry,
  }) async {

    int attempt = 0;

    while (true) {
      attempt++;

      try {
        // Call onRetry callback BEFORE making the API call
        // This allows the UI to check for cancellation before attempting
        if (onRetry != null) {
          onRetry(attempt);
        }

        final response = await generateImage(request);

        // Check if we have actual image URLs
        if (response.imageUrls.isNotEmpty) {
          return response;
        }

        // If queued, wait and retry
        if (response.isQueued) {
          await Future.delayed(delayBetweenAttempts);
          continue;
        }
      } catch (e) {

        // Check if this is a cancellation or timeout exception
        final errorMessage = e.toString().toLowerCase();
        if (errorMessage.contains('cancelled') || errorMessage.contains('timed out')) {
          // Rethrow to stop the retry loop
          rethrow;
        }

        // For other errors, wait and retry
        await Future.delayed(delayBetweenAttempts);
        continue;
      }
    }
  }

  /// Summarize selected messages
  Future<String> summarizeMessages(String messagesContext) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final response = await _apiClient.post(
        '/ai/summarize',
        data: {
          'content': messagesContext,
          'summary_type': 'bullet_points',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['summary'] ?? data['content'] ?? data['result'] ?? '';
      } else {
        throw Exception('Failed to summarize messages: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to summarize messages: $e');
    }
  }

  /// Create a formatted note from selected messages
  Future<String> createNoteFromMessages(String messagesContext) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final prompt = 'Create a well-formatted note from these chat messages. Include key points, decisions, and action items if any. Format with headers and bullet points where appropriate:\n\n$messagesContext';

      final response = await _apiClient.post(
        '/ai/generate-text',
        data: {
          'prompt': prompt,
          'text_type': 'general',
          'tone': 'professional',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['content'] ?? data['generated_text'] ?? data['result'] ?? data['text'] ?? '';
      } else {
        throw Exception('Failed to create note: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to create note from messages: $e');
    }
  }

  /// Translate selected messages to a target language
  Future<String> translateMessages(String messagesContext, String targetLanguage) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final response = await _apiClient.post(
        '/ai/translate',
        data: {
          'text': messagesContext,
          'target_language': targetLanguage,
          'preserve_formatting': true,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['translated_text'] ?? data['translation'] ?? data['content'] ?? '';
      } else {
        throw Exception('Failed to translate messages: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to translate messages: $e');
    }
  }

  /// Extract tasks and action items from selected messages
  Future<String> extractTasksFromMessages(String messagesContext) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final prompt = 'Extract all action items, tasks, and to-dos from these chat messages. List them clearly with any mentioned deadlines or assignees. Format as a checklist:\n\n$messagesContext';

      final response = await _apiClient.post(
        '/ai/generate-text',
        data: {
          'prompt': prompt,
          'text_type': 'general',
          'tone': 'professional',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['content'] ?? data['generated_text'] ?? data['result'] ?? data['text'] ?? '';
      } else {
        throw Exception('Failed to extract tasks: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to extract tasks from messages: $e');
    }
  }

  /// Create an email draft from selected messages
  Future<String> createEmailFromMessages(String messagesContext) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final prompt = 'Draft a professional email summarizing the key points from these chat messages. Include relevant details and maintain a clear, concise tone:\n\n$messagesContext';

      final response = await _apiClient.post(
        '/ai/generate-text',
        data: {
          'prompt': prompt,
          'text_type': 'email',
          'tone': 'professional',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['content'] ?? data['generated_text'] ?? data['result'] ?? data['text'] ?? '';
      } else {
        throw Exception('Failed to create email: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to create email from messages: $e');
    }
  }

  /// Process messages with a custom AI prompt
  Future<String> customPrompt(String messagesContext, String userPrompt) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final prompt = '$userPrompt\n\nMessages:\n$messagesContext';

      final response = await _apiClient.post(
        '/ai/generate-text',
        data: {
          'prompt': prompt,
          'text_type': 'general',
          'tone': 'professional',
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        return data['content'] ?? data['generated_text'] ?? data['result'] ?? data['text'] ?? '';
      } else {
        throw Exception('Failed to process custom prompt: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to process custom prompt: $e');
    }
  }

  /// Unified AI Assistant - routes commands to the appropriate specialized agent
  /// Supports: projects, tasks, notes, calendar, files, chat
  Future<AIAssistantResponse> processAssistantCommand({
    required String prompt,
    required String workspaceId,
    String currentView = 'files',
    String? projectId,
  }) async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final response = await _apiClient.post(
        '/ai/assistant',
        data: {
          'prompt': prompt,
          'workspaceId': workspaceId,
          'currentView': currentView,
          if (projectId != null) 'projectId': projectId,
        },
      );

      if (response.statusCode == 200) {
        return AIAssistantResponse.fromJson(response.data);
      } else {
        return AIAssistantResponse(
          success: false,
          agentUsed: 'unknown',
          action: 'error',
          message: 'Failed to process command: ${response.statusCode}',
        );
      }
    } catch (e) {
      return AIAssistantResponse(
        success: false,
        agentUsed: 'unknown',
        action: 'error',
        message: 'Error: ${e.toString()}',
      );
    }
  }

  /// Mock method for sending messages (for testing or fallback)
  static Future<String> sendMessageMock(String message) async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 500));

    // Return a mock response based on the message
    if (message.toLowerCase().contains('hello') || message.toLowerCase().contains('hi')) {
      return 'Hello! I\'m your AI assistant. How can I help you today?';
    } else if (message.toLowerCase().contains('help')) {
      return 'I can assist you with various tasks such as:\n- Managing your workspace\n- Creating and organizing notes\n- Scheduling meetings\n- Answering questions about your projects\n\nWhat would you like help with?';
    } else if (message.toLowerCase().contains('thank')) {
      return 'You\'re welcome! Is there anything else I can help you with?';
    } else {
      return 'I understand you\'re asking about "$message". I\'m here to help! Could you provide more details so I can assist you better?';
    }
  }

}