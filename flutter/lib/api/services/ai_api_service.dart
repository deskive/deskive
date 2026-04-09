import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import '../base_api_client.dart';

/// AI Service Types
enum AIServiceType {
  translate,
  summarize,
  generateText,
  improveWriting,
  fixGrammar,
  expand,
  shorten,
}

/// Translation Request DTO
class TranslateTextDto {
  final String text;
  final String targetLanguage;
  final String? sourceLanguage;
  final bool preserveFormatting;

  TranslateTextDto({
    required this.text,
    required this.targetLanguage,
    this.sourceLanguage,
    this.preserveFormatting = true,
  });

  Map<String, dynamic> toJson() => {
    'text': text,
    'target_language': targetLanguage,
    if (sourceLanguage != null) 'source_language': sourceLanguage,
    'preserve_formatting': preserveFormatting,
  };
}

/// Summarize Content Request DTO
class SummarizeContentDto {
  final String content;
  final String summaryType;
  final String? contentType;
  final String? length;

  SummarizeContentDto({
    required this.content,
    this.summaryType = 'abstractive',
    this.contentType = 'general',
    this.length = 'medium',
  });

  Map<String, dynamic> toJson() => {
    'content': content,
    'summary_type': summaryType,
    if (contentType != null) 'content_type': contentType,
    if (length != null) 'length': length,
  };
}

/// Generate Text Request DTO
class GenerateTextDto {
  final String prompt;
  final String textType;
  final String? tone;
  final int? wordCount;
  final int? maxTokens;
  final String? additionalContext;

  GenerateTextDto({
    required this.prompt,
    this.textType = 'general',
    this.tone,
    this.wordCount,
    this.maxTokens,
    this.additionalContext,
  });

  Map<String, dynamic> toJson() => {
    'prompt': prompt,
    'text_type': textType,
    if (tone != null) 'tone': tone,
    if (wordCount != null) 'word_count': wordCount,
    if (maxTokens != null) 'max_tokens': maxTokens,
    if (additionalContext != null) 'additional_context': additionalContext,
  };
}

/// AI Response
class AIResponse<T> {
  final T data;
  final String? error;
  final bool success;

  AIResponse({
    required this.data,
    this.error,
    this.success = true,
  });

  factory AIResponse.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJsonT) {
    return AIResponse(
      data: fromJsonT(json),
      success: true,
    );
  }

  factory AIResponse.error(String error) {
    return AIResponse(
      data: {} as T,
      error: error,
      success: false,
    );
  }
}

/// Translation Response
class TranslationResult {
  final String translatedText;
  final String targetLanguage;
  final String? sourceLanguage;
  final double? confidence;

  TranslationResult({
    required this.translatedText,
    required this.targetLanguage,
    this.sourceLanguage,
    this.confidence,
  });

  factory TranslationResult.fromJson(Map<String, dynamic> json) {
    return TranslationResult(
      translatedText: json['translated_text'] ?? json['result'] ?? '',
      targetLanguage: json['target_language'] ?? '',
      sourceLanguage: json['source_language'],
      confidence: json['confidence']?.toDouble(),
    );
  }
}

/// Summary Response
class SummaryResult {
  final String summary;
  final String summaryType;
  final int originalWordCount;
  final int summaryWordCount;

  SummaryResult({
    required this.summary,
    required this.summaryType,
    required this.originalWordCount,
    required this.summaryWordCount,
  });

  factory SummaryResult.fromJson(Map<String, dynamic> json) {
    return SummaryResult(
      summary: json['summary'] ?? json['result'] ?? '',
      summaryType: json['summary_type'] ?? 'abstractive',
      originalWordCount: json['original_word_count'] ?? 0,
      summaryWordCount: json['summary_word_count'] ?? 0,
    );
  }
}

/// Text Generation Response
class TextGenerationResult {
  final String generatedText;
  final String textType;
  final int wordCount;

  TextGenerationResult({
    required this.generatedText,
    required this.textType,
    required this.wordCount,
  });

