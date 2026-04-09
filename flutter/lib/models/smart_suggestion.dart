/// Smart suggestion model for Autopilot quick actions
class SmartSuggestion {
  final String id;
  final String text;
  final String command;
  final String icon;
  final int priority;
  final bool isContextual;
  final String? category;

  const SmartSuggestion({
    required this.id,
    required this.text,
    required this.command,
    required this.icon,
    required this.priority,
    required this.isContextual,
    this.category,
  });

  factory SmartSuggestion.fromJson(Map<String, dynamic> json) {
    return SmartSuggestion(
      id: json['id'] as String,
      text: json['text'] as String,
      command: json['command'] as String,
      icon: json['icon'] as String,
      priority: json['priority'] as int,
      isContextual: json['isContextual'] as bool,
      category: json['category'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'command': command,
      'icon': icon,
      'priority': priority,
      'isContextual': isContextual,
      'category': category,
    };
  }
}

/// Response model for smart suggestions API
class SmartSuggestionsResponse {
  final List<SmartSuggestion> suggestions;
  final String generatedAt;

  const SmartSuggestionsResponse({
    required this.suggestions,
    required this.generatedAt,
  });

  factory SmartSuggestionsResponse.fromJson(Map<String, dynamic> json) {
    return SmartSuggestionsResponse(
      suggestions: (json['suggestions'] as List<dynamic>)
          .map((e) => SmartSuggestion.fromJson(e as Map<String, dynamic>))
          .toList(),
      generatedAt: json['generatedAt'] as String,
    );
  }
}
