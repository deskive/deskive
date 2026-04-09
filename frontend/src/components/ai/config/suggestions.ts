// suggestions.ts - Module-specific suggestions and configuration
import type { CommandSuggestion, ModuleConfig } from '../types/assistant.types'

/**
 * Module-specific command suggestions with i18n keys
 * These suggestions appear when the chat is empty to guide users
 */
export const moduleSuggestions: Record<string, CommandSuggestion[]> = {
  projects: [
    { textKey: 'ai.suggestions.projects.createProject', defaultText: 'Create a new project', icon: '📋', action: 'create_project' },
    { textKey: 'ai.suggestions.projects.updateProject', defaultText: 'Update project status', icon: '✏️', action: 'update_project' },
    { textKey: 'ai.suggestions.projects.createTask', defaultText: 'Add a new task', icon: '✅', action: 'create_task' },
    { textKey: 'ai.suggestions.projects.createBoard', defaultText: 'Create a board', icon: '📊', action: 'create_project' },
  ],
  calendar: [
    { textKey: 'ai.suggestions.calendar.scheduleMeeting', defaultText: 'Schedule a meeting', icon: '📅', action: 'create_meeting' },
    { textKey: 'ai.suggestions.calendar.addStandup', defaultText: 'Add daily standup', icon: '🗓️', action: 'create_meeting' },
    { textKey: 'ai.suggestions.calendar.createReview', defaultText: 'Create a review meeting', icon: '📆', action: 'create_meeting' },
    { textKey: 'ai.suggestions.calendar.scheduleOneOnOne', defaultText: 'Schedule 1:1 meeting', icon: '👥', action: 'create_meeting' },
  ],
  notes: [
    { textKey: 'ai.suggestions.notes.createNote', defaultText: 'Create a new note', icon: '📝', action: 'create_note' },
    { textKey: 'ai.suggestions.notes.writeMeetingNotes', defaultText: 'Write meeting notes', icon: '✍️', action: 'write_meeting_notes' },
    { textKey: 'ai.suggestions.notes.writeDocument', defaultText: 'Help me write a document', icon: '📄', action: 'write_document' },
    { textKey: 'ai.suggestions.notes.translateText', defaultText: 'Translate text', icon: '🌐', action: 'translate_text' },
  ],
  chat: [
    { textKey: 'ai.suggestions.chat.sendMessage', defaultText: 'Send a message', icon: '💬', action: 'send_message' },
    { textKey: 'ai.suggestions.chat.postUpdate', defaultText: 'Post a team update', icon: '📢', action: 'send_message' },
    { textKey: 'ai.suggestions.chat.shareAnnouncement', defaultText: 'Share an announcement', icon: '🔔', action: 'send_message' },
    { textKey: 'ai.suggestions.chat.summarizeChannel', defaultText: 'Summarize channel', icon: '📋', action: 'summarize' },
  ],
  files: [
    { textKey: 'ai.suggestions.files.createFolder', defaultText: 'Create a new folder', icon: '📁', action: 'create_folder' },
    { textKey: 'ai.suggestions.files.organizeFiles', defaultText: 'Organize my files', icon: '🗂️', action: 'move_file' },
    { textKey: 'ai.suggestions.files.searchFiles', defaultText: 'Search for files', icon: '🔍', action: 'search' },
    { textKey: 'ai.suggestions.files.starImportant', defaultText: 'Star important files', icon: '⭐', action: 'star_file' },
  ],
  dashboard: [
    { textKey: 'ai.suggestions.dashboard.dailySummary', defaultText: 'Give me a daily summary', icon: '📊', action: 'get_daily_summary' },
    { textKey: 'ai.suggestions.dashboard.focusToday', defaultText: 'What should I focus on today?', icon: '🎯', action: 'get_focus_recommendations' },
    { textKey: 'ai.suggestions.dashboard.overdueTasks', defaultText: 'Show overdue tasks', icon: '⚠️', action: 'get_overdue_tasks' },
    { textKey: 'ai.suggestions.dashboard.upcomingEvents', defaultText: 'What\'s coming up?', icon: '📅', action: 'get_upcoming_events' },
  ],
  video: [
    { textKey: 'ai.suggestions.video.startMeeting', defaultText: 'Start instant meeting', icon: '🎥', action: 'create_video_meeting' },
    { textKey: 'ai.suggestions.video.scheduleMeeting', defaultText: 'Schedule video call', icon: '📅', action: 'schedule_video_meeting' },
    { textKey: 'ai.suggestions.video.inviteTeam', defaultText: 'Invite team members', icon: '👥', action: 'invite_to_meeting' },
  ],
  email: [
    { textKey: 'ai.suggestions.email.composeEmail', defaultText: 'Compose an email', icon: '✉️', action: 'compose_email' },
    { textKey: 'ai.suggestions.email.draftReply', defaultText: 'Draft a reply to an email', icon: '↩️', action: 'draft_email_reply' },
    { textKey: 'ai.suggestions.email.translateEmail', defaultText: 'Translate an email', icon: '🌐', action: 'translate_text' },
    { textKey: 'ai.suggestions.email.improveWriting', defaultText: 'Improve my email writing', icon: '✨', action: 'improve_writing' },
  ],
  analytics: [
    { textKey: 'ai.suggestions.analytics.summarize', defaultText: 'Summarize my analytics', icon: '📊', action: 'summarize_analytics' },
    { textKey: 'ai.suggestions.analytics.insights', defaultText: 'Give me insights', icon: '💡', action: 'get_insights' },
    { textKey: 'ai.suggestions.analytics.trends', defaultText: 'Show trends', icon: '📈', action: 'analyze_trends' },
    { textKey: 'ai.suggestions.analytics.recommendations', defaultText: 'What should I improve?', icon: '🎯', action: 'get_recommendations' },
  ],
  monitoring: [
    { textKey: 'ai.suggestions.monitoring.checkStatus', defaultText: 'Check system status', icon: '🔍', action: 'check_status' },
    { textKey: 'ai.suggestions.monitoring.alertsSummary', defaultText: 'Summarize alerts', icon: '🚨', action: 'summarize_alerts' },
    { textKey: 'ai.suggestions.monitoring.performance', defaultText: 'Check performance metrics', icon: '⚡', action: 'check_performance' },
    { textKey: 'ai.suggestions.monitoring.healthCheck', defaultText: 'Run health check', icon: '💚', action: 'health_check' },
  ],
  integrations: [
    { textKey: 'ai.suggestions.integrations.setup', defaultText: 'Help me set up an integration', icon: '🔗', action: 'setup_integration' },
    { textKey: 'ai.suggestions.integrations.configure', defaultText: 'Configure integration settings', icon: '⚙️', action: 'configure_integration' },
    { textKey: 'ai.suggestions.integrations.troubleshoot', defaultText: 'Troubleshoot connection issues', icon: '🔧', action: 'troubleshoot' },
    { textKey: 'ai.suggestions.integrations.recommend', defaultText: 'Recommend integrations', icon: '💡', action: 'recommend_integrations' },
  ],
  templates: [
    { textKey: 'ai.suggestions.templates.create', defaultText: 'Create a template', icon: '📋', action: 'create_template' },
    { textKey: 'ai.suggestions.templates.customize', defaultText: 'Customize a template', icon: '✏️', action: 'customize_template' },
    { textKey: 'ai.suggestions.templates.suggest', defaultText: 'Suggest templates for my project', icon: '💡', action: 'suggest_templates' },
    { textKey: 'ai.suggestions.templates.duplicate', defaultText: 'Duplicate a template', icon: '📑', action: 'duplicate_template' },
  ],
  whiteboard: [
    { textKey: 'ai.suggestions.whiteboard.brainstorm', defaultText: 'Help me brainstorm ideas', icon: '💡', action: 'brainstorm' },
    { textKey: 'ai.suggestions.whiteboard.organize', defaultText: 'Organize my whiteboard', icon: '🗂️', action: 'organize_whiteboard' },
    { textKey: 'ai.suggestions.whiteboard.generateDiagram', defaultText: 'Generate a diagram', icon: '📊', action: 'generate_diagram' },
    { textKey: 'ai.suggestions.whiteboard.summarize', defaultText: 'Summarize whiteboard content', icon: '📝', action: 'summarize_whiteboard' },
  ],
  budget: [
    { textKey: 'ai.suggestions.budget.analyze', defaultText: 'Analyze my budget', icon: '💰', action: 'analyze_budget' },
    { textKey: 'ai.suggestions.budget.forecast', defaultText: 'Forecast expenses', icon: '📈', action: 'forecast_expenses' },
    { textKey: 'ai.suggestions.budget.optimize', defaultText: 'Help me optimize spending', icon: '💡', action: 'optimize_spending' },
    { textKey: 'ai.suggestions.budget.report', defaultText: 'Generate budget report', icon: '📊', action: 'generate_report' },
  ],
  forms: [
    { textKey: 'ai.suggestions.forms.create', defaultText: 'Create a new form', icon: '📝', action: 'create_form' },
    { textKey: 'ai.suggestions.forms.analyze', defaultText: 'Analyze form responses', icon: '📊', action: 'analyze_responses' },
    { textKey: 'ai.suggestions.forms.suggest', defaultText: 'Suggest form questions', icon: '💡', action: 'suggest_questions' },
    { textKey: 'ai.suggestions.forms.template', defaultText: 'Use a form template', icon: '📋', action: 'use_template' },
  ],
  members: [
    { textKey: 'ai.suggestions.members.invite', defaultText: 'Invite team members', icon: '👥', action: 'invite_members' },
    { textKey: 'ai.suggestions.members.manage', defaultText: 'Manage member roles', icon: '⚙️', action: 'manage_roles' },
    { textKey: 'ai.suggestions.members.activity', defaultText: 'Show member activity', icon: '📊', action: 'show_activity' },
    { textKey: 'ai.suggestions.members.message', defaultText: 'Send message to members', icon: '💬', action: 'send_message' },
  ],
  notifications: [
    { textKey: 'ai.suggestions.notifications.summarize', defaultText: 'Summarize my notifications', icon: '📋', action: 'summarize_notifications' },
    { textKey: 'ai.suggestions.notifications.prioritize', defaultText: 'What\'s most important?', icon: '⭐', action: 'prioritize_notifications' },
    { textKey: 'ai.suggestions.notifications.configure', defaultText: 'Configure notification settings', icon: '⚙️', action: 'configure_notifications' },
    { textKey: 'ai.suggestions.notifications.filter', defaultText: 'Filter notifications', icon: '🔍', action: 'filter_notifications' },
  ],
}

