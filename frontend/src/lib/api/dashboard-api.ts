// src/lib/api/dashboard-api.ts
import { api } from '@/lib/fetch';
import { useQuery } from '@tanstack/react-query';

// Types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalMessages: number;
  totalFiles: number;
  storageUsed: number;
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

export interface DashboardResponse {
  metrics: DashboardMetrics;
  recentActivity: any;
  activityTrend: any;
  teamProductivity: any;
  projectAnalytics: any;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'task' | 'file' | 'project' | 'meeting';
  title: string;
  description: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
}

export interface QuickStat {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

// Suggestion Types
export type SuggestionType =
  | 'task_balance'
  | 'meeting'
  | 'unread_message'
  | 'note_update'
  | 'overdue_task'
  | 'upcoming_deadline';

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

export interface Suggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  metadata?: {
    projectId?: string;
    projectName?: string;
    overloaded?: TaskDistributionMember;
    underloaded?: TaskDistributionMember;
    meeting?: MeetingSuggestionData;
    chat?: UnreadChatData;
    taskId?: string;
    taskTitle?: string;
    dueDate?: string;
    daysOverdue?: number;
    [key: string]: any;
  };
  createdAt: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  totalCount: number;
  generatedAt: string;
}

// Query Keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (workspaceId: string) => [...dashboardKeys.all, 'stats', workspaceId] as const,
  activity: (workspaceId: string) => [...dashboardKeys.all, 'activity', workspaceId] as const,
  quickStats: (workspaceId: string) => [...dashboardKeys.all, 'quickStats', workspaceId] as const,
  suggestions: (workspaceId: string) => [...dashboardKeys.all, 'suggestions', workspaceId] as const,
};

// API Functions
export const dashboardApi = {
  async getDashboard(workspaceId: string, params?: { startDate?: string; endDate?: string; limit?: number }): Promise<DashboardResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    return api.get<DashboardResponse>(`/workspaces/${workspaceId}/dashboard${queryString ? `?${queryString}` : ''}`);
  },

  async getStats(workspaceId: string): Promise<DashboardStats> {
    return api.get<DashboardStats>(`/workspaces/${workspaceId}/dashboard/stats`);
  },

  async getActivity(workspaceId: string, limit = 20): Promise<ActivityItem[]> {
    return api.get<ActivityItem[]>(`/workspaces/${workspaceId}/dashboard/activity?limit=${limit}`);
  },

  async getQuickStats(workspaceId: string): Promise<QuickStat[]> {
    return api.get<QuickStat[]>(`/workspaces/${workspaceId}/dashboard/quick-stats`);
  },

  async getSuggestions(workspaceId: string, language: string = 'en'): Promise<SuggestionsResponse> {
    return api.get<SuggestionsResponse>(`/workspaces/${workspaceId}/dashboard/suggestions?language=${language}`);
  },
};

// React Query Hooks
export const useDashboardStats = (workspaceId: string) => {
  return useQuery({
    queryKey: dashboardKeys.stats(workspaceId),
    queryFn: () => dashboardApi.getStats(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useDashboardActivity = (workspaceId: string, limit = 20) => {
  return useQuery({
    queryKey: [...dashboardKeys.activity(workspaceId), limit],
    queryFn: () => dashboardApi.getActivity(workspaceId, limit),
    enabled: !!workspaceId,
  });
};

export const useDashboardQuickStats = (workspaceId: string) => {
  return useQuery({
    queryKey: dashboardKeys.quickStats(workspaceId),
    queryFn: () => dashboardApi.getQuickStats(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useDashboard = (workspaceId: string, params?: { startDate?: string; endDate?: string; limit?: number }) => {
  return useQuery({
    queryKey: [...dashboardKeys.all, workspaceId, params],
    queryFn: () => dashboardApi.getDashboard(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSuggestions = (workspaceId: string, language: string = 'en') => {
  return useQuery({
    queryKey: [...dashboardKeys.suggestions(workspaceId), language],
    queryFn: () => dashboardApi.getSuggestions(workspaceId, language),
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds - suggestions should be relatively fresh
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// Backward compatibility: export as dashboardService
export const dashboardService = dashboardApi;
