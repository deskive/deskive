// Models for OpenAI integration

/// OpenAI connection status
class OpenAIConnection {
  final String id;
  final String workspaceId;
  final String userId;
  final String? apiKeyMasked;
  final String? model;
  final bool isActive;
  final DateTime createdAt;

  OpenAIConnection({
    required this.id,
    required this.workspaceId,
    required this.userId,
    this.apiKeyMasked,
    this.model,
    required this.isActive,
    required this.createdAt,
  });

  factory OpenAIConnection.fromJson(Map<String, dynamic> json) {
    return OpenAIConnection(
      id: json['id'] as String,
      workspaceId: json['workspaceId'] as String,
      userId: json['userId'] as String,
      apiKeyMasked: json['apiKeyMasked'] as String?,
      model: json['model'] as String?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'workspaceId': workspaceId,
      'userId': userId,
      'apiKeyMasked': apiKeyMasked,
      'model': model,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// OpenAI completion request
class OpenAICompletionRequest {
  final String prompt;
  final int? maxTokens;
  final double? temperature;

  OpenAICompletionRequest({
    required this.prompt,
    this.maxTokens,
    this.temperature,
  });

  Map<String, dynamic> toJson() {
    return {
      'prompt': prompt,
      if (maxTokens != null) 'maxTokens': maxTokens,
      if (temperature != null) 'temperature': temperature,
    };
  }
}

/// OpenAI completion response
class OpenAICompletionResponse {
  final String text;
  final String? finishReason;
  final OpenAIUsageResponse? usage;

  OpenAICompletionResponse({
    required this.text,
    this.finishReason,
    this.usage,
  });

  factory OpenAICompletionResponse.fromJson(Map<String, dynamic> json) {
    return OpenAICompletionResponse(
      text: json['text'] as String? ?? '',
      finishReason: json['finishReason'] as String?,
      usage: json['usage'] != null
          ? OpenAIUsageResponse.fromJson(json['usage'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'text': text,
      'finishReason': finishReason,
      'usage': usage?.toJson(),
    };
  }
}

/// OpenAI chat message
class OpenAIChatMessage {
  final String role;
  final String content;

  OpenAIChatMessage({
    required this.role,
    required this.content,
  });

  factory OpenAIChatMessage.fromJson(Map<String, dynamic> json) {
    return OpenAIChatMessage(
      role: json['role'] as String,
      content: json['content'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'role': role,
      'content': content,
    };
  }
}

/// OpenAI chat request
class OpenAIChatRequest {
  final List<OpenAIChatMessage> messages;
  final String? model;
  final int? maxTokens;
  final double? temperature;

  OpenAIChatRequest({
    required this.messages,
    this.model,
    this.maxTokens,
    this.temperature,
  });

  Map<String, dynamic> toJson() {
    return {
      'messages': messages.map((m) => m.toJson()).toList(),
      if (model != null) 'model': model,
      if (maxTokens != null) 'maxTokens': maxTokens,
      if (temperature != null) 'temperature': temperature,
    };
  }
}

/// OpenAI chat response
class OpenAIChatResponse {
  final OpenAIChatMessage message;
  final OpenAIUsageResponse? usage;
  final String? finishReason;

  OpenAIChatResponse({
    required this.message,
    this.usage,
    this.finishReason,
  });

  factory OpenAIChatResponse.fromJson(Map<String, dynamic> json) {
    return OpenAIChatResponse(
      message:
          OpenAIChatMessage.fromJson(json['message'] as Map<String, dynamic>),
      usage: json['usage'] != null
          ? OpenAIUsageResponse.fromJson(json['usage'] as Map<String, dynamic>)
          : null,
      finishReason: json['finishReason'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'message': message.toJson(),
      'usage': usage?.toJson(),
      'finishReason': finishReason,
    };
  }
}

/// OpenAI model information
class OpenAIModel {
  final String id;
  final String? name;
  final String? description;
  final int? maxTokens;

  OpenAIModel({
    required this.id,
    this.name,
    this.description,
    this.maxTokens,
  });

  factory OpenAIModel.fromJson(Map<String, dynamic> json) {
    return OpenAIModel(
      id: json['id'] as String,
      name: json['name'] as String?,
      description: json['description'] as String?,
      maxTokens: json['maxTokens'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'maxTokens': maxTokens,
    };
  }

  String get displayName => name ?? id;
}

/// OpenAI usage response
class OpenAIUsageResponse {
  final int totalTokens;
  final int promptTokens;
  final int completionTokens;

  OpenAIUsageResponse({
    required this.totalTokens,
    required this.promptTokens,
    required this.completionTokens,
  });

  factory OpenAIUsageResponse.fromJson(Map<String, dynamic> json) {
    return OpenAIUsageResponse(
      totalTokens: json['totalTokens'] as int? ?? 0,
      promptTokens: json['promptTokens'] as int? ?? 0,
      completionTokens: json['completionTokens'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalTokens': totalTokens,
      'promptTokens': promptTokens,
      'completionTokens': completionTokens,
    };
  }
}

/// OpenAI list models response
class OpenAIListModelsResponse {
  final List<OpenAIModel> models;

  OpenAIListModelsResponse({
    required this.models,
  });

  factory OpenAIListModelsResponse.fromJson(Map<String, dynamic> json) {
    return OpenAIListModelsResponse(
      models: (json['models'] as List<dynamic>?)
              ?.map((e) => OpenAIModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

/// OpenAI test connection response
class OpenAITestConnectionResponse {
  final bool success;
  final String? message;
  final String? error;

  OpenAITestConnectionResponse({
    required this.success,
    this.message,
    this.error,
  });

  factory OpenAITestConnectionResponse.fromJson(Map<String, dynamic> json) {
    return OpenAITestConnectionResponse(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String?,
      error: json['error'] as String?,
    );
  }
}
