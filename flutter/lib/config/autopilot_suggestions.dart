import 'package:flutter/material.dart';

/// Command suggestion for quick actions
class CommandSuggestion {
  final String textKey;
  final String defaultText;
  final IconData icon;
  final String action;
  final String? command; // The actual command text to send

  const CommandSuggestion({
    required this.textKey,
    required this.defaultText,
    required this.icon,
    required this.action,
    this.command,
  });

  /// Get the command text to send (defaults to defaultText if command is null)
  String get commandText => command ?? defaultText;
}

/// Category of suggestions for the bottom sheet
class SuggestionCategory {
  final String id;
  final String titleKey;
  final String titleDefault;
  final IconData icon;
  final Color color;
  final List<CommandSuggestion> suggestions;

  const SuggestionCategory({
    required this.id,
    required this.titleKey,
    required this.titleDefault,
    required this.icon,
    required this.color,
    required this.suggestions,
  });
}

/// Module configuration for context-aware behavior
class ModuleConfig {
  final String titleKey;
  final String descriptionKey;
  final String placeholderKey;
  final String? welcomeKey;
  final String welcomeDefault;

  const ModuleConfig({
    required this.titleKey,
    required this.descriptionKey,
    required this.placeholderKey,
    this.welcomeKey,
    required this.welcomeDefault,
  });
}

/// Module-specific command suggestions
/// These suggestions appear when the chat is empty to guide users
class AutoPilotSuggestions {
  static const Map<String, List<CommandSuggestion>> moduleSuggestions = {
    'projects': [
      CommandSuggestion(
        textKey: 'ai.suggestions.projects.createProject',
        defaultText: 'Create a new project',
        icon: Icons.folder_outlined,
        action: 'create_project',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.projects.updateProject',
        defaultText: 'Update project status',
        icon: Icons.edit_outlined,
        action: 'update_project',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.projects.createTask',
        defaultText: 'Add a new task',
        icon: Icons.check_circle_outline,
        action: 'create_task',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.projects.createBoard',
        defaultText: 'Create a board',
        icon: Icons.dashboard_outlined,
        action: 'create_project',
      ),
    ],
    'calendar': [
      CommandSuggestion(
        textKey: 'ai.suggestions.calendar.scheduleMeeting',
        defaultText: 'Schedule a meeting',
        icon: Icons.calendar_today_outlined,
        action: 'create_meeting',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.calendar.addStandup',
        defaultText: 'Add daily standup',
        icon: Icons.event_outlined,
        action: 'create_meeting',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.calendar.createReview',
        defaultText: 'Create a review meeting',
        icon: Icons.rate_review_outlined,
        action: 'create_meeting',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.calendar.scheduleOneOnOne',
        defaultText: 'Schedule 1:1 meeting',
        icon: Icons.people_outline,
        action: 'create_meeting',
      ),
    ],
    'notes': [
      CommandSuggestion(
        textKey: 'ai.suggestions.notes.createNote',
        defaultText: 'Create a new note',
        icon: Icons.note_add_outlined,
        action: 'create_note',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.notes.writeMeetingNotes',
        defaultText: 'Write meeting notes',
        icon: Icons.edit_note_outlined,
        action: 'write_meeting_notes',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.notes.writeDocument',
        defaultText: 'Help me write a document',
        icon: Icons.description_outlined,
        action: 'write_document',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.notes.translateText',
        defaultText: 'Translate text',
        icon: Icons.translate_outlined,
        action: 'translate_text',
      ),
    ],
    'chat': [
      CommandSuggestion(
        textKey: 'ai.suggestions.chat.sendMessage',
        defaultText: 'Send a message',
        icon: Icons.chat_outlined,
        action: 'send_message',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.chat.postUpdate',
        defaultText: 'Post a team update',
        icon: Icons.campaign_outlined,
        action: 'send_message',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.chat.shareAnnouncement',
        defaultText: 'Share an announcement',
        icon: Icons.notifications_outlined,
        action: 'send_message',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.chat.summarizeChannel',
        defaultText: 'Summarize channel',
        icon: Icons.summarize_outlined,
        action: 'summarize',
      ),
    ],
    'files': [
      CommandSuggestion(
        textKey: 'ai.suggestions.files.createFolder',
        defaultText: 'Create a new folder',
        icon: Icons.create_new_folder_outlined,
        action: 'create_folder',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.files.organizeFiles',
        defaultText: 'Organize my files',
        icon: Icons.folder_copy_outlined,
        action: 'move_file',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.files.searchFiles',
        defaultText: 'Search for files',
        icon: Icons.search_outlined,
        action: 'search',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.files.starImportant',
        defaultText: 'Star important files',
        icon: Icons.star_outline,
        action: 'star_file',
      ),
    ],
    'dashboard': [
      CommandSuggestion(
        textKey: 'ai.suggestions.dashboard.dailySummary',
        defaultText: 'Give me a daily summary',
        icon: Icons.analytics_outlined,
        action: 'get_daily_summary',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.dashboard.focusToday',
        defaultText: 'What should I focus on today?',
        icon: Icons.center_focus_strong_outlined,
        action: 'get_focus_recommendations',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.dashboard.overdueTasks',
        defaultText: 'Show overdue tasks',
        icon: Icons.warning_amber_outlined,
        action: 'get_overdue_tasks',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.dashboard.upcomingEvents',
        defaultText: "What's coming up?",
        icon: Icons.upcoming_outlined,
        action: 'get_upcoming_events',
      ),
    ],
    'video': [
      CommandSuggestion(
        textKey: 'ai.suggestions.video.startMeeting',
        defaultText: 'Start instant meeting',
        icon: Icons.videocam_outlined,
        action: 'create_video_meeting',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.video.scheduleMeeting',
        defaultText: 'Schedule video call',
        icon: Icons.video_call_outlined,
        action: 'schedule_video_meeting',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.video.inviteTeam',
        defaultText: 'Invite team members',
        icon: Icons.group_add_outlined,
        action: 'invite_to_meeting',
      ),
    ],
    'email': [
      CommandSuggestion(
        textKey: 'ai.suggestions.email.composeEmail',
        defaultText: 'Compose an email',
        icon: Icons.email_outlined,
        action: 'compose_email',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.email.draftReply',
        defaultText: 'Draft a reply to an email',
        icon: Icons.reply_outlined,
        action: 'draft_email_reply',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.email.translateEmail',
        defaultText: 'Translate an email',
        icon: Icons.translate_outlined,
        action: 'translate_text',
      ),
      CommandSuggestion(
        textKey: 'ai.suggestions.email.improveWriting',
        defaultText: 'Improve my email writing',
        icon: Icons.auto_fix_high_outlined,
        action: 'improve_writing',
      ),
    ],
  };

