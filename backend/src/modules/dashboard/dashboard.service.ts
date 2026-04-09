import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import {
  GetDashboardDto,
  DashboardResponse,
  DashboardMetrics,
  DashboardActivity,
  ActivityTrendPoint,
  TeamProductivityData,
  ProjectAnalyticsData,
  Suggestion,
  SuggestionsResponse,
  TaskDistributionMember
} from './dto';
import { LangChainSuggestionsService, UserContextData } from './langchain-suggestions.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly db: DatabaseService,
    private langchainSuggestionsService: LangChainSuggestionsService,
  ) { }

  async getDashboardData(workspaceId: string, userId: string, query: GetDashboardDto): Promise<DashboardResponse> {
    // Verify user has access to this workspace
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const now = new Date();
    const startDate = query.startDate ? new Date(query.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = query.endDate ? new Date(query.endDate) : now;

    // Fetch all dashboard data in parallel
    const [
      metrics,
      recentActivity,
      activityTrend,
      teamProductivity,
      projectAnalytics
    ] = await Promise.all([
      this.getMetrics(workspaceId, startDate, endDate),
      this.getRecentActivity(workspaceId, query.limit || 10, startDate, endDate),
      this.getActivityTrend(workspaceId, startDate, endDate),
      this.getTeamProductivity(workspaceId, startDate, endDate),
      this.getProjectAnalytics(workspaceId, startDate, endDate)
    ]);

    return {
      metrics,
      recentActivity,
      activityTrend,
      teamProductivity,
      projectAnalytics,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };
  }

  private async verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
    const membershipResult = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true
    });

    if (!membershipResult) {
      throw new NotFoundException('Workspace not found or access denied');
    }
  }

  /**
   * Check if user is workspace owner or admin
   */
  private async isWorkspaceOwnerOrAdmin(workspaceId: string, userId: string): Promise<boolean> {
    // Check if user is workspace owner
    const workspaceResult = await this.db.findOne('workspaces', { id: workspaceId });
    if (workspaceResult && (workspaceResult as any).owner_id === userId) {
      return true;
    }

    // Check if user has admin role in workspace
    const membershipResult = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true
    });

    if (membershipResult) {
      const role = (membershipResult as any).role?.toLowerCase();
      return role === 'owner' || role === 'admin';
    }

    return false;
  }

  private async getMetrics(workspaceId: string, startDate: Date, endDate: Date): Promise<DashboardMetrics> {
    try {
      // Get total counts from all relevant tables
      // First get channels for this workspace to query messages
      const channelsResult = await this.db.table('channels')
        .select('id')
        .where('workspace_id', '=', workspaceId)
        .execute()
        .catch(() => ({ data: [] }));

      const channelIds = Array.isArray(channelsResult.data)
        ? channelsResult.data.map((c: any) => c.id)
        : [];

      // First get projects for this workspace to get project IDs
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = projectsResult.data || [];
      const projectIds = projects.map((p: any) => p.id);

      // Now fetch all other data in parallel
      const [tasksResult, membersResult, filesResult, notesResult, messagesResult, eventsResult, videoCallsResult] = await Promise.all([
        // Tasks: get by project IDs (tasks don't have workspace_id, they have project_id)
        projectIds.length > 0
          ? this.db.table('tasks')
            .select('*')
            .execute()
            .then(result => {
              const allTasks = Array.isArray(result.data) ? result.data : [];
              return { data: allTasks.filter(t => projectIds.includes(t.project_id)) };
            })
            .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        this.db.findMany('workspace_members', { workspace_id: workspaceId, is_active: true }),
        this.db.findMany('files', { workspace_id: workspaceId }),
        this.db.findMany('notes', { workspace_id: workspaceId }),
        // Messages: query by channel IDs
        channelIds.length > 0
          ? this.db.table('messages')
            .select('*')
            .execute()
            .then(result => {
              const allMessages = Array.isArray(result.data) ? result.data : [];
              return { data: allMessages.filter(m => channelIds.includes(m.channel_id)) };
            })
            .catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        // Events: query all and filter by workspace (or skip if table doesn't exist)
        this.db.table('calendar_events')
          .select('*')
          .execute()
          .then(result => {
            const allEvents = Array.isArray(result.data) ? result.data : [];
            return { data: allEvents.filter(e => e.workspace_id === workspaceId) };
          })
          .catch(() => ({ data: [] })),
        // Video calls: query all and filter by workspace (or skip if table doesn't exist)
        this.db.table('video_calls')
          .select('*')
          .execute()
          .then(result => {
            const allCalls = Array.isArray(result.data) ? result.data : [];
            return { data: allCalls.filter(vc => vc.workspace_id === workspaceId) };
          })
          .catch(() => ({ data: [] }))
      ]);

      // projects is already defined earlier
      const tasks = tasksResult.data || [];
      const members = membersResult.data || [];
      const files = filesResult.data || [];
      const notes = notesResult.data || [];
      const messages = messagesResult.data || [];
      const events = eventsResult.data || [];
      const videoCalls = videoCallsResult.data || [];

      const activeProjects = projects.filter(p => p.status === 'active' || !p.status).length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate active members (those who have activity in the date range)
      const activeMembers = members.length; // For now, assume all members are active

      // Calculate tasks completed in different periods
      const todayDate = new Date();
      const weekAgo = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(todayDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const tasksCompletedToday = tasks.filter(task => {
        if (task.status !== 'completed' || !task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate.toDateString() === todayDate.toDateString();
      }).length;

      const tasksCompletedThisWeek = tasks.filter(task => {
        if (task.status !== 'completed' || !task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate >= weekAgo;
      }).length;

      const tasksCompletedThisMonth = tasks.filter(task => {
        if (task.status !== 'completed' || !task.completed_at) return false;
        const completedDate = new Date(task.completed_at);
        return completedDate >= monthAgo;
      }).length;

      // Calculate pending tasks
      const pendingTasks = tasks.filter(task =>
        task.status !== 'completed' && task.status !== 'cancelled'
      ).length;

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesToday = messages.filter(msg => {
        const msgDate = new Date(msg.created_at);
        return msgDate >= today;
      }).length;

      const filesUploadedToday = files.filter(file => {
        const fileDate = new Date(file.created_at);
        return fileDate >= today;
      }).length;

      const videoCallsToday = videoCalls.filter(call => {
        const callDate = new Date(call.created_at);
        return callDate >= today;
      }).length;

      // Return the properly structured DashboardMetrics object matching the DTO
      return {
        summary: {
          totalProjects: projects.length,
          activeProjects: activeProjects,
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          pendingTasks: pendingTasks,
          totalTeamMembers: members.length,
          activeTeamMembers: activeMembers,
          totalMessages: messages.length,
          totalEvents: events.length,
          totalFiles: files.length,
          totalVideoCalls: videoCalls.length,
          storageUsed: files.reduce((total, file) => total + (parseInt(file.size) || 0), 0),
          integrations: 0 // Will be implemented when we have integrations
        },
        today: {
          messagesCount: messagesToday,
          filesUploaded: filesUploadedToday,
          tasksCompleted: tasksCompletedToday,
          videoCallsCount: videoCallsToday
        },
        productivity: {
          tasksCompletedToday: tasksCompletedToday,
          tasksCompletedThisWeek: tasksCompletedThisWeek,
          tasksCompletedThisMonth: tasksCompletedThisMonth,
          averageTaskCompletionTime: 24.5, // Mock value for now
          projectCompletionRate: completionRate
        },
        engagement: {
          messagesPerDay: 0, // Will be implemented
          filesSharedPerDay: files.length > 0 ? Math.round((files.length / 30) * 100) / 100 : 0,
          activeUsersToday: Math.min(members.length, 5), // Mock value
          activeUsersThisWeek: activeMembers,
          meetingsScheduled: 0 // Will be implemented
        },
        trends: {
          taskCompletionTrend: 12.5, // Mock positive trend
          teamEngagementTrend: 8.3, // Mock positive trend
          projectProgressTrend: 15.2 // Mock positive trend
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default metrics structure matching the DTO
      return {
        summary: {
          totalProjects: 0,
          activeProjects: 0,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          totalTeamMembers: 0,
          activeTeamMembers: 0,
          totalMessages: 0,
          totalEvents: 0,
          totalFiles: 0,
          totalVideoCalls: 0,
          storageUsed: 0,
          integrations: 0
        },
        today: {
          messagesCount: 0,
          filesUploaded: 0,
          tasksCompleted: 0,
          videoCallsCount: 0
        },
        productivity: {
          tasksCompletedToday: 0,
          tasksCompletedThisWeek: 0,
          tasksCompletedThisMonth: 0,
          averageTaskCompletionTime: 0,
          projectCompletionRate: 0
        },
        engagement: {
          messagesPerDay: 0,
          filesSharedPerDay: 0,
          activeUsersToday: 0,
          activeUsersThisWeek: 0,
          meetingsScheduled: 0
        },
        trends: {
          taskCompletionTrend: 0,
          teamEngagementTrend: 0,
          projectProgressTrend: 0
        }
      };
    }
  }

  private async getRecentActivity(workspaceId: string, limit: number, startDate: Date, endDate: Date): Promise<any> {
    try {
      // For now, return mock data in the format expected by the frontend
      // The frontend expects { activities: ActivityItem[], total: number, hasMore: boolean }
      const mockActivities = [
        {
          id: '1',
          type: 'task_completed',
          title: 'Task completed',
          description: 'Completed project setup task',
          userId: 'user1',
          userName: 'John Doe',
          userAvatar: '',
          workspaceId: workspaceId,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          type: 'project_created',
          title: 'New project created',
          description: 'Created "Website Redesign" project',
          userId: 'user2',
          userName: 'Jane Smith',
          userAvatar: '',
          workspaceId: workspaceId,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          type: 'file_uploaded',
          title: 'File uploaded',
          description: 'Uploaded design mockups',
          userId: 'user1',
          userName: 'John Doe',
          userAvatar: '',
          workspaceId: workspaceId,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      return {
        activities: mockActivities.slice(0, limit),
        total: mockActivities.length,
        hasMore: mockActivities.length > limit
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return {
        activities: [],
        total: 0,
        hasMore: false
      };
    }
  }

  private async getActivityTrend(workspaceId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      // Generate sample trend data for the last 7 days
      // The frontend expects { data: ActivityTrendData[], period: string, summary: {...} }
      const trendData = [];
      const days = 7;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trendData.push({
          date: date.toISOString().split('T')[0],
          tasks: Math.floor(Math.random() * 15) + 5,
          messages: Math.floor(Math.random() * 30) + 10,
          files: Math.floor(Math.random() * 8) + 2,
          meetings: Math.floor(Math.random() * 3),
          notes: Math.floor(Math.random() * 10) + 3,
          activeUsers: Math.floor(Math.random() * 10) + 3
        });
      }

      // Calculate summary
      const summary = trendData.reduce((acc, day) => ({
        totalTasks: acc.totalTasks + day.tasks,
        totalMessages: acc.totalMessages + day.messages,
        totalFiles: acc.totalFiles + day.files,
        totalMeetings: acc.totalMeetings + day.meetings,
        totalNotes: acc.totalNotes + day.notes,
        averageActiveUsers: acc.averageActiveUsers + day.activeUsers / days
      }), {
        totalTasks: 0,
        totalMessages: 0,
        totalFiles: 0,
        totalMeetings: 0,
        totalNotes: 0,
        averageActiveUsers: 0
      });

      return {
        data: trendData,
        period: 'week',
        summary: {
          ...summary,
          averageActiveUsers: Math.round(summary.averageActiveUsers)
        }
      };
    } catch (error) {
      console.error('Error fetching activity trend:', error);
      return {
        data: [],
        period: 'week',
        summary: {
          totalTasks: 0,
          totalMessages: 0,
          totalFiles: 0,
          totalMeetings: 0,
          totalNotes: 0,
          averageActiveUsers: 0
        }
      };
    }
  }

  private async getTeamProductivity(workspaceId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const membersResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
        is_active: true
      });

      const members = membersResult.data || [];

      // For each member, calculate their productivity metrics
      // The frontend expects { members: TeamMemberProductivity[], teamStats: {...}, topPerformers: [...] }
      const memberProductivity = [];

      // Create mock data for demonstration
      const mockNames = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Tom Brown'];
      const mockRoles = ['Developer', 'Designer', 'Manager', 'Developer', 'Analyst'];

      for (let i = 0; i < Math.min(members.length || 5, 5); i++) {
        const member = members[i] || { user_id: `user${i}` };
        const tasksCompleted = Math.floor(Math.random() * 20) + 5;
        const tasksAssigned = tasksCompleted + Math.floor(Math.random() * 10);
        const completionRate = (tasksCompleted / tasksAssigned) * 100;

        memberProductivity.push({
          userId: member.user_id,
          userName: mockNames[i % mockNames.length],
          userAvatar: '',
          role: mockRoles[i % mockRoles.length],
          tasksCompleted: tasksCompleted,
          tasksAssigned: tasksAssigned,
          completionRate: Math.round(completionRate),
          averageTaskTime: Math.round((Math.random() * 48 + 12) * 10) / 10, // 12-60 hours
          messagesCount: Math.floor(Math.random() * 100) + 20,
          filesShared: Math.floor(Math.random() * 20) + 5,
          lastActive: new Date().toISOString(),
          productivityScore: Math.floor(Math.random() * 30) + 70 // 70-100
        });
      }

      // Calculate team stats
      const totalMembers = memberProductivity.length;
      const activeMembers = memberProductivity.filter(m => m.productivityScore > 50).length;
      const totalTasksCompleted = memberProductivity.reduce((sum, m) => sum + m.tasksCompleted, 0);
      const avgProductivityScore = memberProductivity.reduce((sum, m) => sum + m.productivityScore, 0) / totalMembers;
      const teamCompletionRate = memberProductivity.reduce((sum, m) => sum + m.completionRate, 0) / totalMembers;

      // Get top performers
      const topPerformers = [...memberProductivity]
        .sort((a, b) => b.productivityScore - a.productivityScore)
        .slice(0, 3);

      return {
        members: memberProductivity,
        teamStats: {
          totalMembers: totalMembers,
          activeMembers: activeMembers,
          averageProductivityScore: Math.round(avgProductivityScore),
          totalTasksCompleted: totalTasksCompleted,
          teamCompletionRate: Math.round(teamCompletionRate)
        },
        topPerformers: topPerformers
      };
    } catch (error) {
      console.error('Error fetching team productivity:', error);
      return {
        members: [],
        teamStats: {
          totalMembers: 0,
          activeMembers: 0,
          averageProductivityScore: 0,
          totalTasksCompleted: 0,
          teamCompletionRate: 0
        },
        topPerformers: []
      };
    }
  }

  private async getProjectAnalytics(workspaceId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const projectsResult = await this.db.findMany('projects', {
        workspace_id: workspaceId
      });

      const projects = projectsResult.data || [];

      // Create mock project data for demonstration
      // The frontend expects { projects: ProjectMetrics[], summary: {...}, trends: {...} }
      const projectMetrics = [];

      // If no projects, create some mock data
      const projectsToProcess = projects.length > 0 ? projects : [
        { id: '1', name: 'Website Redesign', status: 'ACTIVE', created_at: new Date() },
        { id: '2', name: 'Mobile App', status: 'ACTIVE', created_at: new Date() },
        { id: '3', name: 'API Development', status: 'COMPLETED', created_at: new Date() }
      ];

      let activeCount = 0;
      let completedCount = 0;
      let onHoldCount = 0;
      let cancelledCount = 0;
      let totalProgress = 0;
      let projectsAtRisk = 0;

      for (const project of projectsToProcess.slice(0, 10)) {
        const progress = Math.floor(Math.random() * 100);
        const status = project.status || 'ACTIVE';
        const riskLevel = progress < 30 ? 'HIGH' : progress < 60 ? 'MEDIUM' : 'LOW';

        if (status === 'ACTIVE') activeCount++;
        else if (status === 'COMPLETED') completedCount++;
        else if (status === 'ON_HOLD') onHoldCount++;
        else if (status === 'CANCELLED') cancelledCount++;

        if (riskLevel === 'HIGH') projectsAtRisk++;
        totalProgress += progress;

        projectMetrics.push({
          projectId: project.id,
          projectName: project.name,
          status: status,
          progress: progress,
          totalTasks: Math.floor(Math.random() * 50) + 10,
          completedTasks: Math.floor(Math.random() * 30) + 5,
          overdueTasks: Math.floor(Math.random() * 5),
          teamSize: Math.floor(Math.random() * 8) + 2,
          startDate: project.created_at || new Date().toISOString(),
          endDate: status === 'COMPLETED' ? new Date().toISOString() : undefined,
          completionRate: progress,
          averageTaskCompletionTime: Math.round((Math.random() * 48 + 12) * 10) / 10,
          riskLevel: riskLevel,
          lastActivity: new Date().toISOString()
        });
      }

      const totalProjects = projectMetrics.length;
      const averageProgress = totalProjects > 0 ? totalProgress / totalProjects : 0;
      const averageCompletionRate = projectMetrics.reduce((sum, p) => sum + p.completionRate, 0) / (totalProjects || 1);

      return {
        projects: projectMetrics,
        summary: {
          totalProjects: totalProjects,
          activeProjects: activeCount,
          completedProjects: completedCount,
          onHoldProjects: onHoldCount,
          cancelledProjects: cancelledCount,
          averageProgress: Math.round(averageProgress),
          averageCompletionRate: Math.round(averageCompletionRate),
          projectsAtRisk: projectsAtRisk
        },
        trends: {
          projectCompletionTrend: 15.2, // Mock positive trend
          averageTaskTimeTrend: -5.3, // Mock improvement (negative is good)
          teamProductivityTrend: 8.7 // Mock positive trend
        }
      };
    } catch (error) {
      console.error('Error fetching project analytics:', error);
      return {
        projects: [],
        summary: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          onHoldProjects: 0,
          cancelledProjects: 0,
          averageProgress: 0,
          averageCompletionRate: 0,
          projectsAtRisk: 0
        },
        trends: {
          projectCompletionTrend: 0,
          averageTaskTimeTrend: 0,
          teamProductivityTrend: 0
        }
      };
    }
  }

  /**
   * Get smart suggestions for the dashboard
   * This aggregates data from multiple sources and generates actionable suggestions
   *
   * Suggestion modules:
   * - Task Balance: Detects uneven task distribution across team members
   * - Meetings: Active and upcoming meeting alerts
   * - Unread Messages: Channel and DM notifications
   * - Overdue Tasks: Tasks past their due date
   * - Files: Storage warnings, large files, organization suggestions
   * - Calendar: Event conflicts, upcoming events, missed events
   * - Notes: Stale notes, organization, template suggestions
   * - Projects: At-risk projects, milestone deadlines, inactive projects
   * - Team: Inactive members, engagement drops, celebrations
   */
  async getSuggestions(workspaceId: string, userId: string, userLanguage: string = 'en'): Promise<SuggestionsResponse> {
    // Verify user has access to this workspace
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const suggestions: Suggestion[] = [];
    const now = new Date();

    // Check if user is owner/admin for role-based suggestions
    const isOwnerOrAdmin = await this.isWorkspaceOwnerOrAdmin(workspaceId, userId);

    // Gather context data for LangChain AI suggestions
    const contextData = await this.gatherUserContext(workspaceId, userId, isOwnerOrAdmin);

    // Generate AI-powered suggestions using LangChain with OpenAI
    try {
      this.logger.log(`[Dashboard] Generating LangChain AI suggestions for user ${userId} in ${userLanguage}`);
      const langchainResult = await this.langchainSuggestionsService.generateSmartSuggestions(contextData, userLanguage);

      if (langchainResult.suggestions.length > 0) {
        this.logger.log(`[Dashboard] LangChain generated ${langchainResult.suggestions.length} AI suggestions`);
        // Add AI-generated suggestions first (they are already prioritized)
        suggestions.push(...langchainResult.suggestions);
      }
    } catch (error) {
      this.logger.warn(`[Dashboard] LangChain suggestions failed, falling back to rule-based: ${error.message}`);
    }

    // Fetch rule-based suggestion types in parallel as fallback/supplement
    const [
      // Core suggestions (all users)
      taskBalanceSuggestions,
      meetingSuggestions,
      unreadMessageSuggestions,
      overdueTaskSuggestions,
      // Module suggestions (all users)
      fileSuggestions,
      calendarSuggestions,
      noteSuggestions,
      projectSuggestions,
      sprintSuggestions,
      chatMentionSuggestions,
      analyticsSuggestions,
      // Owner/Admin only suggestions
      teamSuggestions,
      billingSuggestions
    ] = await Promise.all([
      // Core (all users)
      this.getTaskBalanceSuggestions(workspaceId),
      this.getMeetingSuggestions(workspaceId, userId),
      this.getUnreadMessageSuggestions(workspaceId, userId),
      this.getOverdueTaskSuggestions(workspaceId),
      // Modules (all users)
      this.getFileSuggestions(workspaceId),
      this.getCalendarSuggestions(workspaceId, userId),
      this.getNoteSuggestions(workspaceId, userId),
      this.getProjectSuggestions(workspaceId),
      this.getSprintSuggestions(workspaceId),
      this.getChatMentionSuggestions(workspaceId, userId),
      this.getAnalyticsSuggestions(workspaceId, userId),
      // Owner/Admin only - pass userId to exclude self from inactive member suggestions
      isOwnerOrAdmin ? this.getTeamSuggestions(workspaceId, userId) : Promise.resolve([]),
      isOwnerOrAdmin ? this.getBillingSuggestions(workspaceId, userId) : Promise.resolve([])
    ]);

    // Get existing AI suggestion IDs to avoid duplicates
    const aiSuggestionTypes = new Set(suggestions.map(s => s.type));

    // Aggregate rule-based suggestions (skip types already covered by AI)
    if (!aiSuggestionTypes.has('task_balance')) suggestions.push(...taskBalanceSuggestions);
    if (!aiSuggestionTypes.has('meeting')) suggestions.push(...meetingSuggestions);
    if (!aiSuggestionTypes.has('unread_message')) suggestions.push(...unreadMessageSuggestions);
    if (!aiSuggestionTypes.has('overdue_task')) suggestions.push(...overdueTaskSuggestions);
    suggestions.push(...fileSuggestions);
    suggestions.push(...calendarSuggestions);
    suggestions.push(...noteSuggestions);
    suggestions.push(...projectSuggestions);
    suggestions.push(...sprintSuggestions);
    suggestions.push(...chatMentionSuggestions);
    suggestions.push(...analyticsSuggestions);
    suggestions.push(...teamSuggestions);
    suggestions.push(...billingSuggestions);

    // Sort by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      suggestions,
      totalCount: suggestions.length,
      generatedAt: now.toISOString()
    };
  }

  /**
   * Gather user context data for LangChain AI analysis
   */
  private async gatherUserContext(
    workspaceId: string,
    userId: string,
    isOwnerOrAdmin: boolean
  ): Promise<UserContextData> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    try {
      // Fetch user profile
      const userProfile = await this.db.getUserById(userId);
      const profileData = userProfile as any;
      const metadata = profileData?.metadata || {};

      // Get projects for the workspace
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = projectsResult.data || [];
      const projectIds = projects.map((p: any) => p.id);

      // Get tasks
      let overdueTasks: any[] = [];
      let dueSoonTasks: any[] = [];
      let assignedTasks: any[] = [];

      if (projectIds.length > 0) {
        const tasksResult = await this.db.table('tasks')
          .select('*')
          .execute()
          .catch(() => ({ data: [] }));
        const allTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];
        const projectTasks = allTasks.filter((t: any) => projectIds.includes(t.project_id));

        overdueTasks = projectTasks.filter((t: any) =>
          t.due_date && new Date(t.due_date) < now && t.status !== 'done'
        );
        dueSoonTasks = projectTasks.filter((t: any) =>
          t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= threeDaysFromNow && t.status !== 'done'
        );
        assignedTasks = projectTasks.filter((t: any) =>
          t.assigned_to && Array.isArray(t.assigned_to) && t.assigned_to.includes(userId)
        );
      }

      // Get meetings
      const callsResult = await this.db.table('video_calls')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));
      const allCalls = Array.isArray(callsResult.data) ? callsResult.data : [];
      const workspaceCalls = allCalls.filter((c: any) => c.workspace_id === workspaceId);

      const activeMeetings = workspaceCalls.filter((c: any) => c.status === 'active');
      const upcomingMeetings = workspaceCalls.filter((c: any) =>
        c.status === 'scheduled' &&
        c.scheduled_start_time &&
        new Date(c.scheduled_start_time) <= thirtyMinutesFromNow &&
        new Date(c.scheduled_start_time) >= now
      );

      // Get unread messages (simplified)
      const unreadMessages: any[] = [];
      const mentions: any[] = [];

      // Get team members
      const membersResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
        is_active: true
      });
      const members = membersResult.data || [];

      // Find inactive members (no activity in 7 days) - only for admins
      const inactiveMembers: any[] = [];

      return {
        userId,
        workspaceId,
        tasks: {
          overdue: overdueTasks.slice(0, 10),
          dueSoon: dueSoonTasks.slice(0, 10),
          assigned: assignedTasks.slice(0, 10),
          created: []
        },
        meetings: {
          active: activeMeetings,
          upcoming: upcomingMeetings,
          missed: []
        },
        messages: {
          unread: unreadMessages,
          mentions: mentions
        },
        calendar: {
          conflicts: [],
          upcoming: []
        },
        projects: {
          atRisk: projects.filter((p: any) => p.status === 'at_risk'),
          inactive: [],
          memberships: projects
        },
        team: {
          members: members,
          inactiveMembers: isOwnerOrAdmin ? inactiveMembers : []
        },
        userProfile: {
          name: metadata.name || profileData?.full_name || profileData?.email || 'User',
          role: isOwnerOrAdmin ? 'Admin' : 'Member',
          recentActivity: []
        }
      };
    } catch (error) {
      this.logger.error(`[Dashboard] Failed to gather user context: ${error.message}`);
      // Return minimal context on error
      return {
        userId,
        workspaceId,
        tasks: { overdue: [], dueSoon: [], assigned: [], created: [] },
        meetings: { active: [], upcoming: [], missed: [] },
        messages: { unread: [], mentions: [] },
        calendar: { conflicts: [], upcoming: [] },
        projects: { atRisk: [], inactive: [], memberships: [] },
        team: { members: [], inactiveMembers: [] },
        userProfile: { name: 'User', role: 'Member', recentActivity: [] }
      };
    }
  }

  /**
   * Detect task distribution imbalances across projects
   * Analyzes project members and their assigned tasks to suggest balanced distribution
   */
  private async getTaskBalanceSuggestions(workspaceId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get projects for this workspace
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = projectsResult.data || [];

      // Analyze task distribution per project
      for (const project of projects) {
        // Get project members (not workspace members)
        const projectMembersResult = await this.db.findMany('project_members', {
          project_id: project.id,
          is_active: true
        });
        const projectMembers = projectMembersResult.data || [];

        // Skip if less than 2 project members (no point in balancing)
        if (projectMembers.length < 2) continue;

        // Create a map for quick project member lookup
        const projectMemberMap = new Map<string, any>();
        for (const member of projectMembers) {
          projectMemberMap.set(member.user_id, member);
        }

        // Get tasks for this project (only non-completed tasks)
        const tasksResult = await this.db.table('tasks')
          .select('*')
          .where('project_id', '=', project.id)
          .execute()
          .catch(() => ({ data: [] }));
        console.log("taskresult",tasksResult)
        const allTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];

        // Get project's kanban stages to determine which stage is the "done" stage (last stage by order)
        const kanbanStages = project.kanban_stages || [];
        let doneStageId: string | number | null = null;

        if (kanbanStages.length > 0) {
          // Sort stages by order and get the last one (done stage)
          const sortedStages = [...kanbanStages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          const lastStage = sortedStages[sortedStages.length - 1];
          doneStageId = lastStage?.id;
        }

        // Filter out tasks in the done stage (last stage)
        const activeTasks = allTasks.filter(t => {
          if (doneStageId === null) return true; // No stages defined, include all tasks
          const taskStatus = t.status;
          // Compare as both original type and string for flexibility
          return taskStatus !== doneStageId && String(taskStatus) !== String(doneStageId);
        });
        console.log("activetasks",activeTasks)
        // Skip if no active tasks
        if (activeTasks.length === 0) continue;

        // Calculate ideal distribution: total tasks / number of project members
        const idealTasksPerMember = activeTasks.length / projectMembers.length;

        // Initialize task count for ALL project members (even those with 0 tasks)
        const memberTaskCount = new Map<string, number>();
        for (const member of projectMembers) {
          memberTaskCount.set(member.user_id, 0);
        }

        // Count tasks assigned to each project member
        for (const task of activeTasks) {
          // assigned_to is a JSONB array of user IDs
          const assignedTo = task.assigned_to || [];
          const assigneeIds = Array.isArray(assignedTo) ? assignedTo : [];

          for (const assigneeId of assigneeIds) {
            // Only count if assignee is a project member
            if (memberTaskCount.has(assigneeId)) {
              memberTaskCount.set(assigneeId, (memberTaskCount.get(assigneeId) || 0) + 1);
            }
          }
        }

        // Build distribution array for all project members
        const distributions: Array<{ userId: string; count: number }> = [];
        memberTaskCount.forEach((count, userId) => {
          distributions.push({ userId, count });
        });

        // Sort by task count
        distributions.sort((a, b) => b.count - a.count);

        // Find the most overloaded and most underloaded members
        const mostOverloaded = distributions[0]; // Highest task count
        const leastLoaded = distributions[distributions.length - 1]; // Lowest task count

        // Calculate if there's a significant imbalance
        // Imbalance exists if: difference > 1 AND (overloaded has 50% more than ideal OR underloaded has 50% less than ideal)
        const taskDifference = mostOverloaded.count - leastLoaded.count;
        const isSignificantImbalance = taskDifference >= 2 && (
          mostOverloaded.count > idealTasksPerMember * 1.5 ||
          (leastLoaded.count < idealTasksPerMember * 0.5 && idealTasksPerMember >= 1)
        );

        if (isSignificantImbalance) {
          // Fetch user details using database
          const [overloadedUserProfile, underloadedUserProfile] = await Promise.all([
            this.db.getUserById(mostOverloaded.userId),
            this.db.getUserById(leastLoaded.userId)
          ]);

          // Extract user name and avatar from profile
          let overloadedName = 'Team member';
          let overloadedAvatar: string | null = null;
          if (overloadedUserProfile) {
            const profile = overloadedUserProfile as any;
            const metadata = profile.metadata || {};
            overloadedName = metadata.name || profile.full_name || profile.name || profile.email || 'Team member';
            overloadedAvatar = profile.avatar_url || null;
          }

          let underloadedName = 'Team member';
          let underloadedAvatar: string | null = null;
          if (underloadedUserProfile) {
            const profile = underloadedUserProfile as any;
            const metadata = profile.metadata || {};
            underloadedName = metadata.name || profile.full_name || profile.name || profile.email || 'Team member';
            underloadedAvatar = profile.avatar_url || null;
          }

          // Determine priority based on severity of imbalance
          let priority: 'high' | 'medium' | 'low' = 'low';
          if (taskDifference >= 4 || mostOverloaded.count > idealTasksPerMember * 2) {
            priority = 'high';
          } else if (taskDifference >= 2) {
            priority = 'medium';
          }

          // Generate AI-powered suggestion description
          const aiSuggestion = await this.generateAISuggestion({
            type: 'task_balance',
            projectName: project.name,
            overloadedName,
            overloadedTaskCount: mostOverloaded.count,
            underloadedName,
            underloadedTaskCount: leastLoaded.count,
            idealTasksPerMember: Math.round(idealTasksPerMember),
            totalTasks: activeTasks.length,
            totalMembers: projectMembers.length
          });

          suggestions.push({
            id: `task-balance-${project.id}`,
            type: 'task_balance',
            priority,
            title: aiSuggestion?.title || `Task Imbalance in ${project.name}`,
            description: aiSuggestion?.description || `${overloadedName} has ${mostOverloaded.count} tasks while ${underloadedName} has ${leastLoaded.count}. Ideal is ~${Math.round(idealTasksPerMember)} tasks per member.`,
            actionLabel: aiSuggestion?.actionLabel || 'View Project',
            actionUrl: `/projects/${project.id}`,
            metadata: {
              projectId: project.id,
              projectName: project.name,
              totalTasks: activeTasks.length,
              totalMembers: projectMembers.length,
              idealTasksPerMember: Math.round(idealTasksPerMember * 10) / 10,
              overloaded: {
                userId: mostOverloaded.userId,
                userName: overloadedName,
                userAvatar: overloadedAvatar,
                taskCount: mostOverloaded.count
              },
              underloaded: {
                userId: leastLoaded.userId,
                userName: underloadedName,
                userAvatar: underloadedAvatar,
                taskCount: leastLoaded.count
              },
              aiRecommendation: aiSuggestion?.recommendation
            },
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error getting task balance suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Generate AI-powered suggestion using database AI service
   * Provides intelligent, context-aware recommendations
   */
  private async generateAISuggestion(context: {
    type: 'task_balance' | 'overdue_task' | 'meeting' | 'unread_message';
    projectName?: string;
    overloadedName?: string;
    overloadedTaskCount?: number;
    underloadedName?: string;
    underloadedTaskCount?: number;
    idealTasksPerMember?: number;
    totalTasks?: number;
    totalMembers?: number;
    taskTitle?: string;
    daysOverdue?: number;
    meetingTitle?: string;
    minutesUntilStart?: number;
    unreadCount?: number;
    channelName?: string;
  }): Promise<{ title: string; description: string; actionLabel: string; recommendation?: string } | null> {
    try {
      let prompt = '';

      if (context.type === 'task_balance') {
        prompt = `You are a project management AI assistant. Generate a helpful, actionable suggestion for a task imbalance situation.

Context:
- Project: "${context.projectName}"
- ${context.overloadedName} has ${context.overloadedTaskCount} tasks (overloaded)
- ${context.underloadedName} has ${context.underloadedTaskCount} tasks (underloaded)
- Ideal tasks per member: ${context.idealTasksPerMember}
- Total active tasks: ${context.totalTasks}
- Total team members: ${context.totalMembers}

Generate a JSON response with:
1. title: A concise, friendly title (max 50 chars)
2. description: A brief explanation with specific recommendation (max 150 chars)
3. actionLabel: Button text (max 20 chars, e.g., "Balance Tasks", "Redistribute")
4. recommendation: Specific suggestion on which tasks to reassign (max 200 chars)

Respond with ONLY valid JSON, no markdown or explanation:
{"title": "...", "description": "...", "actionLabel": "...", "recommendation": "..."}`;
      } else if (context.type === 'overdue_task') {
        prompt = `You are a project management AI assistant. Generate an urgent, actionable suggestion for an overdue task.

Context:
- Task: "${context.taskTitle}"
- Days overdue: ${context.daysOverdue}
- Project: "${context.projectName}"

Generate a JSON response with:
1. title: An urgent but professional title (max 50 chars)
2. description: Brief explanation with urgency (max 150 chars)
3. actionLabel: Action button text (max 20 chars)
4. recommendation: What should be done (max 200 chars)

Respond with ONLY valid JSON:
{"title": "...", "description": "...", "actionLabel": "...", "recommendation": "..."}`;
      } else {
        return null; // Don't use AI for other types yet
      }

      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false
      });

      // Parse the AI response
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.text) {
        responseText = response.text;
      } else if (response?.content) {
        responseText = response.content;
      } else {
        return null;
      }

      // Clean and parse JSON
      const cleanedContent = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedContent);
      return {
        title: parsed.title || null,
        description: parsed.description || null,
        actionLabel: parsed.actionLabel || null,
        recommendation: parsed.recommendation || null
      };
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
      return null; // Fall back to default suggestion
    }
  }

  /**
   * Get active and upcoming meeting suggestions
   */
  private async getMeetingSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get video calls for this workspace
      const callsResult = await this.db.table('video_calls')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));

      const allCalls = Array.isArray(callsResult.data) ? callsResult.data : [];
      const workspaceCalls = allCalls.filter(call => call.workspace_id === workspaceId);

      const now = new Date();
      const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

      for (const call of workspaceCalls) {
        // Active meetings
        if (call.status === 'active') {
          suggestions.push({
            id: `active-meeting-${call.id}`,
            type: 'meeting',
            priority: 'high',
            title: `Meeting in Progress: ${call.title}`,
            description: 'This meeting is currently active. Join now to participate.',
            actionLabel: 'Join Now',
            actionUrl: `/call/${workspaceId}/${call.id}`,
            metadata: {
              meeting: {
                id: call.id,
                title: call.title,
                status: call.status,
                callType: call.call_type || 'video',
                scheduledStartTime: call.scheduled_start_time,
                scheduledEndTime: call.scheduled_end_time
              }
            },
            createdAt: new Date().toISOString()
          });
        }

        // Upcoming meetings (within 15 minutes)
        if (call.status === 'scheduled' && call.scheduled_start_time) {
          const startTime = new Date(call.scheduled_start_time);
          const minutesUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60);

          if (minutesUntilStart > 0 && minutesUntilStart <= 15) {
            suggestions.push({
              id: `upcoming-meeting-${call.id}`,
              type: 'meeting',
              priority: minutesUntilStart <= 5 ? 'high' : 'medium',
              title: `Meeting Starting Soon: ${call.title}`,
              description: `Starts in ${Math.ceil(minutesUntilStart)} minutes`,
              actionLabel: 'Join Now',
              actionUrl: `/call/${workspaceId}/${call.id}`,
              metadata: {
                meeting: {
                  id: call.id,
                  title: call.title,
                  status: call.status,
                  callType: call.call_type || 'video',
                  scheduledStartTime: call.scheduled_start_time,
                  scheduledEndTime: call.scheduled_end_time,
                  minutesUntilStart: Math.ceil(minutesUntilStart)
                }
              },
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting meeting suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Get unread message suggestions for channels and conversations
   */
  private async getUnreadMessageSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get channels for this workspace (exclude archived channels)
      const channelsResult = await this.db.findMany('channels', {
        workspace_id: workspaceId,
        is_archived: false
      });
      const channels = channelsResult.data || [];

      // Get channel memberships for this user (this contains last_read_at)
      const membershipResult = await this.db.table('channel_members')
        .select('*')
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute()
        .catch(() => ({ data: [] }));

      const memberships = Array.isArray(membershipResult.data) ? membershipResult.data : [];
      const membershipMap = new Map<string, any>();
      for (const membership of memberships) {
        membershipMap.set(membership.channel_id, membership);
      }

      // Check each channel for unread messages (only channels user is a member of)
      for (const channel of channels) {
        const membership = membershipMap.get(channel.id);
        // Skip channels where user is not a member
        if (!membership) continue;

        const lastReadAt = membership.last_read_at ? new Date(membership.last_read_at) : new Date(0);

        // Count messages after last read
        const messagesResult = await this.db.table('messages')
          .select('*')
          .where('channel_id', '=', channel.id)
          .execute()
          .catch(() => ({ data: [] }));

        const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];
        const unreadMessages = messages.filter(msg => {
          const msgDate = new Date(msg.created_at);
          return msgDate > lastReadAt && msg.user_id !== userId;
        });

        if (unreadMessages.length > 0) {
          suggestions.push({
            id: `unread-channel-${channel.id}`,
            type: 'unread_message',
            priority: unreadMessages.length > 10 ? 'high' : unreadMessages.length > 5 ? 'medium' : 'low',
            title: `Unread messages in #${channel.name}`,
            description: `${unreadMessages.length} unread ${unreadMessages.length === 1 ? 'message' : 'messages'}`,
            actionLabel: 'View Messages',
            actionUrl: `/chat/${channel.id}`,
            metadata: {
              chat: {
                id: channel.id,
                name: channel.name,
                type: 'channel' as const,
                unreadCount: unreadMessages.length,
                isPrivate: channel.is_private
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      // Get conversation memberships for this user (this contains last_read_at)
      const convMembershipResult = await this.db.table('conversation_members')
        .select('*')
        .where('user_id', '=', userId)
        .execute()
        .catch(() => ({ data: [] }));

      const convMemberships = Array.isArray(convMembershipResult.data) ? convMembershipResult.data : [];
      const convMembershipMap = new Map<string, any>();
      for (const membership of convMemberships) {
        convMembershipMap.set(membership.conversation_id, membership);
      }

      // Get conversations (DMs) that user is a member of
      const conversationsResult = await this.db.table('conversations')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));

      const allConversations = Array.isArray(conversationsResult.data) ? conversationsResult.data : [];
      // Filter conversations: must be in workspace, user must be participant, and must be active (not deleted/archived)
      const userConversations = allConversations.filter(conv =>
        conv.workspace_id === workspaceId &&
        convMembershipMap.has(conv.id) && // User must be a member
        conv.is_active !== false &&
        conv.is_archived !== true
      );

      // Get workspace members for name lookup
      const membersResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
        is_active: true
      });
      const members = membersResult.data || [];
      const memberMap = new Map<string, any>();
      for (const member of members) {
        memberMap.set(member.user_id, member);
      }

      for (const conversation of userConversations) {
        const convMembership = convMembershipMap.get(conversation.id);

        // Get unread count for this conversation
        const convMessagesResult = await this.db.table('conversation_messages')
          .select('*')
          .where('conversation_id', '=', conversation.id)
          .execute()
          .catch(() => ({ data: [] }));

        const convMessages = Array.isArray(convMessagesResult.data) ? convMessagesResult.data : [];
        // Use membership last_read_at instead of conversation last_read_at
        const lastRead = convMembership?.last_read_at ? new Date(convMembership.last_read_at) : new Date(0);

        const unreadCount = convMessages.filter(msg => {
          const msgDate = new Date(msg.created_at);
          return msgDate > lastRead && msg.sender_id !== userId;
        }).length;

        if (unreadCount > 0) {
          // Find the other participant's name
          const otherUserId = conversation.participants?.find((id: string) => id !== userId) ||
            (conversation.user_id !== userId ? conversation.user_id : conversation.other_user_id);
          const otherMember = memberMap.get(otherUserId);
          const otherName = otherMember?.user?.name || otherMember?.name || 'Direct Message';

          suggestions.push({
            id: `unread-conversation-${conversation.id}`,
            type: 'unread_message',
            priority: unreadCount > 10 ? 'high' : unreadCount > 5 ? 'medium' : 'low',
            title: `Unread messages from ${otherName}`,
            description: `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`,
            actionLabel: 'View Messages',
            actionUrl: `/chat/${conversation.id}`,
            metadata: {
              chat: {
                id: conversation.id,
                name: otherName,
                type: 'conversation' as const,
                unreadCount
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error getting unread message suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Get overdue task suggestions
   */
  private async getOverdueTaskSuggestions(workspaceId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get projects for this workspace
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = projectsResult.data || [];

      const projectMap = new Map<string, any>();
      for (const project of projects) {
        projectMap.set(project.id, project);
      }

      const projectIds = projects.map((p: any) => p.id);

      if (projectIds.length === 0) return suggestions;

      // Get all tasks
      const tasksResult = await this.db.table('tasks')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));

      const allTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];
      const workspaceTasks = allTasks.filter(t => projectIds.includes(t.project_id));

      // Build a map of project done stage IDs (last stage by order is done)
      const projectDoneStageMap = new Map<string, string | number | null>();
      for (const project of projects) {
        const kanbanStages = project.kanban_stages || [];
        let doneStageId: string | number | null = null;
        if (kanbanStages.length > 0) {
          const sortedStages = [...kanbanStages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          const lastStage = sortedStages[sortedStages.length - 1];
          doneStageId = lastStage?.id;
        }
        projectDoneStageMap.set(project.id, doneStageId);
      }

      const now = new Date();

      for (const task of workspaceTasks) {
        // Skip tasks in the done stage (last stage of their project)
        const doneStageId = projectDoneStageMap.get(task.project_id);
        if (doneStageId !== null && (task.status === doneStageId || String(task.status) === String(doneStageId))) {
          continue;
        }

        // Check if task is overdue
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          if (dueDate < now) {
            const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const project = projectMap.get(task.project_id);

            // Generate AI-powered suggestion for high-priority overdue tasks
            let aiSuggestion = null;
            if (daysOverdue > 3) {
              aiSuggestion = await this.generateAISuggestion({
                type: 'overdue_task',
                taskTitle: task.title,
                daysOverdue,
                projectName: project?.name
              });
            }

            suggestions.push({
              id: `overdue-task-${task.id}`,
              type: 'overdue_task',
              priority: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
              title: aiSuggestion?.title || `Overdue: ${task.title}`,
              description: aiSuggestion?.description || `This task was due ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} ago in ${project?.name || 'project'}`,
              actionLabel: aiSuggestion?.actionLabel || 'View Task',
              actionUrl: `/projects/${task.project_id}/tasks/${task.id}`,
              metadata: {
                taskId: task.id,
                taskTitle: task.title,
                projectId: task.project_id,
                projectName: project?.name,
                dueDate: task.due_date,
                daysOverdue,
                aiRecommendation: aiSuggestion?.recommendation
              },
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // Limit to top 5 overdue tasks
      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error getting overdue task suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // FILE MODULE SUGGESTIONS
  // ============================================

  /**
   * Get file-related suggestions (storage warnings, large files, orphaned files)
   */
  private async getFileSuggestions(workspaceId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get all files for this workspace
      const filesResult = await this.db.findMany('files', {
        workspace_id: workspaceId,
        is_deleted: false
      });
      const files = filesResult.data || [];

      // Get all folders for this workspace
      const foldersResult = await this.db.findMany('folders', {
        workspace_id: workspaceId,
        is_deleted: false
      });
      const folders = foldersResult.data || [];

      const folderMap = new Map<string, any>();
      for (const folder of folders) {
        folderMap.set(folder.id, folder);
      }

      // 1. Storage warning - check total storage usage
      const totalStorageUsed = files.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0);
      const storageLimit = 512 * 1024 * 1024; // 512MB default limit
      const usagePercentage = (totalStorageUsed / storageLimit) * 100;

      if (usagePercentage >= 20) {
        const priority: 'high' | 'medium' | 'low' = usagePercentage >= 80 ? 'high' : usagePercentage >= 50 ? 'medium' : 'low';
        suggestions.push({
          id: `storage-warning-${workspaceId}`,
          type: 'storage_warning',
          priority,
          title: 'Storage Space Running Low',
          description: `You've used ${Math.round(usagePercentage)}% of your storage (${this.formatFileSize(totalStorageUsed)} of ${this.formatFileSize(storageLimit)})`,
          actionLabel: 'Manage Files',
          actionUrl: '/files',
          metadata: {
            file: {
              storageUsed: totalStorageUsed,
              storageLimit,
              usagePercentage: Math.round(usagePercentage),
              fileCount: files.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 2. Large files - files over 100MB
      const largeFiles = files.filter(file => (parseInt(file.size) || 0) > 100 * 1024 * 1024);
      if (largeFiles.length > 0) {
        const largestFile = largeFiles.sort((a, b) => (parseInt(b.size) || 0) - (parseInt(a.size) || 0))[0];
        suggestions.push({
          id: `large-files-${workspaceId}`,
          type: 'large_files',
          priority: 'low',
          title: `${largeFiles.length} Large File${largeFiles.length > 1 ? 's' : ''} Found`,
          description: `Largest: "${largestFile.name}" (${this.formatFileSize(parseInt(largestFile.size))})`,
          actionLabel: 'Review Files',
          actionUrl: '/files',
          metadata: {
            file: {
              fileId: largestFile.id,
              fileName: largestFile.name,
              fileSize: parseInt(largestFile.size),
              fileCount: largeFiles.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 3. Orphaned files - files not in any folder (root-level clutter)
      const rootFiles = files.filter(file => !file.folder_id);
      if (rootFiles.length > 20) {
        suggestions.push({
          id: `orphaned-files-${workspaceId}`,
          type: 'orphaned_files',
          priority: 'low',
          title: 'Organize Your Files',
          description: `${rootFiles.length} files in root folder. Consider organizing them into folders.`,
          actionLabel: 'Organize Files',
          actionUrl: '/files',
          metadata: {
            file: {
              fileCount: rootFiles.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 4. Files not shared - important files that could be shared
      const unsharedFiles = files.filter(file => !file.is_shared && file.size > 1024 * 1024); // >1MB and not shared
      if (unsharedFiles.length > 10) {
        suggestions.push({
          id: `file-sharing-${workspaceId}`,
          type: 'file_sharing',
          priority: 'low',
          title: 'Share Important Files',
          description: `${unsharedFiles.length} files could be shared with your team`,
          actionLabel: 'View Files',
          actionUrl: '/files',
          metadata: {
            file: {
              fileCount: unsharedFiles.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error getting file suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Helper to format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ============================================
  // CALENDAR MODULE SUGGESTIONS
  // ============================================

  /**
   * Get calendar-related suggestions (conflicts, upcoming events, reminders)
   */
  private async getCalendarSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get calendar events for this workspace
      const eventsResult = await this.db.table('calendar_events')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));

      const allEvents = Array.isArray(eventsResult.data) ? eventsResult.data : [];
      const workspaceEvents = allEvents.filter(e => e.workspace_id === workspaceId && !e.is_deleted);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get user's events (as attendee or organizer)
      const userEvents = workspaceEvents.filter(event => {
        return event.organizer_id === userId ||
          (event.attendees && event.attendees.some((a: any) => a.user_id === userId || a.userId === userId));
      });

      // 1. Upcoming events in next 24 hours
      const upcomingEvents = userEvents.filter(event => {
        if (!event.start_time) return false;
        const startTime = new Date(event.start_time);
        return startTime >= now && startTime < tomorrow;
      }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      for (const event of upcomingEvents.slice(0, 3)) {
        const startTime = new Date(event.start_time);
        const minutesUntilStart = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));

        if (minutesUntilStart > 0 && minutesUntilStart <= 60) {
          suggestions.push({
            id: `upcoming-event-${event.id}`,
            type: 'upcoming_event',
            priority: minutesUntilStart <= 15 ? 'high' : 'medium',
            title: `Event Starting ${minutesUntilStart <= 15 ? 'Soon' : `in ${minutesUntilStart} min`}`,
            description: event.title,
            actionLabel: 'View Event',
            actionUrl: `/calendar?event=${event.id}`,
            metadata: {
              calendar: {
                eventId: event.id,
                eventTitle: event.title,
                startTime: event.start_time,
                endTime: event.end_time,
                location: event.location,
                minutesUntilStart,
                isRecurring: !!event.recurrence_rule
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      // 2. Calendar conflicts detection
      const futureEvents = userEvents
        .filter(event => event.start_time && new Date(event.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      for (let i = 0; i < futureEvents.length - 1; i++) {
        const currentEvent = futureEvents[i];
        const nextEvent = futureEvents[i + 1];

        const currentEnd = new Date(currentEvent.end_time || currentEvent.start_time);
        const nextStart = new Date(nextEvent.start_time);

        // Check for overlap
        if (currentEnd > nextStart) {
          suggestions.push({
            id: `calendar-conflict-${currentEvent.id}-${nextEvent.id}`,
            type: 'calendar_conflict',
            priority: 'high',
            title: 'Calendar Conflict Detected',
            description: `"${currentEvent.title}" overlaps with "${nextEvent.title}"`,
            actionLabel: 'Resolve Conflict',
            actionUrl: `/calendar?event=${currentEvent.id}`,
            metadata: {
              calendar: {
                eventId: currentEvent.id,
                eventTitle: currentEvent.title,
                startTime: currentEvent.start_time,
                endTime: currentEvent.end_time,
                conflictingEventId: nextEvent.id,
                conflictingEventTitle: nextEvent.title
              }
            },
            createdAt: new Date().toISOString()
          });
          break; // Only report first conflict to avoid spam
        }
      }

      // 3. Missed events (past events user didn't attend - within last 24 hours)
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const missedEvents = userEvents.filter(event => {
        if (!event.start_time) return false;
        const startTime = new Date(event.start_time);
        return startTime >= yesterday && startTime < now && event.status !== 'completed' && event.status !== 'cancelled';
      });

      if (missedEvents.length > 0) {
        const mostRecent = missedEvents[missedEvents.length - 1];
        suggestions.push({
          id: `missed-event-${mostRecent.id}`,
          type: 'missed_event',
          priority: 'medium',
          title: 'Missed Event',
          description: `You missed "${mostRecent.title}"`,
          actionLabel: 'View Event',
          actionUrl: `/calendar?event=${mostRecent.id}`,
          metadata: {
            calendar: {
              eventId: mostRecent.id,
              eventTitle: mostRecent.title,
              startTime: mostRecent.start_time
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 4. Event reminders for events this week
      const thisWeekEvents = userEvents.filter(event => {
        if (!event.start_time) return false;
        const startTime = new Date(event.start_time);
        return startTime >= tomorrow && startTime < nextWeek;
      });

      if (thisWeekEvents.length > 3) {
        suggestions.push({
          id: `event-reminder-week-${workspaceId}`,
          type: 'event_reminder',
          priority: 'low',
          title: `${thisWeekEvents.length} Events This Week`,
          description: 'Review your upcoming schedule',
          actionLabel: 'View Calendar',
          actionUrl: '/calendar',
          metadata: {
            calendar: {
              attendeeCount: thisWeekEvents.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error getting calendar suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // NOTE MODULE SUGGESTIONS
  // ============================================

  /**
   * Get note-related suggestions (stale notes, unorganized notes, templates)
   */
  private async getNoteSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get all notes for this workspace
      const notesResult = await this.db.findMany('notes', {
        workspace_id: workspaceId
      });
      const notes = (notesResult.data || []).filter((n: any) => !n.is_deleted && !n.is_archived);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get user's notes
      const userNotes = notes.filter((note: any) => note.user_id === userId || note.created_by === userId);

      // 1. Stale notes - notes not updated in 90+ days
      const staleNotes = userNotes.filter((note: any) => {
        const lastModified = new Date(note.updated_at || note.created_at);
        return lastModified < ninetyDaysAgo;
      });

      if (staleNotes.length > 0) {
        const oldestNote = staleNotes.sort((a: any, b: any) =>
          new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime()
        )[0];
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(oldestNote.updated_at || oldestNote.created_at).getTime()) / (24 * 60 * 60 * 1000));

        suggestions.push({
          id: `stale-notes-${workspaceId}`,
          type: 'stale_note',
          priority: 'low',
          title: `${staleNotes.length} Note${staleNotes.length > 1 ? 's' : ''} Need Review`,
          description: `"${oldestNote.title || 'Untitled'}" hasn't been updated in ${daysSinceUpdate} days`,
          actionLabel: 'Review Notes',
          actionUrl: `/notes/${oldestNote.id}`,
          metadata: {
            note: {
              noteId: oldestNote.id,
              noteTitle: oldestNote.title || 'Untitled',
              lastModified: oldestNote.updated_at || oldestNote.created_at,
              daysSinceUpdate,
              noteCount: staleNotes.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 2. Unorganized notes - notes without parent (root level) if too many
      const rootNotes = userNotes.filter((note: any) => !note.parent_id);
      if (rootNotes.length > 15) {
        suggestions.push({
          id: `unorganized-notes-${workspaceId}`,
          type: 'unorganized_notes',
          priority: 'low',
          title: 'Organize Your Notes',
          description: `${rootNotes.length} notes at root level. Consider creating folders.`,
          actionLabel: 'Organize Notes',
          actionUrl: '/notes',
          metadata: {
            note: {
              unorganizedCount: rootNotes.length,
              noteCount: userNotes.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 3. Note templates suggestion - if user has created many similar notes
      const recentNotes = userNotes.filter((note: any) => {
        const createdAt = new Date(note.created_at);
        return createdAt >= thirtyDaysAgo;
      });

      // Get templates
      const templatesResult = await this.db.findMany('note_templates', {
        workspace_id: workspaceId
      });
      const templates = templatesResult.data || [];

      if (recentNotes.length >= 5 && templates.length === 0) {
        suggestions.push({
          id: `note-template-${workspaceId}`,
          type: 'note_template',
          priority: 'low',
          title: 'Create Note Templates',
          description: `You've created ${recentNotes.length} notes recently. Templates can save time.`,
          actionLabel: 'Create Template',
          actionUrl: '/notes/templates',
          metadata: {
            note: {
              noteCount: recentNotes.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error getting note suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // PROJECT MODULE SUGGESTIONS
  // ============================================

  /**
   * Get project-related suggestions (at-risk, milestones, inactive projects)
   */
  private async getProjectSuggestions(workspaceId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get projects for this workspace
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = (projectsResult.data || []).filter((p: any) => !p.is_deleted);

      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      for (const project of projects) {
        const projectId = project.id;

        // Get tasks for this project
        const tasksResult = await this.db.table('tasks')
          .select('*')
          .where('project_id', '=', projectId)
          .execute()
          .catch(() => ({ data: [] }));

        const allTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];

        // Get project's kanban stages to determine done stage
        const kanbanStages = project.kanban_stages || [];
        let doneStageId: string | number | null = null;
        if (kanbanStages.length > 0) {
          const sortedStages = [...kanbanStages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          doneStageId = sortedStages[sortedStages.length - 1]?.id;
        }

        // Filter active tasks (not in done stage)
        const activeTasks = allTasks.filter(t => {
          if (doneStageId === null) return t.status !== 'completed';
          return t.status !== doneStageId && String(t.status) !== String(doneStageId);
        });

        const completedTasks = allTasks.filter(t => {
          if (doneStageId === null) return t.status === 'completed';
          return t.status === doneStageId || String(t.status) === String(doneStageId);
        });

        // 1. Projects at risk - high % of overdue tasks
        const overdueTasks = activeTasks.filter(t => {
          if (!t.due_date) return false;
          return new Date(t.due_date) < now;
        });

        const overduePercentage = activeTasks.length > 0 ? (overdueTasks.length / activeTasks.length) * 100 : 0;

        if (overduePercentage >= 30 && overdueTasks.length >= 3) {
          const riskLevel = overduePercentage >= 60 ? 'critical' : overduePercentage >= 45 ? 'high' : 'medium';
          const priority = riskLevel === 'critical' ? 'high' : riskLevel === 'high' ? 'medium' : 'low';

          // Generate AI suggestion for at-risk projects
          const aiSuggestion = await this.generateAISuggestion({
            type: 'task_balance', // Reuse for project risk
            projectName: project.name,
            totalTasks: activeTasks.length,
            overloadedTaskCount: overdueTasks.length
          } as any);

          suggestions.push({
            id: `project-at-risk-${projectId}`,
            type: 'project_at_risk',
            priority: priority as 'high' | 'medium' | 'low',
            title: aiSuggestion?.title || `Project "${project.name}" at Risk`,
            description: aiSuggestion?.description || `${overdueTasks.length} of ${activeTasks.length} tasks are overdue (${Math.round(overduePercentage)}%)`,
            actionLabel: aiSuggestion?.actionLabel || 'Review Project',
            actionUrl: `/projects/${projectId}`,
            metadata: {
              project: {
                projectId,
                projectName: project.name,
                overdueTasks: overdueTasks.length,
                totalTasks: activeTasks.length,
                completedTasks: completedTasks.length,
                riskLevel,
                progress: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0
              },
              aiRecommendation: aiSuggestion?.recommendation
            },
            createdAt: new Date().toISOString()
          });
        }

        // 2. Milestone deadlines - projects with due dates approaching
        if (project.due_date) {
          const dueDate = new Date(project.due_date);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          if (daysUntilDue > 0 && daysUntilDue <= 7) {
            suggestions.push({
              id: `milestone-deadline-${projectId}`,
              type: 'milestone_deadline',
              priority: daysUntilDue <= 2 ? 'high' : daysUntilDue <= 5 ? 'medium' : 'low',
              title: `"${project.name}" Due ${daysUntilDue === 1 ? 'Tomorrow' : `in ${daysUntilDue} Days`}`,
              description: `${completedTasks.length}/${allTasks.length} tasks completed`,
              actionLabel: 'View Project',
              actionUrl: `/projects/${projectId}`,
              metadata: {
                project: {
                  projectId,
                  projectName: project.name,
                  dueDate: project.due_date,
                  daysUntilDue,
                  completedTasks: completedTasks.length,
                  totalTasks: allTasks.length,
                  progress: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0
                }
              },
              createdAt: new Date().toISOString()
            });
          } else if (daysUntilDue < 0) {
            const daysOverdue = Math.abs(daysUntilDue);
            suggestions.push({
              id: `project-overdue-${projectId}`,
              type: 'milestone_deadline',
              priority: 'high',
              title: `"${project.name}" is ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''} Overdue`,
              description: `${activeTasks.length} tasks remaining`,
              actionLabel: 'View Project',
              actionUrl: `/projects/${projectId}`,
              metadata: {
                project: {
                  projectId,
                  projectName: project.name,
                  dueDate: project.due_date,
                  daysOverdue,
                  completedTasks: completedTasks.length,
                  totalTasks: allTasks.length
                }
              },
              createdAt: new Date().toISOString()
            });
          }
        }

        // 3. Inactive projects - no activity in 14+ days
        const lastActivity = project.updated_at || project.created_at;
        const lastActivityDate = new Date(lastActivity);

        if (lastActivityDate < twoWeeksAgo && activeTasks.length > 0 && project.status !== 'completed' && project.status !== 'archived') {
          const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000));

          suggestions.push({
            id: `inactive-project-${projectId}`,
            type: 'inactive_project',
            priority: daysSinceActivity > 30 ? 'medium' : 'low',
            title: `"${project.name}" Needs Attention`,
            description: `No activity in ${daysSinceActivity} days with ${activeTasks.length} pending tasks`,
            actionLabel: 'View Project',
            actionUrl: `/projects/${projectId}`,
            metadata: {
              project: {
                projectId,
                projectName: project.name,
                lastActivity,
                daysSinceActivity,
                totalTasks: activeTasks.length
              }
            },
            createdAt: new Date().toISOString()
          });
        }

        // 4. Project completion celebration
        if (allTasks.length >= 5 && completedTasks.length === allTasks.length && activeTasks.length === 0) {
          // Check if completed recently (within last 24 hours)
          const lastCompletedTask = completedTasks.sort((a, b) =>
            new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime()
          )[0];

          if (lastCompletedTask) {
            const completedAt = new Date(lastCompletedTask.completed_at || lastCompletedTask.updated_at);
            const hoursSinceCompletion = (now.getTime() - completedAt.getTime()) / (60 * 60 * 1000);

            if (hoursSinceCompletion <= 24) {
              suggestions.push({
                id: `project-completion-${projectId}`,
                type: 'project_completion',
                priority: 'low',
                title: `Congratulations! "${project.name}" Complete`,
                description: `All ${allTasks.length} tasks have been completed`,
                actionLabel: 'View Project',
                actionUrl: `/projects/${projectId}`,
                metadata: {
                  project: {
                    projectId,
                    projectName: project.name,
                    completedTasks: completedTasks.length,
                    totalTasks: allTasks.length,
                    progress: 100
                  }
                },
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }

      // Limit project suggestions to avoid spam
      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error getting project suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // TEAM/ACTIVITY MODULE SUGGESTIONS
  // ============================================

  /**
   * Get team activity suggestions (inactive members, engagement drops, celebrations)
   * NOTE: Only shown to workspace owners/admins
   * @param workspaceId - Workspace ID
   * @param requestingUserId - The user requesting suggestions (to exclude from suggestions about themselves)
   */
  private async getTeamSuggestions(workspaceId: string, requestingUserId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get workspace members
      const membersResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
        is_active: true
      });
      const members = membersResult.data || [];

      if (members.length < 2) return suggestions; // Skip if solo workspace

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Get projects for task counting
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = projectsResult.data || [];
      const projectIds = projects.map((p: any) => p.id);

      // Get all tasks
      const tasksResult = await this.db.table('tasks')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));
      const allTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];
      const workspaceTasks = allTasks.filter(t => projectIds.includes(t.project_id));

      // Analyze each member (exclude the requesting user from analysis for inactive/engagement suggestions)
      const memberStats: Array<{
        userId: string;
        userName: string;
        userAvatar: string | null;
        lastActive: Date;
        tasksCompletedThisWeek: number;
        tasksCompletedLastWeek: number;
      }> = [];

      for (const member of members) {
        // Get user profile
        const userProfile = await this.db.getUserById(member.user_id);
        let userName = 'Team member';
        let userAvatar: string | null = null;

        if (userProfile) {
          const profile = userProfile as any;
          const metadata = profile.metadata || {};
          userName = metadata.name || profile.full_name || profile.name || profile.email || 'Team member';
          userAvatar = profile.avatar_url || null;
        }

        // Calculate last activity
        const memberTasks = workspaceTasks.filter(t => {
          const assignees = t.assigned_to || [];
          return assignees.includes(member.user_id);
        });

        const recentActivity = memberTasks
          .filter(t => t.updated_at)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

        const lastActive = recentActivity
          ? new Date(recentActivity.updated_at)
          : new Date(member.joined_at || member.created_at);

        // Count tasks completed this week vs last week
        const tasksCompletedThisWeek = memberTasks.filter(t => {
          if (t.status !== 'completed' && !t.completed_at) return false;
          const completedAt = new Date(t.completed_at || t.updated_at);
          return completedAt >= sevenDaysAgo;
        }).length;

        const tasksCompletedLastWeek = memberTasks.filter(t => {
          if (t.status !== 'completed' && !t.completed_at) return false;
          const completedAt = new Date(t.completed_at || t.updated_at);
          return completedAt >= fourteenDaysAgo && completedAt < sevenDaysAgo;
        }).length;

        memberStats.push({
          userId: member.user_id,
          userName,
          userAvatar,
          lastActive,
          tasksCompletedThisWeek,
          tasksCompletedLastWeek
        });
      }

      // 1. Inactive members - no activity in 14+ days
      // IMPORTANT: Exclude the requesting user - they should never see a suggestion about themselves
      const inactiveMembers = memberStats.filter(m =>
        m.lastActive < fourteenDaysAgo && m.userId !== requestingUserId
      );
      if (inactiveMembers.length > 0 && inactiveMembers.length < members.length) {
        const mostInactive = inactiveMembers.sort((a, b) => a.lastActive.getTime() - b.lastActive.getTime())[0];
        const daysSinceActive = Math.floor((now.getTime() - mostInactive.lastActive.getTime()) / (24 * 60 * 60 * 1000));

        suggestions.push({
          id: `inactive-member-${mostInactive.userId}`,
          type: 'inactive_member',
          priority: daysSinceActive > 30 ? 'medium' : 'low',
          title: `${mostInactive.userName} May Need Support`,
          description: `No activity in ${daysSinceActive} days. Consider reaching out.`,
          actionLabel: 'View Team',
          actionUrl: '/team',
          metadata: {
            team: {
              userId: mostInactive.userId,
              userName: mostInactive.userName,
              userAvatar: mostInactive.userAvatar,
              lastActive: mostInactive.lastActive.toISOString(),
              daysSinceActive
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 2. Engagement drops - members who completed fewer tasks this week
      // IMPORTANT: Exclude the requesting user - they should never see a suggestion about themselves
      const engagementDrops = memberStats.filter(m =>
        m.userId !== requestingUserId &&
        m.tasksCompletedLastWeek >= 3 &&
        m.tasksCompletedThisWeek < m.tasksCompletedLastWeek * 0.5
      );

      if (engagementDrops.length > 0) {
        const biggestDrop = engagementDrops.sort((a, b) =>
          (b.tasksCompletedLastWeek - b.tasksCompletedThisWeek) -
          (a.tasksCompletedLastWeek - a.tasksCompletedThisWeek)
        )[0];

        suggestions.push({
          id: `engagement-drop-${biggestDrop.userId}`,
          type: 'engagement_drop',
          priority: 'low',
          title: `${biggestDrop.userName}'s Productivity Dropped`,
          description: `Completed ${biggestDrop.tasksCompletedThisWeek} tasks this week vs ${biggestDrop.tasksCompletedLastWeek} last week`,
          actionLabel: 'View Details',
          actionUrl: '/team',
          metadata: {
            team: {
              userId: biggestDrop.userId,
              userName: biggestDrop.userName,
              userAvatar: biggestDrop.userAvatar,
              tasksCompleted: biggestDrop.tasksCompletedThisWeek,
              previousTasksCompleted: biggestDrop.tasksCompletedLastWeek
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 3. Team celebration - high performers this week (can include requesting user - positive feedback is ok)
      const highPerformers = memberStats.filter(m => m.tasksCompletedThisWeek >= 10);
      if (highPerformers.length > 0) {
        const topPerformer = highPerformers.sort((a, b) => b.tasksCompletedThisWeek - a.tasksCompletedThisWeek)[0];

        suggestions.push({
          id: `team-celebration-${topPerformer.userId}`,
          type: 'team_celebration',
          priority: 'low',
          title: `${topPerformer.userName} is on Fire!`,
          description: `Completed ${topPerformer.tasksCompletedThisWeek} tasks this week`,
          actionLabel: 'Celebrate',
          actionUrl: '/team',
          metadata: {
            team: {
              userId: topPerformer.userId,
              userName: topPerformer.userName,
              userAvatar: topPerformer.userAvatar,
              tasksCompleted: topPerformer.tasksCompletedThisWeek,
              celebrationReason: 'high_productivity'
            }
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error getting team suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // SPRINT/AGILE MODULE SUGGESTIONS
  // ============================================

  /**
   * Get sprint-related suggestions (ending soon, velocity drops, retrospectives)
   */
  private async getSprintSuggestions(workspaceId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get projects for this workspace
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = (projectsResult.data || []).filter((p: any) => !p.is_deleted);

      const now = new Date();

      for (const project of projects) {
        // Get sprints for this project
        const sprintsResult = await this.db.table('sprints')
          .select('*')
          .where('project_id', '=', project.id)
          .execute()
          .catch(() => ({ data: [] }));

        const sprints = Array.isArray(sprintsResult.data) ? sprintsResult.data : [];

        // Find active sprint
        const activeSprint = sprints.find((s: any) => s.status === 'active' || s.is_active);

        if (activeSprint) {
          // Get tasks for this sprint
          const tasksResult = await this.db.table('tasks')
            .select('*')
            .where('sprint_id', '=', activeSprint.id)
            .execute()
            .catch(() => ({ data: [] }));

          const sprintTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];

          // Get project's done stage
          const kanbanStages = project.kanban_stages || [];
          let doneStageId: string | number | null = null;
          if (kanbanStages.length > 0) {
            const sortedStages = [...kanbanStages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            doneStageId = sortedStages[sortedStages.length - 1]?.id;
          }

          const completedTasks = sprintTasks.filter(t => {
            if (doneStageId === null) return t.status === 'completed';
            return t.status === doneStageId || String(t.status) === String(doneStageId);
          });

          const incompleteTasks = sprintTasks.length - completedTasks.length;
          const completionPercentage = sprintTasks.length > 0
            ? Math.round((completedTasks.length / sprintTasks.length) * 100)
            : 0;

          // 1. Sprint ending soon
          if (activeSprint.end_date) {
            const endDate = new Date(activeSprint.end_date);
            const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            if (daysRemaining > 0 && daysRemaining <= 3 && incompleteTasks > 0) {
              suggestions.push({
                id: `sprint-ending-${activeSprint.id}`,
                type: 'sprint_ending_soon',
                priority: daysRemaining <= 1 ? 'high' : 'medium',
                title: `Sprint "${activeSprint.name}" Ending ${daysRemaining === 1 ? 'Tomorrow' : `in ${daysRemaining} Days`}`,
                description: `${incompleteTasks} task${incompleteTasks > 1 ? 's' : ''} still incomplete (${completionPercentage}% done)`,
                actionLabel: 'View Sprint',
                actionUrl: `/projects/${project.id}?sprint=${activeSprint.id}`,
                metadata: {
                  sprint: {
                    sprintId: activeSprint.id,
                    sprintName: activeSprint.name,
                    projectId: project.id,
                    projectName: project.name,
                    endDate: activeSprint.end_date,
                    daysRemaining,
                    totalTasks: sprintTasks.length,
                    completedTasks: completedTasks.length,
                    incompleteTasks,
                    completionPercentage
                  }
                },
                createdAt: new Date().toISOString()
              });
            }

            // Sprint overdue
            if (daysRemaining < 0 && incompleteTasks > 0) {
              const daysOverdue = Math.abs(daysRemaining);
              suggestions.push({
                id: `sprint-overdue-${activeSprint.id}`,
                type: 'sprint_ending_soon',
                priority: 'high',
                title: `Sprint "${activeSprint.name}" is ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''} Overdue`,
                description: `${incompleteTasks} incomplete task${incompleteTasks > 1 ? 's' : ''} need attention`,
                actionLabel: 'Review Sprint',
                actionUrl: `/projects/${project.id}?sprint=${activeSprint.id}`,
                metadata: {
                  sprint: {
                    sprintId: activeSprint.id,
                    sprintName: activeSprint.name,
                    projectId: project.id,
                    projectName: project.name,
                    endDate: activeSprint.end_date,
                    daysRemaining,
                    totalTasks: sprintTasks.length,
                    completedTasks: completedTasks.length,
                    incompleteTasks,
                    completionPercentage
                  }
                },
                createdAt: new Date().toISOString()
              });
            }
          }

          // 2. Sprint has no tasks
          if (sprintTasks.length === 0) {
            suggestions.push({
              id: `sprint-no-tasks-${activeSprint.id}`,
              type: 'sprint_no_tasks',
              priority: 'medium',
              title: `Sprint "${activeSprint.name}" Has No Tasks`,
              description: `Add tasks from backlog to plan this sprint`,
              actionLabel: 'Plan Sprint',
              actionUrl: `/projects/${project.id}?sprint=${activeSprint.id}`,
              metadata: {
                sprint: {
                  sprintId: activeSprint.id,
                  sprintName: activeSprint.name,
                  projectId: project.id,
                  projectName: project.name,
                  totalTasks: 0
                }
              },
              createdAt: new Date().toISOString()
            });
          }
        }

        // 3. Check for completed sprints needing retrospective
        const recentlyCompletedSprints = sprints.filter((s: any) => {
          if (s.status !== 'completed' && !s.completed_at) return false;
          const completedAt = new Date(s.completed_at || s.updated_at);
          const daysSinceCompletion = (now.getTime() - completedAt.getTime()) / (24 * 60 * 60 * 1000);
          return daysSinceCompletion <= 3 && !s.retrospective_completed;
        });

        for (const sprint of recentlyCompletedSprints.slice(0, 1)) {
          suggestions.push({
            id: `sprint-retro-${sprint.id}`,
            type: 'sprint_retrospective',
            priority: 'low',
            title: `Retrospective Needed: "${sprint.name}"`,
            description: 'Review what went well and what could be improved',
            actionLabel: 'Start Retrospective',
            actionUrl: `/projects/${project.id}?sprint=${sprint.id}&retro=true`,
            metadata: {
              sprint: {
                sprintId: sprint.id,
                sprintName: sprint.name,
                projectId: project.id,
                projectName: project.name
              }
            },
            createdAt: new Date().toISOString()
          });
        }

        // 4. Backlog grooming needed
        const backlogTasks = await this.db.table('tasks')
          .select('*')
          .where('project_id', '=', project.id)
          .execute()
          .catch(() => ({ data: [] }));

        const allProjectTasks = Array.isArray(backlogTasks.data) ? backlogTasks.data : [];
        const unassignedBacklogItems = allProjectTasks.filter(t =>
          !t.sprint_id && (!t.assigned_to || t.assigned_to.length === 0)
        );

        if (unassignedBacklogItems.length >= 10) {
          suggestions.push({
            id: `backlog-grooming-${project.id}`,
            type: 'backlog_grooming',
            priority: 'low',
            title: `Backlog Needs Grooming: ${project.name}`,
            description: `${unassignedBacklogItems.length} unassigned items in backlog`,
            actionLabel: 'View Backlog',
            actionUrl: `/projects/${project.id}?view=backlog`,
            metadata: {
              sprint: {
                projectId: project.id,
                projectName: project.name,
                backlogItemCount: unassignedBacklogItems.length
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error getting sprint suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // BILLING/SUBSCRIPTION MODULE SUGGESTIONS
  // ============================================

  /**
   * Get billing-related suggestions (subscription expiry, payment issues, usage limits)
   */
  private async getBillingSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      // Get workspace subscription info
      const workspaceResult = await this.db.findOne('workspaces', { id: workspaceId });
      const workspace = workspaceResult;

      if (!workspace) return suggestions;

      const now = new Date();

      // Get subscription data (if exists)
      const subscriptionResult = await this.db.table('subscriptions')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', 'active')
        .limit(1)
        .execute()
        .catch(() => ({ data: [] }));

      const subscriptions = Array.isArray(subscriptionResult.data) ? subscriptionResult.data : [];
      const subscription = subscriptions[0];

      if (subscription) {
        // 1. Subscription expiring soon
        if (subscription.current_period_end) {
          const expiryDate = new Date(subscription.current_period_end);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          if (daysUntilExpiry > 0 && daysUntilExpiry <= 7 && !subscription.cancel_at_period_end) {
            suggestions.push({
              id: `subscription-expiring-${subscription.id}`,
              type: 'subscription_expiring',
              priority: daysUntilExpiry <= 3 ? 'high' : 'medium',
              title: `Subscription Renewing ${daysUntilExpiry === 1 ? 'Tomorrow' : `in ${daysUntilExpiry} Days`}`,
              description: `Your ${subscription.plan_name || 'subscription'} will renew automatically`,
              actionLabel: 'Manage Subscription',
              actionUrl: '/settings/billing',
              metadata: {
                billing: {
                  subscriptionId: subscription.id,
                  planName: subscription.plan_name,
                  planTier: subscription.plan_tier,
                  expiryDate: subscription.current_period_end,
                  daysUntilExpiry
                }
              },
              createdAt: new Date().toISOString()
            });
          }

          // Subscription canceling
          if (subscription.cancel_at_period_end && daysUntilExpiry > 0 && daysUntilExpiry <= 14) {
            suggestions.push({
              id: `subscription-canceling-${subscription.id}`,
              type: 'subscription_expiring',
              priority: daysUntilExpiry <= 3 ? 'high' : 'medium',
              title: `Subscription Ending ${daysUntilExpiry === 1 ? 'Tomorrow' : `in ${daysUntilExpiry} Days`}`,
              description: 'Your access will be limited after cancellation',
              actionLabel: 'Reactivate',
              actionUrl: '/settings/billing',
              metadata: {
                billing: {
                  subscriptionId: subscription.id,
                  planName: subscription.plan_name,
                  expiryDate: subscription.current_period_end,
                  daysUntilExpiry
                }
              },
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 2. Check usage limits
      const usageLimits = workspace.usage_limits || {};
      const currentUsage = workspace.current_usage || {};

      // Storage usage
      if (usageLimits.storage_bytes && currentUsage.storage_bytes) {
        const usagePercentage = (currentUsage.storage_bytes / usageLimits.storage_bytes) * 100;
        if (usagePercentage >= 80) {
          suggestions.push({
            id: `usage-storage-${workspaceId}`,
            type: 'usage_limit_approaching',
            priority: usagePercentage >= 95 ? 'high' : 'medium',
            title: `Storage ${usagePercentage >= 95 ? 'Almost Full' : 'Running Low'}`,
            description: `Using ${Math.round(usagePercentage)}% of storage limit`,
            actionLabel: usagePercentage >= 95 ? 'Upgrade Plan' : 'Manage Storage',
            actionUrl: usagePercentage >= 95 ? '/settings/billing' : '/files',
            metadata: {
              billing: {
                currentUsage: currentUsage.storage_bytes,
                usageLimit: usageLimits.storage_bytes,
                usagePercentage: Math.round(usagePercentage),
                usageType: 'storage'
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      // AI credits usage
      if (usageLimits.ai_credits && currentUsage.ai_credits) {
        const usagePercentage = (currentUsage.ai_credits / usageLimits.ai_credits) * 100;
        if (usagePercentage >= 80) {
          suggestions.push({
            id: `usage-ai-${workspaceId}`,
            type: 'usage_limit_approaching',
            priority: usagePercentage >= 95 ? 'high' : 'medium',
            title: `AI Credits ${usagePercentage >= 95 ? 'Nearly Exhausted' : 'Running Low'}`,
            description: `${Math.round(usageLimits.ai_credits - currentUsage.ai_credits)} credits remaining`,
            actionLabel: 'Get More Credits',
            actionUrl: '/settings/billing',
            metadata: {
              billing: {
                currentUsage: currentUsage.ai_credits,
                usageLimit: usageLimits.ai_credits,
                usagePercentage: Math.round(usagePercentage),
                usageType: 'ai_credits'
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      // Team seats usage
      if (usageLimits.team_seats) {
        const membersResult = await this.db.findMany('workspace_members', {
          workspace_id: workspaceId,
          is_active: true
        });
        const memberCount = (membersResult.data || []).length;
        const usagePercentage = (memberCount / usageLimits.team_seats) * 100;

        if (usagePercentage >= 90) {
          suggestions.push({
            id: `usage-seats-${workspaceId}`,
            type: 'usage_limit_approaching',
            priority: memberCount >= usageLimits.team_seats ? 'high' : 'medium',
            title: memberCount >= usageLimits.team_seats ? 'Team Seat Limit Reached' : 'Team Seats Almost Full',
            description: `${memberCount}/${usageLimits.team_seats} seats used`,
            actionLabel: 'Upgrade Plan',
            actionUrl: '/settings/billing',
            metadata: {
              billing: {
                currentUsage: memberCount,
                usageLimit: usageLimits.team_seats,
                usagePercentage: Math.round(usagePercentage),
                usageType: 'seats'
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      // 3. Upgrade recommendation based on usage patterns
      if (!subscription || subscription.plan_tier === 'free' || subscription.plan_tier === 'starter') {
        // Check if workspace would benefit from upgrade
        const membersResult = await this.db.findMany('workspace_members', {
          workspace_id: workspaceId,
          is_active: true
        });
        const memberCount = (membersResult.data || []).length;

        const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
        const projectCount = (projectsResult.data || []).length;

        // Suggest upgrade if usage indicates need
        if (memberCount >= 5 || projectCount >= 10) {
          suggestions.push({
            id: `upgrade-recommendation-${workspaceId}`,
            type: 'upgrade_recommendation',
            priority: 'low',
            title: 'Unlock More Features',
            description: `Your workspace has ${memberCount} members and ${projectCount} projects. Upgrade for advanced features.`,
            actionLabel: 'View Plans',
            actionUrl: '/settings/billing',
            metadata: {
              billing: {
                planTier: subscription?.plan_tier || 'free',
                recommendedPlan: memberCount >= 10 ? 'business' : 'pro'
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error getting billing suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // CHAT/MENTIONS MODULE SUGGESTIONS
  // ============================================

  /**
   * Get chat mention suggestions (unanswered mentions, pending DMs, inactive channels)
   */
  private async getChatMentionSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get channels user is a member of
      const membershipResult = await this.db.table('channel_members')
        .select('*')
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute()
        .catch(() => ({ data: [] }));

      const memberships = Array.isArray(membershipResult.data) ? membershipResult.data : [];
      const channelIds = memberships.map(m => m.channel_id);

      // 1. Unanswered mentions in channels
      for (const channelId of channelIds.slice(0, 10)) {
        const messagesResult = await this.db.table('messages')
          .select('*')
          .where('channel_id', '=', channelId)
          .execute()
          .catch(() => ({ data: [] }));

        const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];

        // Find messages that mention this user
        const mentionedMessages = messages.filter(msg => {
          if (msg.user_id === userId) return false; // Don't include own messages
          const msgDate = new Date(msg.created_at);
          if (msgDate < twentyFourHoursAgo) return false; // Only recent mentions

          // Check for @mention in content
          const mentions = msg.mentions || [];
          const contentMention = msg.content?.includes(`@${userId}`) || msg.content?.includes(`<@${userId}>`);
          return mentions.includes(userId) || contentMention;
        });

        // Check if user has replied after being mentioned
        for (const mention of mentionedMessages.slice(0, 3)) {
          const mentionTime = new Date(mention.created_at);
          const userReplied = messages.some(msg =>
            msg.user_id === userId &&
            new Date(msg.created_at) > mentionTime
          );

          if (!userReplied) {
            const hoursSinceMention = Math.round((now.getTime() - mentionTime.getTime()) / (60 * 60 * 1000));

            // Get channel info
            const channelResult = await this.db.findOne('channels', { id: channelId });
            const channel = channelResult;

            // Get sender info
            const senderProfile = await this.db.getUserById(mention.user_id);
            let senderName = 'Someone';
            let senderAvatar: string | null = null;
            if (senderProfile) {
              const profile = senderProfile as any;
              const metadata = profile.metadata || {};
              senderName = metadata.name || profile.full_name || profile.name || 'Someone';
              senderAvatar = profile.avatar_url || null;
            }

            suggestions.push({
              id: `unanswered-mention-${mention.id}`,
              type: 'unanswered_mention',
              priority: hoursSinceMention >= 4 ? 'high' : 'medium',
              title: `${senderName} mentioned you`,
              description: `In #${channel?.name || 'channel'} • ${hoursSinceMention}h ago`,
              actionLabel: 'Reply',
              actionUrl: `/chat/${channelId}?message=${mention.id}`,
              metadata: {
                mention: {
                  messageId: mention.id,
                  channelId,
                  channelName: channel?.name,
                  senderId: mention.user_id,
                  senderName,
                  senderAvatar,
                  messagePreview: mention.content?.substring(0, 100),
                  mentionedAt: mention.created_at,
                  hoursSinceMention
                }
              },
              createdAt: new Date().toISOString()
            });
            break; // Only one suggestion per channel
          }
        }
      }

      // 2. Pending DM responses
      const convMembershipResult = await this.db.table('conversation_members')
        .select('*')
        .where('user_id', '=', userId)
        .execute()
        .catch(() => ({ data: [] }));

      const convMemberships = Array.isArray(convMembershipResult.data) ? convMembershipResult.data : [];

      for (const convMembership of convMemberships.slice(0, 5)) {
        const convMessagesResult = await this.db.table('conversation_messages')
          .select('*')
          .where('conversation_id', '=', convMembership.conversation_id)
          .execute()
          .catch(() => ({ data: [] }));

        const convMessages = Array.isArray(convMessagesResult.data) ? convMessagesResult.data : [];

        // Sort by date descending
        convMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Check if last message is from someone else and user hasn't replied
        const lastMessage = convMessages[0];
        if (lastMessage && lastMessage.sender_id !== userId) {
          const lastMsgTime = new Date(lastMessage.created_at);
          const hoursSinceMessage = Math.round((now.getTime() - lastMsgTime.getTime()) / (60 * 60 * 1000));

          // Only if recent (within 24h) and user hasn't replied
          if (hoursSinceMessage <= 24 && hoursSinceMessage >= 2) {
            // Get sender info
            const senderProfile = await this.db.getUserById(lastMessage.sender_id);
            let senderName = 'Someone';
            let senderAvatar: string | null = null;
            if (senderProfile) {
              const profile = senderProfile as any;
              const metadata = profile.metadata || {};
              senderName = metadata.name || profile.full_name || profile.name || 'Someone';
              senderAvatar = profile.avatar_url || null;
            }

            suggestions.push({
              id: `pending-dm-${convMembership.conversation_id}`,
              type: 'pending_dm_response',
              priority: hoursSinceMessage >= 8 ? 'medium' : 'low',
              title: `Message from ${senderName} awaiting reply`,
              description: `${hoursSinceMessage}h ago`,
              actionLabel: 'Reply',
              actionUrl: `/chat/dm/${convMembership.conversation_id}`,
              metadata: {
                mention: {
                  conversationId: convMembership.conversation_id,
                  senderId: lastMessage.sender_id,
                  senderName,
                  senderAvatar,
                  messagePreview: lastMessage.content?.substring(0, 100),
                  hoursSinceMention: hoursSinceMessage
                }
              },
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 3. Inactive channels suggestion
      const channelsResult = await this.db.findMany('channels', {
        workspace_id: workspaceId,
        is_archived: false
      });
      const channels = channelsResult.data || [];

      // Check which channels have had no activity
      const inactiveChannels: any[] = [];
      for (const channel of channels) {
        const messagesResult = await this.db.table('messages')
          .select('created_at')
          .where('channel_id', '=', channel.id)
          .execute()
          .catch(() => ({ data: [] }));

        const messages = Array.isArray(messagesResult.data) ? messagesResult.data : [];
        const lastMessage = messages.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const lastActivityDate = lastMessage
          ? new Date(lastMessage.created_at)
          : new Date(channel.created_at);

        if (lastActivityDate < thirtyDaysAgo) {
          const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000));
          inactiveChannels.push({ ...channel, lastActivityDate, daysSinceActivity });
        }
      }

      if (inactiveChannels.length >= 3) {
        const oldestChannel = inactiveChannels.sort((a, b) =>
          a.lastActivityDate.getTime() - b.lastActivityDate.getTime()
        )[0];

        suggestions.push({
          id: `inactive-channels-${workspaceId}`,
          type: 'inactive_channel',
          priority: 'low',
          title: `${inactiveChannels.length} Inactive Channels`,
          description: `#${oldestChannel.name} has been quiet for ${oldestChannel.daysSinceActivity} days`,
          actionLabel: 'Review Channels',
          actionUrl: '/chat/settings',
          metadata: {
            mention: {
              channelId: oldestChannel.id,
              channelName: oldestChannel.name,
              lastActivityDate: oldestChannel.lastActivityDate.toISOString(),
              daysSinceActivity: oldestChannel.daysSinceActivity
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Error getting chat mention suggestions:', error);
    }

    return suggestions;
  }

  // ============================================
  // ANALYTICS/INSIGHTS MODULE SUGGESTIONS
  // ============================================

  /**
   * Get analytics-related suggestions (weekly reports, productivity milestones, trends)
   */
  private async getAnalyticsSuggestions(workspaceId: string, userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Get workspace members
      const membersResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
        is_active: true
      });
      const members = membersResult.data || [];

      // Get projects for this workspace
      const projectsResult = await this.db.findMany('projects', { workspace_id: workspaceId });
      const projects = (projectsResult.data || []).filter((p: any) => !p.is_deleted);
      const projectIds = projects.map((p: any) => p.id);

      // Get all tasks
      const tasksResult = await this.db.table('tasks')
        .select('*')
        .execute()
        .catch(() => ({ data: [] }));

      const allTasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];
      const workspaceTasks = allTasks.filter(t => projectIds.includes(t.project_id));

      // Build a map of project done stage IDs
      const projectDoneStageMap = new Map<string, string | number | null>();
      for (const project of projects) {
        const kanbanStages = project.kanban_stages || [];
        let doneStageId: string | number | null = null;
        if (kanbanStages.length > 0) {
          const sortedStages = [...kanbanStages].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          doneStageId = sortedStages[sortedStages.length - 1]?.id;
        }
        projectDoneStageMap.set(project.id, doneStageId);
      }

      // Calculate tasks completed this week vs last week
      const tasksCompletedThisWeek = workspaceTasks.filter(t => {
        const doneStageId = projectDoneStageMap.get(t.project_id);
        const isCompleted = doneStageId !== null
          ? (t.status === doneStageId || String(t.status) === String(doneStageId))
          : t.status === 'completed';
        if (!isCompleted) return false;

        const completedAt = new Date(t.completed_at || t.updated_at);
        return completedAt >= sevenDaysAgo;
      }).length;

      const tasksCompletedLastWeek = workspaceTasks.filter(t => {
        const doneStageId = projectDoneStageMap.get(t.project_id);
        const isCompleted = doneStageId !== null
          ? (t.status === doneStageId || String(t.status) === String(doneStageId))
          : t.status === 'completed';
        if (!isCompleted) return false;

        const completedAt = new Date(t.completed_at || t.updated_at);
        return completedAt >= fourteenDaysAgo && completedAt < sevenDaysAgo;
      }).length;

      // 1. Weekly report ready (on Mondays)
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 1 && members.length >= 2) { // Monday
        suggestions.push({
          id: `weekly-report-${workspaceId}`,
          type: 'weekly_report_ready',
          priority: 'low',
          title: 'Weekly Report Available',
          description: `${tasksCompletedLastWeek} tasks completed last week`,
          actionLabel: 'View Report',
          actionUrl: '/analytics?period=week',
          metadata: {
            analytics: {
              reportType: 'weekly',
              reportPeriod: sevenDaysAgo.toISOString(),
              currentValue: tasksCompletedLastWeek,
              teamSize: members.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 2. Productivity milestone
      const totalCompletedTasks = workspaceTasks.filter(t => {
        const doneStageId = projectDoneStageMap.get(t.project_id);
        return doneStageId !== null
          ? (t.status === doneStageId || String(t.status) === String(doneStageId))
          : t.status === 'completed';
      }).length;

      const milestones = [10, 25, 50, 100, 250, 500, 1000];
      const nextMilestone = milestones.find(m => m > totalCompletedTasks);
      const reachedMilestone = milestones.filter(m => m <= totalCompletedTasks).pop();

      // Check if milestone was just reached (within last 24 hours)
      if (reachedMilestone && totalCompletedTasks >= reachedMilestone && totalCompletedTasks < reachedMilestone + 5) {
        suggestions.push({
          id: `milestone-${reachedMilestone}-${workspaceId}`,
          type: 'productivity_milestone',
          priority: 'low',
          title: `${reachedMilestone} Tasks Milestone Reached!`,
          description: 'Your team has reached a productivity milestone. Keep up the great work!',
          actionLabel: 'Celebrate',
          actionUrl: '/analytics',
          metadata: {
            analytics: {
              milestoneType: 'tasks_completed',
              milestoneValue: reachedMilestone,
              currentValue: totalCompletedTasks,
              teamSize: members.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }

      // 3. Productivity trend down
      if (tasksCompletedLastWeek >= 5) {
        const changePercentage = tasksCompletedLastWeek > 0
          ? ((tasksCompletedThisWeek - tasksCompletedLastWeek) / tasksCompletedLastWeek) * 100
          : 0;

        if (changePercentage <= -30) {
          suggestions.push({
            id: `productivity-trend-${workspaceId}`,
            type: 'productivity_trend_down',
            priority: 'medium',
            title: 'Team Productivity Decreased',
            description: `${Math.abs(Math.round(changePercentage))}% fewer tasks completed this week`,
            actionLabel: 'Analyze',
            actionUrl: '/analytics',
            metadata: {
              analytics: {
                metricName: 'tasks_completed',
                currentValue: tasksCompletedThisWeek,
                previousValue: tasksCompletedLastWeek,
                changePercentage: Math.round(changePercentage),
                trend: 'down'
              }
            },
            createdAt: new Date().toISOString()
          });
        }
      }

      // 4. Team achievement
      if (tasksCompletedThisWeek >= 20 && tasksCompletedThisWeek > tasksCompletedLastWeek * 1.5) {
        suggestions.push({
          id: `team-achievement-${workspaceId}`,
          type: 'team_achievement',
          priority: 'low',
          title: 'Outstanding Week!',
          description: `Your team completed ${tasksCompletedThisWeek} tasks - 50%+ more than last week`,
          actionLabel: 'View Details',
          actionUrl: '/analytics',
          metadata: {
            analytics: {
              achievementType: 'high_productivity',
              achievementDescription: 'Outstanding weekly performance',
              currentValue: tasksCompletedThisWeek,
              previousValue: tasksCompletedLastWeek,
              teamSize: members.length
            }
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error getting analytics suggestions:', error);
    }

    return suggestions;
  }
}