  factory TextGenerationResult.fromJson(Map<String, dynamic> json) {
    return TextGenerationResult(
      generatedText: json['content'] ?? json['generated_text'] ?? json['result'] ?? '',
      textType: json['text_type'] ?? 'general',
      wordCount: json['word_count'] ?? 0,
    );
  }
}

/// AI API Service
class AIApiService {
  final BaseApiClient _apiClient;

  // AI operations can take longer, so we use a 2-minute timeout
  static const Duration _aiTimeout = Duration(minutes: 2);

  AIApiService({BaseApiClient? apiClient})
      : _apiClient = apiClient ?? BaseApiClient.instance;

  /// Get options with extended timeout for AI requests
  Options _getAIOptions() {
    return Options(
      receiveTimeout: _aiTimeout,
      sendTimeout: _aiTimeout,
    );
  }

  /// Translate text to target language
  Future<AIResponse<TranslationResult>> translateText(TranslateTextDto dto) async {
    try {
      final response = await _apiClient.post(
        '/ai/translate',
        data: dto.toJson(),
        options: _getAIOptions(),
      );

      return AIResponse.fromJson(
        response.data,
        (json) => TranslationResult.fromJson(json),
      );
    } catch (e) {
      return AIResponse.error('Translation failed: ${e.toString()}');
    }
  }

  /// Summarize content
  Future<AIResponse<SummaryResult>> summarizeContent(SummarizeContentDto dto) async {
    try {
      final response = await _apiClient.post(
        '/ai/summarize',
        data: dto.toJson(),
        options: _getAIOptions(),
      );

      return AIResponse.fromJson(
        response.data,
        (json) => SummaryResult.fromJson(json),
      );
    } catch (e) {
      return AIResponse.error('Summarization failed: ${e.toString()}');
    }
  }

  /// Generate text based on prompt
  Future<AIResponse<TextGenerationResult>> generateText(GenerateTextDto dto) async {
    try {
      debugPrint('🤖 AI Service: Calling /ai/generate-text');
      debugPrint('🤖 AI Service: Request data: ${dto.toJson()}');

      final response = await _apiClient.post(
        '/ai/generate-text',
        data: dto.toJson(),
        options: _getAIOptions(),
      );

      debugPrint('🤖 AI Service: Response received');
      debugPrint('🤖 AI Service: Response data type: ${response.data.runtimeType}');
      debugPrint('🤖 AI Service: Response data: ${response.data}');

      // Handle both wrapped { data: {...} } and unwrapped responses
      final responseData = response.data is Map && response.data['data'] != null
          ? response.data['data']
          : response.data;

      debugPrint('🤖 AI Service: Parsed response data: $responseData');

      final result = AIResponse.fromJson(
        responseData is Map<String, dynamic> ? responseData : <String, dynamic>{},
        (json) => TextGenerationResult.fromJson(json),
      );

      debugPrint('🤖 AI Service: Parsed result - generatedText length: ${result.data.generatedText.length}');

      return result;
    } catch (e, stackTrace) {
      debugPrint('🤖 AI Service: Error - $e');
      debugPrint('🤖 AI Service: Stack trace - $stackTrace');
      return AIResponse.error('Text generation failed: ${e.toString()}');
    }
  }

  /// Improve writing quality
  Future<AIResponse<TextGenerationResult>> improveWriting(String content) async {
    return generateText(GenerateTextDto(
      prompt: content,
      textType: 'general',
      tone: 'professional',
      additionalContext: 'Improve the writing quality, grammar, and clarity of this text while maintaining its core message.',
    ));
  }

  /// Fix grammar and spelling
  Future<AIResponse<TextGenerationResult>> fixGrammar(String content) async {
    return generateText(GenerateTextDto(
      prompt: content,
      textType: 'general',
      additionalContext: 'Fix all grammar and spelling errors in this text while preserving its original style and meaning.',
    ));
  }

  /// Make content longer
  Future<AIResponse<TextGenerationResult>> expandContent(String content) async {
    return generateText(GenerateTextDto(
      prompt: content,
      textType: 'general',
      additionalContext: 'Expand this text with more details, examples, and explanations while maintaining consistency.',
    ));
  }

