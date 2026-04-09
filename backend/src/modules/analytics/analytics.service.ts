import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AnalyticsQueryDto, AnalyticsTimeRange } from './dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  private getDateRange(timeRange: AnalyticsTimeRange, startDate?: string, endDate?: string) {
    const now = new Date();
    const start = new Date();

    switch (timeRange) {
      case AnalyticsTimeRange.TODAY:
        start.setHours(0, 0, 0, 0);
        break;
      case AnalyticsTimeRange.WEEK:
        start.setDate(now.getDate() - 7);
        break;
      case AnalyticsTimeRange.MONTH:
        start.setMonth(now.getMonth() - 1);
        break;
      case AnalyticsTimeRange.QUARTER:
        start.setMonth(now.getMonth() - 3);
        break;
      case AnalyticsTimeRange.YEAR:
        start.setFullYear(now.getFullYear() - 1);
        break;
      case AnalyticsTimeRange.CUSTOM:
        if (startDate && endDate) {
          return {
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
          };
        }
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }

  async getWorkspaceAnalytics(workspaceId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    // Get overview metrics
    const [users, projects, tasks, activities] = await Promise.all([
      this.getUserStats(workspaceId, startDate, endDate),
      this.getProjectStats(workspaceId, startDate, endDate),
      this.getTaskStats(workspaceId, startDate, endDate),
      this.getActivityStats(workspaceId, startDate, endDate),
    ]);

    return {
      timeRange: {
        startDate,
        endDate,
        range: query.timeRange,
      },
      overview: {
        totalUsers: users.total,
        activeUsers: users.active,
        totalProjects: projects.total,
        activeProjects: projects.active,
        totalTasks: tasks.total,
        completedTasks: tasks.completed,
        totalActivities: activities.total,
      },
      trends: {
        userGrowth: users.growth,
        projectGrowth: projects.growth,
        taskCompletion: tasks.completionRate,
        activityVolume: activities.volume,
      },
    };
  }

  async getUserAnalytics(workspaceId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    // Get user activities
    const activitiesResult = await this.db.table('activity_logs')
      .select('user_id', 'action', 'created_at')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .execute();

    const activities = activitiesResult.data || [];

    // Get workspace members
    const membersResult = await this.db.table('workspace_members')
      .select('user_id', 'role', 'joined_at', 'last_active_at')
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    const members = membersResult.data || [];

    // Process user activity data
    const userActivityMap = new Map();
    activities.forEach(activity => {
      const userId = activity.user_id;
      if (!userActivityMap.has(userId)) {
        userActivityMap.set(userId, {
          userId,
          totalActions: 0,
          actions: {},
          lastActivity: null,
        });
      }
      const userActivity = userActivityMap.get(userId);
      userActivity.totalActions++;
      userActivity.actions[activity.action] = (userActivity.actions[activity.action] || 0) + 1;
      if (!userActivity.lastActivity || new Date(activity.created_at) > new Date(userActivity.lastActivity)) {
        userActivity.lastActivity = activity.created_at;
      }
    });

    return {
      totalMembers: members.length,
      activeUsers: userActivityMap.size,
      userActivities: Array.from(userActivityMap.values()),
      memberRoles: members.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  async getProjectAnalytics(workspaceId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    // Get projects data
    const projectsResult = await this.db.table('projects')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const projects = projectsResult.data || [];

    // Get tasks for projects
    const tasksResult = await this.db.table('tasks')
      .select('project_id', 'status', 'priority', 'created_at', 'due_date', 'completed_at')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .execute();

    const tasks = tasksResult.data || [];

    // Process project statistics
    const projectStats = projects.map(project => {
      const projectTasks = tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.status === 'completed');
      const overdueTasks = projectTasks.filter(task => 
        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
      );

      return {
        projectId: project.id,
        projectName: project.name,
        totalTasks: projectTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0,
        status: project.status,
        priority: project.priority,
      };
    });

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      projectStats,
      averageCompletionRate: projectStats.reduce((acc, p) => acc + p.completionRate, 0) / projectStats.length || 0,
    };
  }

  async getTaskAnalytics(workspaceId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    // Get tasks data
    const tasksResult = await this.db.table('tasks')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .execute();

    const tasks = tasksResult.data || [];

    // Process task statistics
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});

    const priorityCounts = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const completedTasks = tasks.filter(task => task.status === 'completed');
    const overdueTasks = tasks.filter(task => 
      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    );

    // Calculate average completion time
    const averageCompletionTime = completedTasks.reduce((acc, task) => {
      if (task.completed_at && task.created_at) {
        const completionTime = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime();
        return acc + completionTime;
      }
      return acc;
    }, 0) / completedTasks.length || 0;

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      averageCompletionTimeMs: averageCompletionTime,
      statusDistribution: statusCounts,
      priorityDistribution: priorityCounts,
      taskTrends: this.calculateTaskTrends(tasks),
    };
  }

  async getActivityAnalytics(workspaceId: string, query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query.timeRange, query.startDate, query.endDate);

    // Get activity logs
    const activitiesResult = await this.db.table('activity_logs')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .execute();

    const activities = activitiesResult.data || [];

    // Process activity statistics
    const actionCounts = activities.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {});

    const hourlyActivity = activities.reduce((acc, activity) => {
      const hour = new Date(activity.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const dailyActivity = activities.reduce((acc, activity) => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return {
      totalActivities: activities.length,
      actionDistribution: actionCounts,
      hourlyDistribution: hourlyActivity,
      dailyDistribution: dailyActivity,
      mostActiveHours: Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([hour, count]) => ({ hour: parseInt(hour), count })),
      peakActivityDay: Object.entries(dailyActivity)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0] || null,
    };
  }

  private async getUserStats(workspaceId: string, startDate: string, endDate: string) {
    const membersResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    const members = membersResult.data || [];
    const activeMembersResult = await this.db.table('activity_logs')
      .select('user_id')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .groupBy('user_id')
      .execute();

    const activeMembers = activeMembersResult.data || [];

    return {
      total: members.length,
      active: activeMembers.length,
      growth: 0, // Calculate growth based on historical data
    };
  }

  private async getProjectStats(workspaceId: string, startDate: string, endDate: string) {
    const projectsResult = await this.db.table('projects')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const projects = projectsResult.data || [];
    const activeProjects = projects.filter(p => p.status === 'active');

    return {
      total: projects.length,
      active: activeProjects.length,
      growth: 0, // Calculate growth based on historical data
    };
  }

  private async getTaskStats(workspaceId: string, startDate: string, endDate: string) {
    const tasksResult = await this.db.table('tasks')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .execute();

    const tasks = tasksResult.data || [];
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return {
      total: tasks.length,
      completed: completedTasks.length,
      completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
    };
  }

  private async getActivityStats(workspaceId: string, startDate: string, endDate: string) {
    const activitiesResult = await this.db.table('activity_logs')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', startDate)
      .where('created_at', '<=', endDate)
      .execute();

    const activities = activitiesResult.data || [];

    return {
      total: activities.length,
      volume: activities.length, // Activities per day/hour
    };
  }

  private calculateTaskTrends(tasks: any[]) {
    // Group tasks by day
    const dailyTasks = tasks.reduce((acc, task) => {
      const date = new Date(task.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { created: 0, completed: 0 };
      }
      acc[date].created++;
      if (task.status === 'completed' && task.completed_at) {
        const completedDate = new Date(task.completed_at).toISOString().split('T')[0];
        if (!acc[completedDate]) {
          acc[completedDate] = { created: 0, completed: 0 };
        }
        acc[completedDate].completed++;
      }
      return acc;
    }, {});

    return Object.entries(dailyTasks).map(([date, stats]) => ({
      date,
      ...(typeof stats === 'object' && stats !== null ? stats : {}),
    }));
  }
}