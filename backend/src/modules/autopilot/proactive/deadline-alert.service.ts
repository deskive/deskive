import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/dto';
import { AppGateway } from '../../../common/gateways/app.gateway';
import { AlertType, EntityType } from './dto/proactive.dto';

interface DeadlineTask {
  id: string;
  title: string;
  dueDate: Date;
  priority: string;
  projectId: string;
  projectName?: string;
  assignedTo: string;
  workspaceId: string;
}

interface DeadlineEvent {
  id: string;
  title: string;
  startTime: Date;
  workspaceId: string;
  userId: string;
}

@Injectable()
export class DeadlineAlertService {
  private readonly logger = new Logger(DeadlineAlertService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly appGateway: AppGateway,
  ) {}

  /**
   * Check for upcoming deadlines every hour
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'deadline-alerts' })
  async checkDeadlines(): Promise<void> {
    this.logger.log('[DeadlineAlert] Starting deadline check...');

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Get tasks due in 24 hours
      const urgent24hTasks = await this.getTasksDueBetween(now, in24Hours);
      this.logger.log(`[DeadlineAlert] Found ${urgent24hTasks.length} tasks due in 24 hours`);

      // Get high-priority tasks due in 3 days
      const highPriority3dTasks = await this.getHighPriorityTasksDueBetween(in24Hours, in3Days);
      this.logger.log(
        `[DeadlineAlert] Found ${highPriority3dTasks.length} high-priority tasks due in 3 days`,
      );

      // Get overdue tasks
      const overdueTasks = await this.getOverdueTasks();
      this.logger.log(`[DeadlineAlert] Found ${overdueTasks.length} overdue tasks`);

      // Process alerts
      await this.processDeadlineAlerts(urgent24hTasks, AlertType.DEADLINE_24H);
      await this.processDeadlineAlerts(highPriority3dTasks, AlertType.DEADLINE_3D);
      await this.processDeadlineAlerts(overdueTasks, AlertType.OVERDUE);

      this.logger.log('[DeadlineAlert] Deadline check complete');
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Deadline check failed: ${error.message}`);
    }
  }

  /**
   * Get tasks due between two dates
   */
  private async getTasksDueBetween(start: Date, end: Date): Promise<DeadlineTask[]> {
    try {
      const result = await this.db
        .table('tasks')
        .select('*')
        .where('due_date', '>=', start.toISOString())
        .where('due_date', '<=', end.toISOString())
        .where('status', '!=', 'done')
        .execute();

      const tasks = Array.isArray(result) ? result : [];
      return tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: new Date(t.due_date),
        priority: t.priority,
        projectId: t.project_id,
        assignedTo: t.assigned_to || t.user_id,
        workspaceId: t.workspace_id,
      }));
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error getting tasks due between dates: ${error.message}`);
      return [];
    }
  }

  /**
   * Get high-priority tasks due between two dates
   */
  private async getHighPriorityTasksDueBetween(start: Date, end: Date): Promise<DeadlineTask[]> {
    try {
      const result = await this.db
        .table('tasks')
        .select('*')
        .where('due_date', '>=', start.toISOString())
        .where('due_date', '<=', end.toISOString())
        .where('status', '!=', 'done')
        .execute();

      const tasks = Array.isArray(result) ? result : [];
      // Filter high priority tasks (high, urgent)
      const highPriorityTasks = tasks.filter(
        (t: any) => t.priority === 'high' || t.priority === 'urgent',
      );

      return highPriorityTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: new Date(t.due_date),
        priority: t.priority,
        projectId: t.project_id,
        assignedTo: t.assigned_to || t.user_id,
        workspaceId: t.workspace_id,
      }));
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error getting high-priority tasks: ${error.message}`);
      return [];
    }
  }

  /**
   * Get overdue tasks that haven't been alerted yet today
   */
  private async getOverdueTasks(): Promise<DeadlineTask[]> {
    try {
      const now = new Date();

      const result = await this.db
        .table('tasks')
        .select('*')
        .where('due_date', '<', now.toISOString())
        .where('status', '!=', 'done')
        .execute();

      const tasks = Array.isArray(result) ? result : [];
      return tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        dueDate: new Date(t.due_date),
        priority: t.priority,
        projectId: t.project_id,
        assignedTo: t.assigned_to || t.user_id,
        workspaceId: t.workspace_id,
      }));
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error getting overdue tasks: ${error.message}`);
      return [];
    }
  }

  /**
   * Process deadline alerts and send notifications
   */
  private async processDeadlineAlerts(tasks: DeadlineTask[], alertType: AlertType): Promise<void> {
    // Group tasks by user
    const tasksByUser = new Map<string, DeadlineTask[]>();

    for (const task of tasks) {
      const userId = task.assignedTo;
      if (!tasksByUser.has(userId)) {
        tasksByUser.set(userId, []);
      }
      tasksByUser.get(userId)!.push(task);
    }

    // Process each user's alerts
    for (const [userId, userTasks] of tasksByUser.entries()) {
      try {
        // Check if alert was already sent today for these tasks
        const alreadyAlerted = await this.checkExistingAlerts(userId, userTasks, alertType);
        const newAlerts = userTasks.filter((t) => !alreadyAlerted.includes(t.id));

        if (newAlerts.length === 0) continue;

        // Create alert records
        for (const task of newAlerts) {
          await this.createAlert(userId, task, alertType);
        }

        // Send grouped notification
        await this.sendGroupedNotification(userId, newAlerts, alertType);
      } catch (error) {
        this.logger.error(
          `[DeadlineAlert] Error processing alerts for user ${userId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Check for existing alerts today
   */
  private async checkExistingAlerts(
    userId: string,
    tasks: DeadlineTask[],
    alertType: AlertType,
  ): Promise<string[]> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const taskIds = tasks.map((t) => t.id);

      const result = await this.db
        .table('autopilot_alerts')
        .select('entity_id')
        .where('user_id', '=', userId)
        .where('alert_type', '=', alertType)
        .where('created_at', '>=', todayStart.toISOString())
        .execute();

      const existingAlerts = Array.isArray(result) ? result : [];
      return existingAlerts
        .map((a: any) => a.entity_id)
        .filter((id: string) => taskIds.includes(id));
    } catch (error) {
      this.logger.warn(`[DeadlineAlert] Error checking existing alerts: ${error.message}`);
      return [];
    }
  }

  /**
   * Create an alert record
   */
  private async createAlert(
    userId: string,
    task: DeadlineTask,
    alertType: AlertType,
  ): Promise<void> {
    try {
      const message = this.generateAlertMessage(task, alertType);

      await this.db.insert('autopilot_alerts', {
        user_id: userId,
        workspace_id: task.workspaceId,
        alert_type: alertType,
        entity_type: EntityType.TASK,
        entity_id: task.id,
        message,
        is_sent: true,
        is_dismissed: false,
      });
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error creating alert: ${error.message}`);
    }
  }

  /**
   * Generate alert message based on type
   */
  private generateAlertMessage(task: DeadlineTask, alertType: AlertType): string {
    switch (alertType) {
      case AlertType.DEADLINE_24H:
        return `Task "${task.title}" is due in less than 24 hours`;
      case AlertType.DEADLINE_3D:
        return `High-priority task "${task.title}" is due in 3 days`;
      case AlertType.OVERDUE:
        return `Task "${task.title}" is overdue`;
      case AlertType.HIGH_PRIORITY:
        return `High-priority task "${task.title}" needs attention`;
      default:
        return `Alert for task "${task.title}"`;
    }
  }

  /**
   * Send grouped notification to user
   */
  private async sendGroupedNotification(
    userId: string,
    tasks: DeadlineTask[],
    alertType: AlertType,
  ): Promise<void> {
    try {
      const workspaceId = tasks[0]?.workspaceId;
      if (!workspaceId) return;

      let title: string;
      let body: string;

      switch (alertType) {
        case AlertType.DEADLINE_24H:
          title = 'Urgent: Tasks Due Soon';
          body =
            tasks.length === 1
              ? `"${tasks[0].title}" is due in less than 24 hours`
              : `You have ${tasks.length} tasks due in less than 24 hours`;
          break;
        case AlertType.DEADLINE_3D:
          title = 'Upcoming High-Priority Deadlines';
          body =
            tasks.length === 1
              ? `"${tasks[0].title}" is due in 3 days`
              : `You have ${tasks.length} high-priority tasks due in 3 days`;
          break;
        case AlertType.OVERDUE:
          title = 'Overdue Tasks';
          body =
            tasks.length === 1
              ? `"${tasks[0].title}" is overdue`
              : `You have ${tasks.length} overdue tasks`;
          break;
        default:
          title = 'Task Alert';
          body = `You have ${tasks.length} tasks that need attention`;
      }

      // Save notification to database
      await this.notificationsService.sendNotification({
        user_id: userId,
        title,
        message: body,
        type: NotificationType.TASKS,
        data: {
          workspaceId,
          alertType,
          tasks: tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate })),
        },
      });

      // Send WebSocket notification
      this.appGateway.emitToUser(userId, 'autopilot:deadline_alert', {
        alertType,
        title,
        body,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          priority: t.priority,
        })),
      });

      this.logger.log(
        `[DeadlineAlert] Sent ${alertType} notification to user ${userId} for ${tasks.length} tasks`,
      );
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error sending notification: ${error.message}`);
    }
  }

  /**
   * Get pending alerts for a user
   */
  async getPendingAlerts(userId: string, workspaceId: string): Promise<any[]> {
    try {
      const result = await this.db
        .table('autopilot_alerts')
        .select('*')
        .where('user_id', '=', userId)
        .where('workspace_id', '=', workspaceId)
        .where('is_dismissed', '=', false)
        .execute();

      return Array.isArray(result) ? result : [];
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error getting pending alerts: ${error.message}`);
      return [];
    }
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      await this.db
        .table('autopilot_alerts')
        .update({ is_dismissed: true })
        .where('id', '=', alertId)
        .where('user_id', '=', userId)
        .execute();

      return true;
    } catch (error) {
      this.logger.error(`[DeadlineAlert] Error dismissing alert: ${error.message}`);
      return false;
    }
  }
}
