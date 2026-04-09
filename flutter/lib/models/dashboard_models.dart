class DashboardMetrics {
  final DashboardSummary summary;
  final DashboardToday today;
  final DashboardProductivity productivity;
  final DashboardEngagement engagement;
  final DashboardTrends trends;

  DashboardMetrics({
    required this.summary,
    required this.today,
    required this.productivity,
    required this.engagement,
    required this.trends,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    return DashboardMetrics(
      summary: DashboardSummary.fromJson(json['summary'] ?? {}),
      today: DashboardToday.fromJson(json['today'] ?? {}),
      productivity: DashboardProductivity.fromJson(json['productivity'] ?? {}),
      engagement: DashboardEngagement.fromJson(json['engagement'] ?? {}),
      trends: DashboardTrends.fromJson(json['trends'] ?? {}),
    );
  }
}

class DashboardSummary {
  final int totalProjects;
  final int activeProjects;
  final int totalTasks;
  final int completedTasks;
  final int pendingTasks;
  final int totalTeamMembers;
  final int activeTeamMembers;
  final int totalMessages;
  final int totalEvents;
  final int totalFiles;
  final int totalVideoCalls;
  final int storageUsed;
  final int integrations;

  DashboardSummary({
    required this.totalProjects,
    required this.activeProjects,
    required this.totalTasks,
    required this.completedTasks,
    required this.pendingTasks,
    required this.totalTeamMembers,
    required this.activeTeamMembers,
    required this.totalMessages,
    required this.totalEvents,
    required this.totalFiles,
    required this.totalVideoCalls,
    required this.storageUsed,
    required this.integrations,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      totalProjects: json['totalProjects'] ?? 0,
      activeProjects: json['activeProjects'] ?? 0,
      totalTasks: json['totalTasks'] ?? 0,
      completedTasks: json['completedTasks'] ?? 0,
      pendingTasks: json['pendingTasks'] ?? 0,
      totalTeamMembers: json['totalTeamMembers'] ?? 0,
      activeTeamMembers: json['activeTeamMembers'] ?? 0,
      totalMessages: json['totalMessages'] ?? 0,
      totalEvents: json['totalEvents'] ?? 0,
      totalFiles: json['totalFiles'] ?? 0,
      totalVideoCalls: json['totalVideoCalls'] ?? 0,
      storageUsed: json['storageUsed'] ?? 0,
      integrations: json['integrations'] ?? 0,
    );
  }
}

class DashboardToday {
  final int messagesCount;
  final int filesUploaded;
  final int tasksCompleted;
  final int videoCallsCount;

  DashboardToday({
    required this.messagesCount,
    required this.filesUploaded,
    required this.tasksCompleted,
    required this.videoCallsCount,
  });

  factory DashboardToday.fromJson(Map<String, dynamic> json) {
    return DashboardToday(
      messagesCount: json['messagesCount'] ?? 0,
      filesUploaded: json['filesUploaded'] ?? 0,
      tasksCompleted: json['tasksCompleted'] ?? 0,
      videoCallsCount: json['videoCallsCount'] ?? 0,
    );
  }
}

class DashboardProductivity {
  final int tasksCompletedToday;
  final int tasksCompletedThisWeek;
  final int tasksCompletedThisMonth;
  final double averageTaskCompletionTime;
  final double projectCompletionRate;

  DashboardProductivity({
    required this.tasksCompletedToday,
    required this.tasksCompletedThisWeek,
    required this.tasksCompletedThisMonth,
    required this.averageTaskCompletionTime,
    required this.projectCompletionRate,
  });

  factory DashboardProductivity.fromJson(Map<String, dynamic> json) {
    return DashboardProductivity(
      tasksCompletedToday: json['tasksCompletedToday'] ?? 0,
      tasksCompletedThisWeek: json['tasksCompletedThisWeek'] ?? 0,
      tasksCompletedThisMonth: json['tasksCompletedThisMonth'] ?? 0,
      averageTaskCompletionTime: (json['averageTaskCompletionTime'] ?? 0).toDouble(),
      projectCompletionRate: (json['projectCompletionRate'] ?? 0).toDouble(),
    );
  }
}

class DashboardEngagement {
  final double messagesPerDay;
  final double filesSharedPerDay;
  final int activeUsersToday;
  final int activeUsersThisWeek;
  final int meetingsScheduled;

  DashboardEngagement({
    required this.messagesPerDay,
    required this.filesSharedPerDay,
    required this.activeUsersToday,
    required this.activeUsersThisWeek,
    required this.meetingsScheduled,
  });

  factory DashboardEngagement.fromJson(Map<String, dynamic> json) {
    return DashboardEngagement(
      messagesPerDay: (json['messagesPerDay'] ?? 0).toDouble(),
      filesSharedPerDay: (json['filesSharedPerDay'] ?? 0).toDouble(),
      activeUsersToday: json['activeUsersToday'] ?? 0,
      activeUsersThisWeek: json['activeUsersThisWeek'] ?? 0,
      meetingsScheduled: json['meetingsScheduled'] ?? 0,
    );
  }
}

class DashboardTrends {
  final double taskCompletionTrend;
  final double teamEngagementTrend;
  final double projectProgressTrend;

  DashboardTrends({
    required this.taskCompletionTrend,
    required this.teamEngagementTrend,
    required this.projectProgressTrend,
  });

  factory DashboardTrends.fromJson(Map<String, dynamic> json) {
    return DashboardTrends(
      taskCompletionTrend: (json['taskCompletionTrend'] ?? 0).toDouble(),
      teamEngagementTrend: (json['teamEngagementTrend'] ?? 0).toDouble(),
      projectProgressTrend: (json['projectProgressTrend'] ?? 0).toDouble(),
    );
  }
}

class DashboardActivity {
  final String id;
  final String type;
  final String title;
  final String description;
  final String userId;
  final String userName;
  final String userAvatar;
  final String workspaceId;
  final DateTime timestamp;
  final DateTime createdAt;

  DashboardActivity({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.userId,
    required this.userName,
    required this.userAvatar,
    required this.workspaceId,
    required this.timestamp,
    required this.createdAt,
  });

  factory DashboardActivity.fromJson(Map<String, dynamic> json) {
    return DashboardActivity(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? '',
      userAvatar: json['userAvatar'] ?? '',
      workspaceId: json['workspaceId'] ?? '',
      timestamp: DateTime.parse(json['timestamp']),
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class DashboardRecentActivity {
  final List<DashboardActivity> activities;
  final int total;
  final bool hasMore;

  DashboardRecentActivity({
    required this.activities,
    required this.total,
    required this.hasMore,
  });

  factory DashboardRecentActivity.fromJson(Map<String, dynamic> json) {
    return DashboardRecentActivity(
      activities: (json['activities'] as List?)
          ?.map((activity) => DashboardActivity.fromJson(activity))
          .toList() ?? [],
      total: json['total'] ?? 0,
      hasMore: json['hasMore'] ?? false,
    );
  }
}

class DashboardData {
  final DashboardMetrics metrics;
  final DashboardRecentActivity recentActivity;

  DashboardData({
    required this.metrics,
    required this.recentActivity,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    return DashboardData(
      metrics: DashboardMetrics.fromJson(json['metrics'] ?? {}),
      recentActivity: DashboardRecentActivity.fromJson(json['recentActivity'] ?? {}),
    );
  }
}

// ============================================
// Smart Suggestions Models
// ============================================

/// Suggestion types enum
enum SuggestionType {
  taskBalance,
  meeting,
  unreadMessage,
  noteUpdate,
  overdueTask,
  upcomingDeadline,
  // File module suggestions
  storageWarning,
  fileSharing,
  orphanedFiles,
  largeFiles,
  // Calendar module suggestions
  calendarConflict,
  upcomingEvent,
  missedEvent,
  eventReminder,
  // Note module suggestions
  staleNote,
  unorganizedNotes,
  noteTemplate,
  // Project module suggestions
  projectAtRisk,
  milestoneDeadline,
  inactiveProject,
  projectCompletion,
  // Activity/Team suggestions
  inactiveMember,
  engagementDrop,
  teamCelebration,
  teamAchievement,
  // Sprint/Agile suggestions
  sprintEndingSoon,
  sprintNoTasks,
  sprintRetrospective,
  backlogGrooming,
  // Billing/Subscription suggestions
  subscriptionExpiring,
  usageLimitApproaching,
  upgradeRecommendation,
  // Chat/Mentions suggestions
  unansweredMention,
  pendingDmResponse,
  inactiveChannel,
  // Analytics suggestions
  weeklyReportReady,
  productivityMilestone,
  productivityTrendDown,
}

/// Suggestion priority enum
enum SuggestionPriority {
  high,
  medium,
  low,
}

/// Extension to parse suggestion type from string
extension SuggestionTypeExtension on SuggestionType {
  static SuggestionType fromString(String value) {
    switch (value) {
      case 'task_balance':
        return SuggestionType.taskBalance;
      case 'meeting':
        return SuggestionType.meeting;
      case 'unread_message':
        return SuggestionType.unreadMessage;
      case 'note_update':
        return SuggestionType.noteUpdate;
      case 'overdue_task':
        return SuggestionType.overdueTask;
      case 'upcoming_deadline':
        return SuggestionType.upcomingDeadline;
      case 'storage_warning':
        return SuggestionType.storageWarning;
      case 'file_sharing':
        return SuggestionType.fileSharing;
      case 'orphaned_files':
        return SuggestionType.orphanedFiles;
      case 'large_files':
        return SuggestionType.largeFiles;
      case 'calendar_conflict':
        return SuggestionType.calendarConflict;
      case 'upcoming_event':
        return SuggestionType.upcomingEvent;
      case 'missed_event':
        return SuggestionType.missedEvent;
      case 'event_reminder':
        return SuggestionType.eventReminder;
      case 'stale_note':
        return SuggestionType.staleNote;
      case 'unorganized_notes':
        return SuggestionType.unorganizedNotes;
      case 'note_template':
        return SuggestionType.noteTemplate;
      case 'project_at_risk':
        return SuggestionType.projectAtRisk;
      case 'milestone_deadline':
        return SuggestionType.milestoneDeadline;
      case 'inactive_project':
        return SuggestionType.inactiveProject;
      case 'project_completion':
        return SuggestionType.projectCompletion;
      case 'inactive_member':
        return SuggestionType.inactiveMember;
      case 'engagement_drop':
        return SuggestionType.engagementDrop;
      case 'team_celebration':
        return SuggestionType.teamCelebration;
      case 'team_achievement':
        return SuggestionType.teamAchievement;
      // Sprint/Agile suggestions
      case 'sprint_ending_soon':
        return SuggestionType.sprintEndingSoon;
      case 'sprint_no_tasks':
        return SuggestionType.sprintNoTasks;
      case 'sprint_retrospective':
        return SuggestionType.sprintRetrospective;
      case 'backlog_grooming':
        return SuggestionType.backlogGrooming;
      // Billing/Subscription suggestions
      case 'subscription_expiring':
        return SuggestionType.subscriptionExpiring;
      case 'usage_limit_approaching':
        return SuggestionType.usageLimitApproaching;
      case 'upgrade_recommendation':
        return SuggestionType.upgradeRecommendation;
      // Chat/Mentions suggestions
      case 'unanswered_mention':
        return SuggestionType.unansweredMention;
      case 'pending_dm_response':
        return SuggestionType.pendingDmResponse;
      case 'inactive_channel':
        return SuggestionType.inactiveChannel;
      // Analytics suggestions
      case 'weekly_report_ready':
        return SuggestionType.weeklyReportReady;
      case 'productivity_milestone':
        return SuggestionType.productivityMilestone;
      case 'productivity_trend_down':
        return SuggestionType.productivityTrendDown;
      default:
        return SuggestionType.taskBalance;
    }
  }
}

/// Extension to parse suggestion priority from string
extension SuggestionPriorityExtension on SuggestionPriority {
  static SuggestionPriority fromString(String value) {
    switch (value.toLowerCase()) {
      case 'high':
        return SuggestionPriority.high;
      case 'medium':
        return SuggestionPriority.medium;
      case 'low':
        return SuggestionPriority.low;
      default:
        return SuggestionPriority.low;
    }
  }
}

/// Task distribution member data
class TaskDistributionMember {
  final String userId;
  final String userName;
  final String? userAvatar;
  final int taskCount;

  TaskDistributionMember({
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.taskCount,
  });

  factory TaskDistributionMember.fromJson(Map<String, dynamic> json) {
    return TaskDistributionMember(
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? '',
      userAvatar: json['userAvatar'],
      taskCount: json['taskCount'] ?? 0,
    );
  }
}

/// Meeting suggestion data
class MeetingSuggestionData {
  final String id;
  final String title;
  final String status;
  final String callType;
  final String? scheduledStartTime;
  final String? scheduledEndTime;
  final int? minutesUntilStart;

  MeetingSuggestionData({
    required this.id,
    required this.title,
    required this.status,
    required this.callType,
    this.scheduledStartTime,
    this.scheduledEndTime,
    this.minutesUntilStart,
  });

  factory MeetingSuggestionData.fromJson(Map<String, dynamic> json) {
    return MeetingSuggestionData(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      status: json['status'] ?? '',
      callType: json['callType'] ?? 'video',
      scheduledStartTime: json['scheduledStartTime'],
      scheduledEndTime: json['scheduledEndTime'],
      minutesUntilStart: json['minutesUntilStart'],
    );
  }
}

/// Unread chat data
class UnreadChatData {
  final String id;
  final String name;
  final String type; // 'channel' or 'conversation'
  final int unreadCount;
  final bool? isPrivate;

  UnreadChatData({
    required this.id,
    required this.name,
    required this.type,
    required this.unreadCount,
    this.isPrivate,
  });

  factory UnreadChatData.fromJson(Map<String, dynamic> json) {
    return UnreadChatData(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? 'channel',
      unreadCount: json['unreadCount'] ?? 0,
      isPrivate: json['isPrivate'],
    );
  }
}

/// Project suggestion data
class ProjectSuggestionData {
  final String projectId;
  final String projectName;
  final int? progress;
  final String? dueDate;
  final int? daysUntilDue;
  final int? daysOverdue;
  final int? completedTasks;
  final int? totalTasks;
  final int? overdueTasks;
  final String? riskLevel;
  final String? lastActivity;
  final int? daysSinceActivity;

  ProjectSuggestionData({
    required this.projectId,
    required this.projectName,
    this.progress,
    this.dueDate,
    this.daysUntilDue,
    this.daysOverdue,
    this.completedTasks,
    this.totalTasks,
    this.overdueTasks,
    this.riskLevel,
    this.lastActivity,
    this.daysSinceActivity,
  });

  factory ProjectSuggestionData.fromJson(Map<String, dynamic> json) {
    return ProjectSuggestionData(
      projectId: json['projectId'] ?? '',
      projectName: json['projectName'] ?? '',
      progress: json['progress'],
      dueDate: json['dueDate'],
      daysUntilDue: json['daysUntilDue'],
      daysOverdue: json['daysOverdue'],
      completedTasks: json['completedTasks'],
      totalTasks: json['totalTasks'],
      overdueTasks: json['overdueTasks'],
      riskLevel: json['riskLevel'],
      lastActivity: json['lastActivity'],
      daysSinceActivity: json['daysSinceActivity'],
    );
  }
}

/// Team suggestion data
class TeamSuggestionData {
  final String? userId;
  final String? userName;
  final String? userAvatar;
  final String? lastActive;
  final int? daysSinceActive;
  final int? tasksCompleted;
  final int? previousTasksCompleted;
  final String? celebrationReason;

  TeamSuggestionData({
    this.userId,
    this.userName,
    this.userAvatar,
    this.lastActive,
    this.daysSinceActive,
    this.tasksCompleted,
    this.previousTasksCompleted,
    this.celebrationReason,
  });

  factory TeamSuggestionData.fromJson(Map<String, dynamic> json) {
    return TeamSuggestionData(
      userId: json['userId'],
      userName: json['userName'],
      userAvatar: json['userAvatar'],
      lastActive: json['lastActive'],
      daysSinceActive: json['daysSinceActive'],
      tasksCompleted: json['tasksCompleted'],
      previousTasksCompleted: json['previousTasksCompleted'],
      celebrationReason: json['celebrationReason'],
    );
  }
}

/// Calendar suggestion data
class CalendarSuggestionData {
  final String? eventId;
  final String? eventTitle;
  final String? startTime;
  final String? endTime;
  final String? conflictingEventId;
  final String? conflictingEventTitle;
  final int? attendeeCount;
  final String? location;
  final bool? isRecurring;
  final int? minutesUntilStart;

  CalendarSuggestionData({
    this.eventId,
    this.eventTitle,
    this.startTime,
    this.endTime,
    this.conflictingEventId,
    this.conflictingEventTitle,
    this.attendeeCount,
    this.location,
    this.isRecurring,
    this.minutesUntilStart,
  });

  factory CalendarSuggestionData.fromJson(Map<String, dynamic> json) {
    return CalendarSuggestionData(
      eventId: json['eventId'],
      eventTitle: json['eventTitle'],
      startTime: json['startTime'],
      endTime: json['endTime'],
      conflictingEventId: json['conflictingEventId'],
      conflictingEventTitle: json['conflictingEventTitle'],
      attendeeCount: json['attendeeCount'],
      location: json['location'],
      isRecurring: json['isRecurring'],
      minutesUntilStart: json['minutesUntilStart'],
    );
  }
}

/// File suggestion data
class FileSuggestionData {
  final String? fileId;
  final String? fileName;
  final int? fileSize;
  final int? storageUsed;
  final int? storageLimit;
  final int? usagePercentage;
  final int? fileCount;

  FileSuggestionData({
    this.fileId,
    this.fileName,
    this.fileSize,
    this.storageUsed,
    this.storageLimit,
    this.usagePercentage,
    this.fileCount,
  });

  factory FileSuggestionData.fromJson(Map<String, dynamic> json) {
    return FileSuggestionData(
      fileId: json['fileId'],
      fileName: json['fileName'],
      fileSize: json['fileSize'],
      storageUsed: json['storageUsed'],
      storageLimit: json['storageLimit'],
      usagePercentage: json['usagePercentage'],
      fileCount: json['fileCount'],
    );
  }
}

/// Note suggestion data
class NoteSuggestionData {
  final String? noteId;
  final String? noteTitle;
  final String? lastModified;
  final int? daysSinceUpdate;
  final int? noteCount;
  final int? unorganizedCount;

  NoteSuggestionData({
    this.noteId,
    this.noteTitle,
    this.lastModified,
    this.daysSinceUpdate,
    this.noteCount,
    this.unorganizedCount,
  });

  factory NoteSuggestionData.fromJson(Map<String, dynamic> json) {
    return NoteSuggestionData(
      noteId: json['noteId'],
      noteTitle: json['noteTitle'],
      lastModified: json['lastModified'],
      daysSinceUpdate: json['daysSinceUpdate'],
      noteCount: json['noteCount'],
      unorganizedCount: json['unorganizedCount'],
    );
  }
}

/// Suggestion metadata
class SuggestionMetadata {
  final String? projectId;
  final String? projectName;
  final TaskDistributionMember? overloaded;
  final TaskDistributionMember? underloaded;
  final MeetingSuggestionData? meeting;
  final UnreadChatData? chat;
  final FileSuggestionData? file;
  final CalendarSuggestionData? calendar;
  final NoteSuggestionData? note;
  final ProjectSuggestionData? project;
  final TeamSuggestionData? team;
  final String? taskId;
  final String? taskTitle;
  final String? dueDate;
  final int? daysOverdue;
  final String? aiRecommendation;

  SuggestionMetadata({
    this.projectId,
    this.projectName,
    this.overloaded,
    this.underloaded,
    this.meeting,
    this.chat,
    this.file,
    this.calendar,
    this.note,
    this.project,
    this.team,
    this.taskId,
    this.taskTitle,
    this.dueDate,
    this.daysOverdue,
    this.aiRecommendation,
  });

  factory SuggestionMetadata.fromJson(Map<String, dynamic> json) {
    return SuggestionMetadata(
      projectId: json['projectId'],
      projectName: json['projectName'],
      overloaded: json['overloaded'] != null
          ? TaskDistributionMember.fromJson(json['overloaded'])
          : null,
      underloaded: json['underloaded'] != null
          ? TaskDistributionMember.fromJson(json['underloaded'])
          : null,
      meeting: json['meeting'] != null
          ? MeetingSuggestionData.fromJson(json['meeting'])
          : null,
      chat: json['chat'] != null
          ? UnreadChatData.fromJson(json['chat'])
          : null,
      file: json['file'] != null
          ? FileSuggestionData.fromJson(json['file'])
          : null,
      calendar: json['calendar'] != null
          ? CalendarSuggestionData.fromJson(json['calendar'])
          : null,
      note: json['note'] != null
          ? NoteSuggestionData.fromJson(json['note'])
          : null,
      project: json['project'] != null
          ? ProjectSuggestionData.fromJson(json['project'])
          : null,
      team: json['team'] != null
          ? TeamSuggestionData.fromJson(json['team'])
          : null,
      taskId: json['taskId'],
      taskTitle: json['taskTitle'],
      dueDate: json['dueDate'],
      daysOverdue: json['daysOverdue'],
      aiRecommendation: json['aiRecommendation'],
    );
  }
}

/// Single suggestion item
class Suggestion {
  final String id;
  final SuggestionType type;
  final SuggestionPriority priority;
  final String title;
  final String description;
  final String? actionLabel;
  final String? actionUrl;
  final SuggestionMetadata? metadata;
  final DateTime createdAt;

  Suggestion({
    required this.id,
    required this.type,
    required this.priority,
    required this.title,
    required this.description,
    this.actionLabel,
    this.actionUrl,
    this.metadata,
    required this.createdAt,
  });

  factory Suggestion.fromJson(Map<String, dynamic> json) {
    return Suggestion(
      id: json['id'] ?? '',
      type: SuggestionTypeExtension.fromString(json['type'] ?? 'task_balance'),
      priority: SuggestionPriorityExtension.fromString(json['priority'] ?? 'low'),
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      actionLabel: json['actionLabel'],
      actionUrl: json['actionUrl'],
      metadata: json['metadata'] != null
          ? SuggestionMetadata.fromJson(json['metadata'])
          : null,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}

/// Suggestions response from API
class SuggestionsResponse {
  final List<Suggestion> suggestions;
  final int totalCount;
  final DateTime generatedAt;

  SuggestionsResponse({
    required this.suggestions,
    required this.totalCount,
    required this.generatedAt,
  });

  factory SuggestionsResponse.fromJson(Map<String, dynamic> json) {
    return SuggestionsResponse(
      suggestions: (json['suggestions'] as List?)
          ?.map((s) => Suggestion.fromJson(s))
          .toList() ?? [],
      totalCount: json['totalCount'] ?? 0,
      generatedAt: DateTime.tryParse(json['generatedAt'] ?? '') ?? DateTime.now(),
    );
  }
}
