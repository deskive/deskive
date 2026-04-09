import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export enum DashboardPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

export class GetDashboardDto {
  @ApiProperty({ 
    description: 'Start date for dashboard data', 
    example: '2023-01-01T00:00:00.000Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: 'End date for dashboard data', 
    example: '2023-12-31T23:59:59.999Z',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    description: 'Time period for aggregation', 
    enum: DashboardPeriod,
    example: DashboardPeriod.DAY,
    required: false 
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.DAY;

  @ApiProperty({ 
    description: 'Limit for activity items', 
    example: 10,
    required: false 
  })
  @IsOptional()
  limit?: number = 10;
}

export interface DashboardMetrics {
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalTeamMembers: number;
    activeTeamMembers: number;
    totalMessages: number;
    totalEvents: number;
    totalFiles: number;
    totalVideoCalls: number;
    storageUsed: number;
    integrations: number;
  };
  today: {
    messagesCount: number;
    filesUploaded: number;
    tasksCompleted: number;
    videoCallsCount: number;
  };
  productivity: {
    tasksCompletedToday: number;
    tasksCompletedThisWeek: number;
    tasksCompletedThisMonth: number;
    averageTaskCompletionTime: number;
    projectCompletionRate: number;
  };
  engagement: {
    messagesPerDay: number;
    filesSharedPerDay: number;
    activeUsersToday: number;
    activeUsersThisWeek: number;
    meetingsScheduled: number;
  };
  trends: {
    taskCompletionTrend: number;
    teamEngagementTrend: number;
    projectProgressTrend: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: 'project_created' | 'task_completed' | 'member_added' | 'file_uploaded' | 'note_created';
  title: string;
  description?: string;
  user: {
    id: string;
    name?: string;
    email: string;
  };
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ActivityTrendPoint {
  date: string;
  count: number;
  type?: string;
}

export interface TeamProductivityData {
  userId: string;
  userName: string;
  userEmail: string;
  completedTasks: number;
  createdProjects: number;
  uploadedFiles: number;
  createdNotes: number;
  totalActivity: number;
}

export interface ProjectAnalyticsData {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  memberCount: number;
  createdAt: string;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  recentActivity: any; // Will contain { activities: [], total: number, hasMore: boolean }
  activityTrend: any; // Will contain { data: [], period: string, summary: {...} }
  teamProductivity: any; // Will contain { members: [], teamStats: {...}, topPerformers: [] }
  projectAnalytics: any; // Will contain { projects: [], summary: {...}, trends: {...} }
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Agentic Suggestions Types
export type SuggestionType =
  | 'task_balance'
  | 'meeting'
  | 'unread_message'
  | 'note_update'
  | 'overdue_task'
  | 'upcoming_deadline'
  // File module suggestions
  | 'storage_warning'
  | 'file_sharing'
  | 'orphaned_files'
  | 'large_files'
  // Calendar module suggestions
  | 'calendar_conflict'
  | 'upcoming_event'
  | 'missed_event'
  | 'event_reminder'
  // Note module suggestions
  | 'stale_note'
  | 'unorganized_notes'
  | 'note_template'
  // Project module suggestions
  | 'project_at_risk'
  | 'milestone_deadline'
  | 'inactive_project'
  | 'project_completion'
  // Activity/Team suggestions
  | 'inactive_member'
  | 'engagement_drop'
  | 'team_celebration'
  // Sprint/Agile suggestions
  | 'sprint_ending_soon'
  | 'sprint_velocity_drop'
  | 'sprint_no_tasks'
  | 'sprint_retrospective'
  | 'backlog_grooming'
  // Billing/Subscription suggestions
  | 'subscription_expiring'
  | 'payment_method_expiring'
  | 'usage_limit_approaching'
  | 'upgrade_recommendation'
  // Chat/Mentions suggestions
  | 'unanswered_mention'
  | 'pending_dm_response'
  | 'inactive_channel'
  // Analytics/Insights suggestions
  | 'weekly_report_ready'
  | 'productivity_milestone'
  | 'productivity_trend_down'
  | 'team_achievement';

export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface TaskDistributionMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  taskCount: number;
}

export interface MeetingSuggestionData {
  id: string;
  title: string;
  status: string;
  callType: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  minutesUntilStart?: number;
}

export interface UnreadChatData {
  id: string;
  name: string;
  type: 'channel' | 'conversation';
  unreadCount: number;
  isPrivate?: boolean;
}

// File suggestion metadata
export interface FileSuggestionData {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  folderId?: string;
  folderName?: string;
  storageUsed?: number;
  storageLimit?: number;
  usagePercentage?: number;
  fileCount?: number;
  oldestFileDate?: string;
}

// Calendar suggestion metadata
export interface CalendarSuggestionData {
  eventId?: string;
  eventTitle?: string;
  startTime?: string;
  endTime?: string;
  conflictingEventId?: string;
  conflictingEventTitle?: string;
  attendeeCount?: number;
  location?: string;
  isRecurring?: boolean;
  minutesUntilStart?: number;
}

// Note suggestion metadata
export interface NoteSuggestionData {
  noteId?: string;
  noteTitle?: string;
  lastModified?: string;
  daysSinceUpdate?: number;
  noteCount?: number;
  unorganizedCount?: number;
  templateId?: string;
  templateName?: string;
}

// Project suggestion metadata
export interface ProjectSuggestionData {
  projectId: string;
  projectName: string;
  progress?: number;
  dueDate?: string;
  daysUntilDue?: number;
  daysOverdue?: number;
  completedTasks?: number;
  totalTasks?: number;
  overdueTasks?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  lastActivity?: string;
  daysSinceActivity?: number;
  milestoneId?: string;
  milestoneName?: string;
}

// Team/Activity suggestion metadata
export interface TeamSuggestionData {
  userId?: string;
  userName?: string;
  userAvatar?: string;
  lastActive?: string;
  daysSinceActive?: number;
  tasksCompleted?: number;
  previousTasksCompleted?: number;
  engagementScore?: number;
  previousEngagementScore?: number;
  celebrationReason?: string;
}

// Sprint/Agile suggestion metadata
export interface SprintSuggestionData {
  sprintId?: string;
  sprintName?: string;
  projectId?: string;
  projectName?: string;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  totalTasks?: number;
  completedTasks?: number;
  incompleteTasks?: number;
  completionPercentage?: number;
  velocity?: number;
  previousVelocity?: number;
  velocityChange?: number;
  backlogItemCount?: number;
}

// Billing/Subscription suggestion metadata
export interface BillingSuggestionData {
  subscriptionId?: string;
  planName?: string;
  planTier?: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
  paymentMethodLast4?: string;
  paymentMethodExpiry?: string;
  currentUsage?: number;
  usageLimit?: number;
  usagePercentage?: number;
  usageType?: 'storage' | 'ai_credits' | 'seats' | 'api_calls';
  recommendedPlan?: string;
  savingsAmount?: number;
}

// Chat/Mentions suggestion metadata
export interface ChatMentionSuggestionData {
  messageId?: string;
  channelId?: string;
  channelName?: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  messagePreview?: string;
  mentionedAt?: string;
  hoursSinceMention?: number;
  unreadCount?: number;
  lastActivityDate?: string;
  daysSinceActivity?: number;
}

// Analytics/Insights suggestion metadata
export interface AnalyticsSuggestionData {
  reportType?: 'daily' | 'weekly' | 'monthly';
  reportPeriod?: string;
  reportUrl?: string;
  metricName?: string;
  currentValue?: number;
  previousValue?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  milestoneType?: string;
  milestoneValue?: number;
  achievementType?: string;
  achievementDescription?: string;
  teamSize?: number;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: {
    // Task balance
    projectId?: string;
    projectName?: string;
    overloaded?: TaskDistributionMember;
    underloaded?: TaskDistributionMember;
    // Meeting
    meeting?: MeetingSuggestionData;
    // Chat
    chat?: UnreadChatData;
    // File
    file?: FileSuggestionData;
    // Calendar
    calendar?: CalendarSuggestionData;
    // Note
    note?: NoteSuggestionData;
    // Project
    project?: ProjectSuggestionData;
    // Team/Activity
    team?: TeamSuggestionData;
    // Sprint/Agile
    sprint?: SprintSuggestionData;
    // Billing/Subscription
    billing?: BillingSuggestionData;
    // Chat/Mentions
    mention?: ChatMentionSuggestionData;
    // Analytics
    analytics?: AnalyticsSuggestionData;
    // AI recommendation
    aiRecommendation?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  totalCount: number;
  generatedAt: string;
}