  static const Map<String, ModuleConfig> moduleConfig = {
    'projects': ModuleConfig(
      titleKey: 'ai.modules.projects.title',
      descriptionKey: 'ai.modules.projects.description',
      placeholderKey: 'ai.modules.projects.placeholder',
      welcomeKey: 'ai.modules.projects.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can help you create projects, add tasks, update status, and manage your work. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'calendar': ModuleConfig(
      titleKey: 'ai.modules.calendar.title',
      descriptionKey: 'ai.modules.calendar.description',
      placeholderKey: 'ai.modules.calendar.placeholder',
      welcomeKey: 'ai.modules.calendar.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can schedule meetings, create events, and manage your calendar. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'notes': ModuleConfig(
      titleKey: 'ai.modules.notes.title',
      descriptionKey: 'ai.modules.notes.description',
      placeholderKey: 'ai.modules.notes.placeholder',
      welcomeKey: 'ai.modules.notes.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can create notes, write documentation, and organize your ideas. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'chat': ModuleConfig(
      titleKey: 'ai.modules.chat.title',
      descriptionKey: 'ai.modules.chat.description',
      placeholderKey: 'ai.modules.chat.placeholder',
      welcomeKey: 'ai.modules.chat.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can send messages, post updates, and help you communicate with your team. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'files': ModuleConfig(
      titleKey: 'ai.modules.files.title',
      descriptionKey: 'ai.modules.files.description',
      placeholderKey: 'ai.modules.files.placeholder',
      welcomeKey: 'ai.modules.files.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can create folders, organize files, and help you manage your storage. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'dashboard': ModuleConfig(
      titleKey: 'ai.modules.dashboard.title',
      descriptionKey: 'ai.modules.dashboard.description',
      placeholderKey: 'ai.modules.dashboard.placeholder',
      welcomeKey: 'ai.modules.dashboard.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot, your workspace assistant. I can help you with tasks, calendar, notes, files, chat, email, and more. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'video': ModuleConfig(
      titleKey: 'ai.modules.video.title',
      descriptionKey: 'ai.modules.video.description',
      placeholderKey: 'ai.modules.video.placeholder',
      welcomeKey: 'ai.modules.video.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can start instant meetings, schedule video calls, and invite your team. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
    'email': ModuleConfig(
      titleKey: 'ai.modules.email.title',
      descriptionKey: 'ai.modules.email.description',
      placeholderKey: 'ai.modules.email.placeholder',
      welcomeKey: 'ai.modules.email.welcome',
      welcomeDefault: "Hi! I'm Auto Pilot. I can compose emails, summarize your inbox, and help you stay on top of communication. Try one of the suggestions below or type **help** to see all my capabilities!",
    ),
  };

  /// Views that have full AI assistant support
  static const List<String> supportedViews = [
    'projects',
    'notes',
    'calendar',
    'files',
    'chat',
    'dashboard',
    'video',
    'email',
  ];

  /// Default fallback suggestions for unsupported views
  static List<CommandSuggestion> get defaultSuggestions =>
      moduleSuggestions['dashboard'] ?? [];

  /// Default fallback config for unsupported views
  static ModuleConfig get defaultConfig =>
      moduleConfig['dashboard'] ??
      const ModuleConfig(
        titleKey: 'ai.title',
        descriptionKey: 'ai.description',
        placeholderKey: 'ai.placeholder',
        welcomeDefault: "Hi! I'm Auto Pilot. How can I help you today?",
      );

  /// Check if a view has AI support
  static bool isViewSupported(String view) {
    return supportedViews.contains(view.toLowerCase());
  }

  /// Get suggestions for a specific view with fallback
  static List<CommandSuggestion> getSuggestionsForView(String view) {
    return moduleSuggestions[view.toLowerCase()] ?? defaultSuggestions;
  }

  /// Get config for a specific view with fallback
  static ModuleConfig getConfigForView(String view) {
    return moduleConfig[view.toLowerCase()] ?? defaultConfig;
  }

  /// Categories for the suggestion bottom sheet
  /// These are organized by category for easier browsing
  static const List<SuggestionCategory> categories = [
    // Insights & Summary
    SuggestionCategory(
      id: 'insights',
      titleKey: 'autopilot.category.insights',
      titleDefault: 'Insights',
      icon: Icons.insights_outlined,
      color: Color(0xFF9C27B0), // Purple
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.dailySummary',
          defaultText: 'Daily Summary',
          icon: Icons.today_outlined,
          action: 'get_daily_summary',
          command: 'Give me my daily summary',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.focusToday',
          defaultText: 'Focus Today',
          icon: Icons.center_focus_strong_outlined,
          action: 'get_focus_recommendations',
          command: 'What should I focus on today?',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.weeklyReport',
          defaultText: 'Weekly Report',
          icon: Icons.date_range_outlined,
          action: 'get_weekly_summary',
          command: 'Give me my weekly summary',
        ),
      ],
    ),
    // Tasks
    SuggestionCategory(
      id: 'tasks',
      titleKey: 'autopilot.category.tasks',
      titleDefault: 'Tasks',
      icon: Icons.check_circle_outline,
      color: Color(0xFF4CAF50), // Green
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.createTask',
          defaultText: 'Create Task',
          icon: Icons.add_task_outlined,
          action: 'create_task',
          command: 'Create a new task',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.myTasks',
          defaultText: 'My Tasks',
          icon: Icons.list_alt_outlined,
          action: 'list_tasks',
          command: 'Show my tasks',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.overdueTasks',
          defaultText: 'Overdue',
          icon: Icons.warning_amber_outlined,
          action: 'get_overdue_tasks',
          command: 'Show my overdue tasks',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.batchTasks',
          defaultText: 'Batch Create',
          icon: Icons.playlist_add_outlined,
          action: 'batch_create_tasks',
          command: 'Create multiple tasks',
        ),
      ],
    ),
    // Calendar
    SuggestionCategory(
      id: 'calendar',
      titleKey: 'autopilot.category.calendar',
      titleDefault: 'Calendar',
      icon: Icons.calendar_today_outlined,
      color: Color(0xFF2196F3), // Blue
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.scheduleMeeting',
          defaultText: 'Schedule Meeting',
          icon: Icons.event_outlined,
          action: 'create_calendar_event',
          command: 'Schedule a meeting',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.todayEvents',
          defaultText: "Today's Events",
          icon: Icons.today_outlined,
          action: 'list_calendar_events',
          command: "What's on my calendar today?",
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.createReminder',
          defaultText: 'Reminder',
          icon: Icons.alarm_outlined,
          action: 'add_event_reminder',
          command: 'Set a reminder',
        ),
      ],
    ),
    // Notes & Writing
    SuggestionCategory(
      id: 'notes',
      titleKey: 'autopilot.category.notes',
      titleDefault: 'Notes & Writing',
      icon: Icons.edit_note_outlined,
      color: Color(0xFFFF9800), // Orange
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.createNote',
          defaultText: 'Create Note',
          icon: Icons.note_add_outlined,
          action: 'create_note',
          command: 'Create a new note',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.meetingNotes',
          defaultText: 'Meeting Notes',
          icon: Icons.description_outlined,
          action: 'write_meeting_notes',
          command: 'Write meeting notes',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.writeDoc',
          defaultText: 'Write Doc',
          icon: Icons.article_outlined,
          action: 'write_document',
          command: 'Help me write a document',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.improveWriting',
          defaultText: 'Improve',
          icon: Icons.auto_fix_high_outlined,
          action: 'improve_writing',
          command: 'Improve my writing',
        ),
      ],
    ),
    // Communication
    SuggestionCategory(
      id: 'communication',
      titleKey: 'autopilot.category.communication',
      titleDefault: 'Communication',
      icon: Icons.chat_outlined,
      color: Color(0xFF00BCD4), // Cyan
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.sendMessage',
          defaultText: 'Send Message',
          icon: Icons.send_outlined,
          action: 'send_channel_message',
          command: 'Send a message',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.composeEmail',
          defaultText: 'Email',
          icon: Icons.email_outlined,
          action: 'send_email',
          command: 'Compose an email',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.teamUpdate',
          defaultText: 'Team Update',
          icon: Icons.campaign_outlined,
          action: 'send_channel_message',
          command: 'Post a team update',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.summarize',
          defaultText: 'Summarize',
          icon: Icons.summarize_outlined,
          action: 'summarize_content',
          command: 'Summarize recent messages',
        ),
      ],
    ),
    // Files
    SuggestionCategory(
      id: 'files',
      titleKey: 'autopilot.category.files',
      titleDefault: 'Files',
      icon: Icons.folder_outlined,
      color: Color(0xFF795548), // Brown
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.createFolder',
          defaultText: 'Create Folder',
          icon: Icons.create_new_folder_outlined,
          action: 'create_folder',
          command: 'Create a new folder',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.searchFiles',
          defaultText: 'Search',
          icon: Icons.search_outlined,
          action: 'search_files',
          command: 'Search for files',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.organizeFiles',
          defaultText: 'Organize',
          icon: Icons.folder_copy_outlined,
          action: 'move_file',
          command: 'Organize my files',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.recentFiles',
          defaultText: 'Recent',
          icon: Icons.history_outlined,
          action: 'list_recent_files',
          command: 'Show my recent files',
        ),
      ],
    ),
    // Video Calls
    SuggestionCategory(
      id: 'video',
      titleKey: 'autopilot.category.video',
      titleDefault: 'Video Calls',
      icon: Icons.videocam_outlined,
      color: Color(0xFFE91E63), // Pink
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.startMeeting',
          defaultText: 'Start Meeting',
          icon: Icons.video_call_outlined,
          action: 'create_video_meeting',
          command: 'Start an instant video meeting',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.scheduleCall',
          defaultText: 'Schedule Call',
          icon: Icons.event_outlined,
          action: 'create_video_meeting',
          command: 'Schedule a video call',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.inviteTeam',
          defaultText: 'Invite Team',
          icon: Icons.group_add_outlined,
          action: 'invite_to_meeting',
          command: 'Invite team members to a meeting',
        ),
      ],
    ),
    // Budget & Finance
    SuggestionCategory(
      id: 'budget',
      titleKey: 'autopilot.category.budget',
      titleDefault: 'Budget & Finance',
      icon: Icons.account_balance_wallet_outlined,
      color: Color(0xFF009688), // Teal
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.createBudget',
          defaultText: 'Create Budget',
          icon: Icons.add_chart_outlined,
          action: 'create_budget',
          command: 'Create a new budget',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.addExpense',
          defaultText: 'Add Expense',
          icon: Icons.receipt_long_outlined,
          action: 'create_expense',
          command: 'Add an expense',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.budgetSummary',
          defaultText: 'Summary',
          icon: Icons.pie_chart_outline,
          action: 'get_budget_summary',
          command: 'Show budget summary',
        ),
      ],
    ),
    // Approvals
    SuggestionCategory(
      id: 'approvals',
      titleKey: 'autopilot.category.approvals',
      titleDefault: 'Approvals',
      icon: Icons.verified_outlined,
      color: Color(0xFF673AB7), // Deep Purple
      suggestions: [
        CommandSuggestion(
          textKey: 'autopilot.suggestions.createRequest',
          defaultText: 'Create Request',
          icon: Icons.post_add_outlined,
          action: 'create_approval_request',
          command: 'Create an approval request',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.pendingApprovals',
          defaultText: 'Pending',
          icon: Icons.pending_actions_outlined,
          action: 'list_approval_requests',
          command: 'Show my pending approvals',
        ),
        CommandSuggestion(
          textKey: 'autopilot.suggestions.myRequests',
          defaultText: 'My Requests',
          icon: Icons.assignment_outlined,
          action: 'list_approval_requests',
          command: 'Show my approval requests',
        ),
      ],
    ),
  ];

  /// Get a category by ID
  static SuggestionCategory? getCategoryById(String id) {
    try {
      return categories.firstWhere((c) => c.id == id);
    } catch (_) {
      return null;
    }
  }
}
