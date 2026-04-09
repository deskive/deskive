// src/lib/api/analytics-api.ts
import { api } from '@/lib/fetch';
import { useQuery } from '@tanstack/react-query';

// Types
export interface AnalyticsData {
  period: string;
  metrics: {
    users: number;
    sessions: number;
    pageViews: number;
    avgSessionDuration: number;
  };
}

export interface UserAnalytics {
  userId: string;
  sessions: number;
  lastActive: string;
  totalTime: number;
}

export interface WorkspaceAnalytics {
  workspaceId: string;
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    storageUsed: number;
  };
  activity: {
    peakActivityHour: number;
    peakActivityDay: string;
    averageSessionDuration: number;
  };
  growth: {
    userGrowthRate: number;
    projectGrowthRate: number;
    taskCompletionRate: number;
    engagementRate: number;
    contentGrowthRate: number;
  };
  trends: {
    userActivityTrend: number[];
    projectProgressTrend: number[];
    productivityTrend: number[];
  };
  topPerformers: {
    mostActiveUsers: Array<{
      userId: string;
      userName: string;
      activityCount: number;
      score: number;
    }>;
    mostProductiveProjects: Array<{
      projectId: string;
      projectName: string;
      completionRate: number;
      taskCount: number;
    }>;
  };
}

export interface AnalyticsDateRange {
  start: string;
  end: string;
  period: 'day' | 'week' | 'month';
}

export interface FileAnalytics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  storageUsed: number;
  storageLimit: number;
  recentUploads: number;
  largestFiles: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  // Nested objects for AnalyticsPage compatibility
  overview?: {
    totalFiles: number;
    totalSize: number;
    storageUsed: number;
    storageLimit: number;
    storagePercentage: number;
    storageUtilization?: number;
    duplicateFiles?: number;
  };
  types?: {
    distribution: Array<{
      type: string;
      count: number;
      size: number;
      percentage: number;
    }>;
  };
  activity?: {
    uploadsPerDay: Array<{
      date: string;
      count: number;
      size: number;
    }>;
    downloadsPerDay?: number[];
    sharesPerDay?: number[];
    recentUploads: number;
  };
}

export interface CalendarAnalytics {
  overview: {
    totalEvents: number;
    meetingsHeld: number;
    averageMeetingDuration: number;
    noShowRate: number;
    cancelledEvents: number;
    totalMeetingTime: number;
    recurringEvents: number;
  };
  patterns: {
    busyHours: Array<{
      hour: number;
      eventCount: number;
      utilizationRate: number;
    }>;
    busyDays: Array<{
      dayOfWeek: string;
      eventCount: number;
      averageDuration: number;
    }>;
    peakMeetingDays: string[];
  };
  meetings: {
    averageAttendees: number;
    onTimeRate: number;
    completionRate: number;
    productivityScore: number;
  };
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  overview: {
    totalMembers: number;
    activeMembers: number;
  };
  productivity: {
    teamVelocity: number;
    qualityScore: number;
    sprintCompletion: number;
    cycleTime: number;
    throughput: number;
  };
  collaboration: {
    meetingEfficiency: number;
    communicationScore: number;
    communicationFrequency: number;
    collaborationRate: number;
    knowledgeSharing: number;
  };
  health?: {
    satisfactionScore: number;
    wellnessMetrics: {
      workLifeBalance: number;
      jobSatisfaction: number;
      stressLevel: number;
    };
    retentionRisk: number;
  };
}

// Query Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  workspace: (workspaceId: string, period: string) => [...analyticsKeys.all, workspaceId, period] as const,
  users: (workspaceId: string) => [...analyticsKeys.all, 'users', workspaceId] as const,
};

// API Functions
export const analyticsApi = {
  async getWorkspaceAnalytics(workspaceId: string, dateRange?: AnalyticsDateRange | string): Promise<WorkspaceAnalytics> {
    const params = typeof dateRange === 'string' ? `?period=${dateRange}` : dateRange ? `?start=${dateRange.start}&end=${dateRange.end}&period=${dateRange.period}` : '';
    return api.get<WorkspaceAnalytics>(`/workspaces/${workspaceId}/analytics${params}`);
  },

  async getUserAnalytics(workspaceId: string): Promise<UserAnalytics[]> {
    return api.get<UserAnalytics[]>(`/workspaces/${workspaceId}/analytics/users`);
  },

  async getTeamPerformance(workspaceId: string, dateRange?: AnalyticsDateRange): Promise<TeamPerformance> {
    const params = dateRange ? `?start=${dateRange.start}&end=${dateRange.end}&period=${dateRange.period}` : '';
    return api.get<TeamPerformance>(`/workspaces/${workspaceId}/analytics/team-performance${params}`);
  },

  async getFileAnalytics(workspaceId: string, dateRange?: AnalyticsDateRange): Promise<FileAnalytics> {
    const params = dateRange ? `?start=${dateRange.start}&end=${dateRange.end}&period=${dateRange.period}` : '';
    return api.get<FileAnalytics>(`/workspaces/${workspaceId}/analytics/files${params}`);
  },

  async getCalendarAnalytics(workspaceId: string, dateRange?: AnalyticsDateRange): Promise<CalendarAnalytics> {
    const params = dateRange ? `?start=${dateRange.start}&end=${dateRange.end}&period=${dateRange.period}` : '';
    return api.get<CalendarAnalytics>(`/workspaces/${workspaceId}/analytics/calendar${params}`);
  },

  async exportAnalyticsData(
    workspaceId: string,
    type: string,
    format: 'csv' | 'xlsx' | 'pdf' | 'excel',
    dateRange?: AnalyticsDateRange,
    options?: { includeCharts?: boolean }
  ): Promise<Blob> {
    const params = new URLSearchParams({ format, type });
    if (dateRange) {
      params.append('start', dateRange.start);
      params.append('end', dateRange.end);
      params.append('period', dateRange.period);
    }
    if (options?.includeCharts) {
      params.append('includeCharts', 'true');
    }
    return api.get(`/workspaces/${workspaceId}/analytics/export?${params.toString()}`, {
      headers: { Accept: 'application/octet-stream' }
    }) as any;
  },
};

// React Query Hooks
export const useWorkspaceAnalytics = (workspaceId: string, period = '7d') => {
  return useQuery({
    queryKey: analyticsKeys.workspace(workspaceId, period),
    queryFn: () => analyticsApi.getWorkspaceAnalytics(workspaceId, period),
    enabled: !!workspaceId,
  });
};

export const useUserAnalytics = (workspaceId: string) => {
  return useQuery({
    queryKey: analyticsKeys.users(workspaceId),
    queryFn: () => analyticsApi.getUserAnalytics(workspaceId),
    enabled: !!workspaceId,
  });
};

// Backward compatibility: export as analyticsService
export const analyticsService = analyticsApi;