  /// Make content shorter
  Future<AIResponse<TextGenerationResult>> shortenContent(String content) async {
    return generateText(GenerateTextDto(
      prompt: content,
      textType: 'general',
      additionalContext: 'Make this text more concise while retaining all key information and main points.',
    ));
  }

  /// Generate event descriptions for calendar events
  Future<AIResponse<TextGenerationResult>> generateEventDescriptions(String eventTitle) async {
    return generateText(GenerateTextDto(
      prompt: 'Generate exactly 3 professional and concise event descriptions for an event titled "$eventTitle". Each description should be suitable for a calendar event and help attendees understand the purpose and agenda. Provide variety in tone and detail level.\n\nIMPORTANT: Format your response with each description separated by "---" on its own line. Do NOT include any numbering, labels, headers, or prefixes like "1.", "2.", "Description 1:", etc. Just provide the raw description text for each option.\n\nExample format:\nFirst description text here.\n---\nSecond description text here.\n---\nThird description text here.',
      textType: 'general',
      tone: 'professional',
      wordCount: 50,
      maxTokens: 400,
    ));
  }

  /// Generate task descriptions for project tasks
  Future<AIResponse<TextGenerationResult>> generateTaskDescriptions(String taskTitle) async {
    return generateText(GenerateTextDto(
      prompt: 'Generate exactly 3 professional and clear task descriptions for a task titled "$taskTitle". Each description should help team members understand what needs to be done, the expected outcome, and any key considerations. Provide variety in detail level and approach.\n\nIMPORTANT: Format your response with each description separated by "---" on its own line. Do NOT include any numbering, labels, headers, or prefixes like "1.", "2.", "Description 1:", etc. Just provide the raw description text for each option.\n\nExample format:\nFirst description text here.\n---\nSecond description text here.\n---\nThird description text here.',
      textType: 'general',
      tone: 'professional',
      wordCount: 50,
      maxTokens: 400,
    ));
  }

  /// Generate project descriptions for projects
  Future<AIResponse<TextGenerationResult>> generateProjectDescriptions(String projectName, {String? projectType}) async {
    final typeContext = projectType != null ? ' of type "$projectType"' : '';
    return generateText(GenerateTextDto(
      prompt: 'Generate exactly 3 professional project descriptions for a project titled "$projectName"$typeContext. Each description should include key objectives, scope, and expected outcomes. Provide variety in detail level and approach.\n\nIMPORTANT: Format your response with each description separated by "---" on its own line. Do NOT include any numbering, labels, headers, or prefixes like "1.", "2.", "Description 1:", "Project Description 1:", etc. Just provide the raw description text for each option.\n\nExample format:\nFirst project description text here.\n---\nSecond project description text here.\n---\nThird project description text here.',
      textType: 'general',
      tone: 'professional',
      wordCount: 100,
      maxTokens: 600,
    ));
  }

  /// Generate meeting descriptions for video conferences
  Future<AIResponse<TextGenerationResult>> generateMeetingDescriptions(
    String meetingTitle, {
    String? location,
    int? duration,
  }) async {
    final locationContext = location != null ? ' The meeting will be held ${location.toLowerCase() == 'virtual' ? 'virtually' : location.toLowerCase() == 'in-person' ? 'in-person' : 'as a hybrid meeting (both online and in-person)'}.' : '';
    final durationContext = duration != null ? ' Duration: $duration minutes.' : '';

    return generateText(GenerateTextDto(
      prompt: 'Generate 3 professional and concise meeting descriptions for a meeting titled "$meetingTitle". This is a video conference meeting.$locationContext$durationContext Each description should be 2-3 sentences, explain the purpose of the meeting and what attendees can expect. Make them professional and suitable for calendar invitations. Separate each description with a blank line.',
      textType: 'general',
      tone: 'professional',
      wordCount: 50,
      maxTokens: 300,
    ));
  }
}