/**
 * Module configuration with i18n keys for titles, descriptions, and placeholders
 * Welcome messages are contextual based on the current view
 */
export const moduleConfig: Record<string, ModuleConfig> = {
  projects: {
    titleKey: 'ai.modules.projects.title',
    descriptionKey: 'ai.modules.projects.description',
    placeholderKey: 'ai.modules.projects.placeholder',
    welcomeKey: 'ai.modules.projects.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you create projects, add tasks, update status, and manage your work. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  calendar: {
    titleKey: 'ai.modules.calendar.title',
    descriptionKey: 'ai.modules.calendar.description',
    placeholderKey: 'ai.modules.calendar.placeholder',
    welcomeKey: 'ai.modules.calendar.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can schedule meetings, create events, and manage your calendar. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  notes: {
    titleKey: 'ai.modules.notes.title',
    descriptionKey: 'ai.modules.notes.description',
    placeholderKey: 'ai.modules.notes.placeholder',
    welcomeKey: 'ai.modules.notes.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can create notes, write documentation, and organize your ideas. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  chat: {
    titleKey: 'ai.modules.chat.title',
    descriptionKey: 'ai.modules.chat.description',
    placeholderKey: 'ai.modules.chat.placeholder',
    welcomeKey: 'ai.modules.chat.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can send messages, post updates, and help you communicate with your team. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  files: {
    titleKey: 'ai.modules.files.title',
    descriptionKey: 'ai.modules.files.description',
    placeholderKey: 'ai.modules.files.placeholder',
    welcomeKey: 'ai.modules.files.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can create folders, organize files, and help you manage your storage. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  dashboard: {
    titleKey: 'ai.modules.dashboard.title',
    descriptionKey: 'ai.modules.dashboard.description',
    placeholderKey: 'ai.modules.dashboard.placeholder',
    welcomeKey: 'ai.modules.dashboard.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot, your workspace assistant. I can help you with tasks, calendar, notes, files, chat, email, and more. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  video: {
    titleKey: 'ai.modules.video.title',
    descriptionKey: 'ai.modules.video.description',
    placeholderKey: 'ai.modules.video.placeholder',
    welcomeKey: 'ai.modules.video.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can start instant meetings, schedule video calls, and invite your team. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  email: {
    titleKey: 'ai.modules.email.title',
    descriptionKey: 'ai.modules.email.description',
    placeholderKey: 'ai.modules.email.placeholder',
    welcomeKey: 'ai.modules.email.welcome',
    welcomeDefault: "Hi! I'm Auto Pilot. I can compose emails, summarize your inbox, and help you stay on top of communication. Try one of the suggestions below or type **help** to see all my capabilities!",
  },
  settings: {
    titleKey: 'ai.modules.settings.title',
    descriptionKey: 'ai.modules.settings.description',
    placeholderKey: 'ai.modules.settings.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. How can I help you with settings? Type **help** to see all my capabilities!",
  },
  search: {
    titleKey: 'ai.modules.search.title',
    descriptionKey: 'ai.modules.search.description',
    placeholderKey: 'ai.modules.search.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. What are you looking for? Type **help** to see all my capabilities!",
  },
  analytics: {
    titleKey: 'ai.modules.analytics.title',
    descriptionKey: 'ai.modules.analytics.description',
    placeholderKey: 'ai.modules.analytics.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can analyze your data, provide insights, and show trends. What would you like to know?",
  },
  monitoring: {
    titleKey: 'ai.modules.monitoring.title',
    descriptionKey: 'ai.modules.monitoring.description',
    placeholderKey: 'ai.modules.monitoring.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you monitor system health, check alerts, and analyze performance. What do you need?",
  },
  integrations: {
    titleKey: 'ai.modules.integrations.title',
    descriptionKey: 'ai.modules.integrations.description',
    placeholderKey: 'ai.modules.integrations.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you set up, configure, and troubleshoot integrations. What would you like to do?",
  },
  templates: {
    titleKey: 'ai.modules.templates.title',
    descriptionKey: 'ai.modules.templates.description',
    placeholderKey: 'ai.modules.templates.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you create, customize, and manage templates. What do you need?",
  },
  whiteboard: {
    titleKey: 'ai.modules.whiteboard.title',
    descriptionKey: 'ai.modules.whiteboard.description',
    placeholderKey: 'ai.modules.whiteboard.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you brainstorm, organize ideas, and create diagrams. What are you working on?",
  },
  budget: {
    titleKey: 'ai.modules.budget.title',
    descriptionKey: 'ai.modules.budget.description',
    placeholderKey: 'ai.modules.budget.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you analyze budgets, forecast expenses, and optimize spending. What do you need?",
  },
  forms: {
    titleKey: 'ai.modules.forms.title',
    descriptionKey: 'ai.modules.forms.description',
    placeholderKey: 'ai.modules.forms.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you create forms, analyze responses, and suggest improvements. What would you like to do?",
  },
  members: {
    titleKey: 'ai.modules.members.title',
    descriptionKey: 'ai.modules.members.description',
    placeholderKey: 'ai.modules.members.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you manage team members, roles, and activity. What do you need?",
  },
  notifications: {
    titleKey: 'ai.modules.notifications.title',
    descriptionKey: 'ai.modules.notifications.description',
    placeholderKey: 'ai.modules.notifications.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you manage, prioritize, and filter your notifications. What do you need?",
  },
  more: {
    titleKey: 'ai.modules.more.title',
    descriptionKey: 'ai.modules.more.description',
    placeholderKey: 'ai.modules.more.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. How can I help you today? Type **help** to see all my capabilities!",
  },
  apps: {
    titleKey: 'ai.modules.apps.title',
    descriptionKey: 'ai.modules.apps.description',
    placeholderKey: 'ai.modules.apps.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you find and configure apps. What are you looking for?",
  },
  profile: {
    titleKey: 'ai.modules.profile.title',
    descriptionKey: 'ai.modules.profile.description',
    placeholderKey: 'ai.modules.profile.placeholder',
    welcomeDefault: "Hi! I'm Auto Pilot. I can help you manage your profile and preferences. What would you like to do?",
  },
}

/**
 * Default fallback suggestions for unsupported views
 */
export const defaultSuggestions: CommandSuggestion[] = moduleSuggestions.dashboard

/**
 * Default fallback config for unsupported views
 */
export const defaultConfig: ModuleConfig = moduleConfig.dashboard

/**
 * Views that have full AI assistant support
 * Now supports all views - autopilot is global
 */
export const supportedViews = ['projects', 'notes', 'calendar', 'files', 'chat', 'dashboard', 'video', 'email', 'settings', 'search', 'analytics', 'monitoring', 'integrations', 'more', 'apps', 'templates', 'whiteboard', 'budget', 'forms', 'members', 'notifications', 'profile']

/**
 * Check if a view has AI support
 * Always returns true - autopilot is available everywhere
 */
export function isViewSupported(view: string): boolean {
  return true
}

/**
 * Get suggestions for a specific view with fallback
 */
export function getSuggestionsForView(view: string): CommandSuggestion[] {
  return moduleSuggestions[view] || defaultSuggestions
}

/**
 * Get config for a specific view with fallback
 */
export function getConfigForView(view: string): ModuleConfig {
  return moduleConfig[view] || defaultConfig
}
