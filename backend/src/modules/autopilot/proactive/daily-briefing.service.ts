import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/dto';
import { AppGateway } from '../../../common/gateways/app.gateway';
import { BriefingType, BriefingContentDto } from './dto/proactive.dto';

interface UserWorkspace {
  userId: string;
  workspaceId: string;
  workspaceName?: string;
}

interface BriefingContext {
  overdueTasks: any[];
  todayTasks: any[];
  todayEvents: any[];
  upcomingTasks: any[];
  highPriorityItems: any[];
  recentNotes: any[];
}

@Injectable()
export class DailyBriefingService {
  private readonly logger = new Logger(DailyBriefingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly appGateway: AppGateway,
  ) {}

  /**
   * Generate daily briefings at 8 AM every day
   */
  @Cron('0 8 * * *', { name: 'daily-briefing' })
  async generateDailyBriefings(): Promise<void> {
    this.logger.log('[DailyBriefing] Starting daily briefing generation...');

    try {
      // Get all active workspace members
      const userWorkspaces = await this.getActiveUserWorkspaces();
      this.logger.log(
        `[DailyBriefing] Generating briefings for ${userWorkspaces.length} user-workspace pairs`,
      );

      let generated = 0;
      let errors = 0;

      for (const uw of userWorkspaces) {
        try {
          await this.generateBriefingForUser(uw.userId, uw.workspaceId);
          generated++;
        } catch (error) {
          this.logger.error(
            `[DailyBriefing] Error generating briefing for ${uw.userId}: ${error.message}`,
          );
          errors++;
        }
      }

      this.logger.log(`[DailyBriefing] Complete: ${generated} generated, ${errors} errors`);
    } catch (error) {
      this.logger.error(`[DailyBriefing] Job failed: ${error.message}`);
    }
  }

  /**
   * Generate briefing for a specific user
   */
  async generateBriefingForUser(userId: string, workspaceId: string): Promise<any> {
    this.logger.log(
      `[DailyBriefing] Generating briefing for user ${userId} in workspace ${workspaceId}`,
    );

    // Gather context
    const context = await this.gatherBriefingContext(userId, workspaceId);

    // Generate AI summary and insights
    const aiInsights = await this.generateAIInsights(context, workspaceId, userId);

    // Build briefing content
    const content: BriefingContentDto = {
      summary: this.generateSummaryText(context),
      overdueTasks: context.overdueTasks,
      todayTasks: context.todayTasks,
      todayEvents: context.todayEvents,
      highPriorityItems: context.highPriorityItems,
      insights: aiInsights,
    };

    // Calculate expiration (end of day)
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);

    // Save briefing to database
    const briefing = await this.saveBriefing(
      userId,
      workspaceId,
      BriefingType.DAILY,
      content,
      expiresAt,
    );

    // Send notification
    await this.sendBriefingNotification(userId, workspaceId, content);

    // Emit WebSocket event
    this.appGateway.emitToUser(userId, 'autopilot:briefing', {
      briefingId: briefing.id,
      briefingType: BriefingType.DAILY,
      summary: content.summary,
      overdueTasks: content.overdueTasks.length,
      todayTasks: content.todayTasks.length,
      todayEvents: content.todayEvents.length,
    });

