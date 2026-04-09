import 'package:flutter/material.dart';

/// Available AI actions for emails
enum EmailAIAction {
  summarize,
  translate,
  extractTasks,
  helpMeWrite,
  smartReplies,
  createEventFromTicket,
}

/// Configuration for each email AI action
class EmailAIActionConfig {
  final String label;
  final String description;
  final IconData icon;
  final Color color;

  const EmailAIActionConfig({
    required this.label,
    required this.description,
    required this.icon,
    required this.color,
  });
}

/// Get AI action config for email actions
EmailAIActionConfig getEmailAIActionConfig(EmailAIAction action) {
  switch (action) {
    case EmailAIAction.summarize:
      return const EmailAIActionConfig(
        label: 'Summarize',
        description: 'Get a concise summary of this email',
        icon: Icons.summarize,
        color: Colors.green,
      );
    case EmailAIAction.translate:
      return const EmailAIActionConfig(
        label: 'Translate',
        description: 'Translate email to another language',
        icon: Icons.translate,
        color: Colors.orange,
      );
    case EmailAIAction.extractTasks:
      return const EmailAIActionConfig(
        label: 'Extract Tasks',
        description: 'Find action items and tasks',
        icon: Icons.task_alt,
        color: Colors.purple,
      );
    case EmailAIAction.helpMeWrite:
      return const EmailAIActionConfig(
        label: 'Help Me Write',
        description: 'Get AI-generated draft suggestions',
        icon: Icons.edit_note,
        color: Colors.blue,
      );
    case EmailAIAction.smartReplies:
      return const EmailAIActionConfig(
        label: 'Smart Replies',
        description: 'Get quick reply suggestions',
        icon: Icons.quickreply,
        color: Colors.teal,
      );
    case EmailAIAction.createEventFromTicket:
      return const EmailAIActionConfig(
        label: 'Create Event',
        description: 'Extract travel info and create calendar event',
        icon: Icons.flight_takeoff,
        color: Colors.indigo,
      );
  }
}

/// Languages available for translation
const List<Map<String, String>> emailTranslationLanguages = [
  {'code': 'en', 'name': 'English', 'flag': '🇺🇸'},
  {'code': 'es', 'name': 'Spanish', 'flag': '🇪🇸'},
  {'code': 'fr', 'name': 'French', 'flag': '🇫🇷'},
  {'code': 'de', 'name': 'German', 'flag': '🇩🇪'},
  {'code': 'it', 'name': 'Italian', 'flag': '🇮🇹'},
  {'code': 'pt', 'name': 'Portuguese', 'flag': '🇵🇹'},
  {'code': 'zh', 'name': 'Chinese', 'flag': '🇨🇳'},
  {'code': 'ja', 'name': 'Japanese', 'flag': '🇯🇵'},
  {'code': 'ko', 'name': 'Korean', 'flag': '🇰🇷'},
  {'code': 'ar', 'name': 'Arabic', 'flag': '🇸🇦'},
  {'code': 'hi', 'name': 'Hindi', 'flag': '🇮🇳'},
  {'code': 'ru', 'name': 'Russian', 'flag': '🇷🇺'},
];