    return briefing;
  }

  /**
   * Gather context for briefing
   */
  private async gatherBriefingContext(
    userId: string,
    workspaceId: string,
  ): Promise<BriefingContext> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [overdueTasks, todayTasks, todayEvents, upcomingTasks, highPriorityItems, recentNotes] =
      await Promise.all([
        this.getOverdueTasks(userId, workspaceId, now),
        this.getTasksDueToday(userId, workspaceId, todayStart, todayEnd),
        this.getEventsToday(userId, workspaceId, todayStart, todayEnd),
        this.getUpcomingTasks(userId, workspaceId, todayEnd, weekEnd),
        this.getHighPriorityItems(userId, workspaceId),
        this.getRecentNotes(userId, workspaceId),
      ]);

    return {
      overdueTasks,
      todayTasks,
      todayEvents,
      upcomingTasks,
      highPriorityItems,
      recentNotes,
    };
  }

  /**
   * Get overdue tasks
   */
  private async getOverdueTasks(userId: string, workspaceId: string, now: Date): Promise<any[]> {
    try {
      const result = await this.db
        .table('tasks')
        .select('id', 'title', 'due_date', 'priority', 'project_id', 'assigned_to', 'user_id')
        .where('workspace_id', '=', workspaceId)
        .where('due_date', '<', now.toISOString())
        .where('status', '!=', 'done')
        .where('is_deleted', '=', false)
        .execute();

      const tasks = Array.isArray(result) ? result : [];

      // Filter tasks assigned to user or created by user
      return tasks
        .filter((t: any) => t.assigned_to === userId || t.user_id === userId)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          priority: t.priority,
          daysOverdue: Math.floor(
            (now.getTime() - new Date(t.due_date).getTime()) / (24 * 60 * 60 * 1000),
          ),
        }));
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error fetching overdue tasks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get tasks due today
   */
  private async getTasksDueToday(
    userId: string,
    workspaceId: string,
    start: Date,
    end: Date,
  ): Promise<any[]> {
    try {
      const result = await this.db
        .table('tasks')
        .select('id', 'title', 'due_date', 'priority', 'status', 'project_id')
        .where('workspace_id', '=', workspaceId)
        .where('due_date', '>=', start.toISOString())
        .where('due_date', '<=', end.toISOString())
        .where('status', '!=', 'done')
        .where('is_deleted', '=', false)
        .execute();

      const tasks = Array.isArray(result) ? result : [];
      return tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        priority: t.priority,
        status: t.status,
      }));
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error fetching today's tasks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get events for today
   */
  private async getEventsToday(
    userId: string,
    workspaceId: string,
    start: Date,
    end: Date,
  ): Promise<any[]> {
    try {
      const result = await this.db
        .table('calendar_events')
        .select('id', 'title', 'start_time', 'end_time', 'location', 'attendees')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', start.toISOString())
        .where('start_time', '<=', end.toISOString())
        .execute();

      const events = Array.isArray(result) ? result : [];
      return events.map((e: any) => ({
        id: e.id,
        title: e.title,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        attendeesCount: Array.isArray(e.attendees) ? e.attendees.length : 0,
      }));
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error fetching today's events: ${error.message}`);
      return [];
    }
  }

  /**
   * Get upcoming tasks for the week
   */
  private async getUpcomingTasks(
    userId: string,
    workspaceId: string,
    start: Date,
    end: Date,
  ): Promise<any[]> {
    try {
      const result = await this.db
        .table('tasks')
        .select('id', 'title', 'due_date', 'priority')
        .where('workspace_id', '=', workspaceId)
        .where('due_date', '>', start.toISOString())
        .where('due_date', '<=', end.toISOString())
        .where('status', '!=', 'done')
        .where('is_deleted', '=', false)
        .execute();

      const tasks = Array.isArray(result) ? result : [];
      return tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date,
        priority: t.priority,
      }));
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error fetching upcoming tasks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get high-priority items
   */
  private async getHighPriorityItems(userId: string, workspaceId: string): Promise<any[]> {
    try {
      const result = await this.db
        .table('tasks')
        .select('id', 'title', 'due_date', 'priority', 'status')
        .where('workspace_id', '=', workspaceId)
        .where('status', '!=', 'done')
        .where('is_deleted', '=', false)
        .execute();

      const tasks = Array.isArray(result) ? result : [];
      // Filter high priority (high, urgent)
      return tasks
        .filter((t: any) => t.priority === 'high' || t.priority === 'urgent')
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          priority: t.priority,
          status: t.status,
        }));
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error fetching high-priority items: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recent notes
   */
  private async getRecentNotes(userId: string, workspaceId: string): Promise<any[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const result = await this.db
        .table('notes')
        .select('id', 'title', 'updated_at')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('updated_at', '>=', oneDayAgo)
        .execute();

      const notes = Array.isArray(result) ? result : [];
      return notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        updatedAt: n.updated_at,
      }));
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error fetching recent notes: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate AI insights using LangChain
   */
  private async generateAIInsights(
    context: BriefingContext,
    workspaceId: string,
    userId: string,
  ): Promise<string[]> {
    try {
      const insights: string[] = [];

      // Generate productivity insight
      if (context.overdueTasks.length > 3) {
        insights.push(
          `You have ${context.overdueTasks.length} overdue tasks. Consider prioritizing the oldest ones first.`,
        );
      }

      if (context.todayTasks.length > 5) {
        insights.push(
          `Heavy day ahead with ${context.todayTasks.length} tasks due. Focus on high-priority items first.`,
        );
      }

      if (context.todayEvents.length >= 3) {
        insights.push(
          `You have ${context.todayEvents.length} meetings today. Block some focus time between them.`,
        );
      }

      if (
        context.highPriorityItems.length > 0 &&
        context.todayTasks.filter((t) => t.priority === 'urgent').length === 0
      ) {
        insights.push(
          `No urgent tasks due today, but you have ${context.highPriorityItems.length} high-priority items in your backlog.`,
        );
      }

      // Try to get AI-generated insights (skip for now as it requires complex context)
      // AI insights will be added in future versions
      // try {
      //   const aiSuggestions = await this.langchainSuggestionsService.generateSmartSuggestions(contextData);
      //   if (aiSuggestions?.suggestions?.length > 0) {
      //     const topSuggestion = aiSuggestions.suggestions[0];
      //     if (topSuggestion.action) {
      //       insights.push(`Suggestion: ${topSuggestion.action}`);
      //     }
      //   }
      // } catch (aiError) {
      //   this.logger.warn(`[DailyBriefing] AI insights unavailable: ${aiError.message}`);
      // }

      return insights;
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error generating insights: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate summary text
   */
  private generateSummaryText(context: BriefingContext): string {
    const parts: string[] = [];

    if (context.overdueTasks.length > 0) {
      parts.push(
        `${context.overdueTasks.length} overdue task${context.overdueTasks.length > 1 ? 's' : ''}`,
      );
    }

    if (context.todayTasks.length > 0) {
      parts.push(
        `${context.todayTasks.length} task${context.todayTasks.length > 1 ? 's' : ''} due today`,
      );
    }

    if (context.todayEvents.length > 0) {
      parts.push(
        `${context.todayEvents.length} event${context.todayEvents.length > 1 ? 's' : ''} scheduled`,
      );
    }

    if (parts.length === 0) {
      return 'Your schedule looks clear today!';
    }

    return `Today: ${parts.join(', ')}.`;
  }

  /**
   * Save briefing to database
   */
  private async saveBriefing(
    userId: string,
    workspaceId: string,
    briefingType: BriefingType,
    content: BriefingContentDto,
    expiresAt: Date,
  ): Promise<any> {
    try {
      const briefing = await this.db.insert('autopilot_briefings', {
        user_id: userId,
        workspace_id: workspaceId,
        briefing_type: briefingType,
        content: JSON.stringify(content),
        generated_at: new Date().toISOString(),
        is_read: false,
        expires_at: expiresAt.toISOString(),
      });

      return briefing;
    } catch (error) {
      this.logger.error(`[DailyBriefing] Error saving briefing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification for new briefing
   */
  private async sendBriefingNotification(
    userId: string,
    workspaceId: string,
    content: BriefingContentDto,
  ): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        user_id: userId,
        title: 'Your Daily Briefing is Ready',
        message: content.summary,
        type: NotificationType.SYSTEM,
        data: {
          workspaceId,
          briefingType: BriefingType.DAILY,
          overdueTasks: content.overdueTasks.length,
          todayTasks: content.todayTasks.length,
          todayEvents: content.todayEvents.length,
        },
      });
    } catch (error) {
      this.logger.warn(`[DailyBriefing] Error sending notification: ${error.message}`);
    }
  }

  /**
   * Get active user-workspace pairs
   */
  private async getActiveUserWorkspaces(): Promise<UserWorkspace[]> {
    try {
      const result = await this.db
        .table('workspace_members')
        .select('user_id', 'workspace_id')
        .execute();

      const members = Array.isArray(result) ? result : [];
      return members.map((m: any) => ({
        userId: m.user_id,
        workspaceId: m.workspace_id,
      }));
    } catch (error) {
      this.logger.error(`[DailyBriefing] Error getting user workspaces: ${error.message}`);
      return [];
    }
  }

  /**
   * Get latest briefing for a user
   */
  async getLatestBriefing(userId: string, workspaceId: string): Promise<any> {
    try {
      const result = await this.db
        .table('autopilot_briefings')
        .select('*')
        .where('user_id', '=', userId)
        .where('workspace_id', '=', workspaceId)
        .where('briefing_type', '=', BriefingType.DAILY)
        .execute();

      const briefings = Array.isArray(result) ? result : [];
      if (briefings.length === 0) return null;

      // Get most recent
      const latest = briefings.sort(
        (a: any, b: any) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
      )[0];

      return {
        ...latest,
        content: typeof latest.content === 'string' ? JSON.parse(latest.content) : latest.content,
      };
    } catch (error) {
      this.logger.error(`[DailyBriefing] Error getting latest briefing: ${error.message}`);
      return null;
    }
  }

  /**
   * Mark briefing as read
   */
  async markBriefingAsRead(briefingId: string, userId: string): Promise<boolean> {
    try {
      await this.db
        .table('autopilot_briefings')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .where('id', '=', briefingId)
        .where('user_id', '=', userId)
        .execute();

      return true;
    } catch (error) {
      this.logger.error(`[DailyBriefing] Error marking briefing as read: ${error.message}`);
      return false;
    }
  }
}
