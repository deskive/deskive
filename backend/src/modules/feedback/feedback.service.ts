import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../notifications/dto';
import {
  CreateFeedbackDto,
  FeedbackType,
} from './dto/create-feedback.dto';
import {
  UpdateFeedbackDto,
  ResolveFeedbackDto,
  FeedbackStatus,
  FeedbackPriority,
} from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import {
  CreateFeedbackResponseDto,
  FeedbackDto,
  FeedbackResponseDto,
  PaginatedFeedbackDto,
} from './dto/create-feedback-response.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =============================================
  // USER OPERATIONS
  // =============================================

  async createFeedback(userId: string, dto: CreateFeedbackDto): Promise<FeedbackDto> {
    try {
      this.logger.log(`Creating feedback for user ${userId}: ${dto.title}`);

      const now = new Date().toISOString();
      const feedback = await this.db.insert('feedback', {
        user_id: userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        status: FeedbackStatus.PENDING,
        priority: FeedbackPriority.MEDIUM,
        category: dto.category || null,
        attachments: dto.attachments || [],
        app_version: dto.appVersion || null,
        device_info: dto.deviceInfo || {},
        created_at: now,
        updated_at: now,
      });

      this.logger.log(`Feedback created: ${feedback.id}`);
      return this.formatFeedback(feedback);
    } catch (error) {
      this.logger.error(`Failed to create feedback: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create feedback: ${error.message}`);
    }
  }

  async getUserFeedback(userId: string, query: FeedbackQueryDto): Promise<PaginatedFeedbackDto> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc', ...filters } = query;
      const offset = (page - 1) * limit;

      // Get all feedback for the user
      const result = await this.db.findMany('feedback', {
        user_id: userId,
      });

      let feedbackList = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);

      // Apply filters
      if (filters.type) {
        feedbackList = feedbackList.filter(f => f.type === filters.type);
      }
      if (filters.status) {
        feedbackList = feedbackList.filter(f => f.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        feedbackList = feedbackList.filter(f =>
          f.title?.toLowerCase().includes(searchLower) ||
          f.description?.toLowerCase().includes(searchLower)
        );
      }

      // Sort
      feedbackList.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'desc') {
          return aVal > bVal ? -1 : 1;
        }
        return aVal > bVal ? 1 : -1;
      });

      const total = feedbackList.length;
      feedbackList = feedbackList.slice(offset, offset + limit);

      return {
        data: feedbackList.map(f => this.formatFeedback(f)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get user feedback: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get feedback: ${error.message}`);
    }
  }

  async getFeedbackById(userId: string, feedbackId: string, isAdmin = false): Promise<FeedbackDto> {
    try {
      const feedback = await this.db.findOne('feedback', { id: feedbackId });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      // Check ownership unless admin
      if (!isAdmin && feedback.user_id !== userId) {
        throw new ForbiddenException('Access denied');
      }

      return this.formatFeedback(feedback);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to get feedback: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get feedback: ${error.message}`);
    }
  }

  // =============================================
  // ADMIN OPERATIONS
  // =============================================

  async getAllFeedback(query: FeedbackQueryDto): Promise<PaginatedFeedbackDto> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc', ...filters } = query;
      const offset = (page - 1) * limit;

      // Get all feedback
      const result = await this.db.findMany('feedback', {});
      let feedbackList = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);

      // Apply filters
      if (filters.type) {
        feedbackList = feedbackList.filter(f => f.type === filters.type);
      }
      if (filters.status) {
        feedbackList = feedbackList.filter(f => f.status === filters.status);
      }
      if (filters.priority) {
        feedbackList = feedbackList.filter(f => f.priority === filters.priority);
      }
      if (filters.category) {
        feedbackList = feedbackList.filter(f => f.category === filters.category);
      }
      if (filters.userId) {
        feedbackList = feedbackList.filter(f => f.user_id === filters.userId);
      }
      if (filters.assignedTo) {
        feedbackList = feedbackList.filter(f => f.assigned_to === filters.assignedTo);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        feedbackList = feedbackList.filter(f =>
          f.title?.toLowerCase().includes(searchLower) ||
          f.description?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        feedbackList = feedbackList.filter(f => new Date(f.created_at) >= startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate + 'T23:59:59.999Z');
        feedbackList = feedbackList.filter(f => new Date(f.created_at) <= endDate);
      }

      // Sort
      feedbackList.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'desc') {
          return aVal > bVal ? -1 : 1;
        }
        return aVal > bVal ? 1 : -1;
      });

      const total = feedbackList.length;
      feedbackList = feedbackList.slice(offset, offset + limit);

      return {
        data: feedbackList.map(f => this.formatFeedback(f)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get all feedback: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get feedback: ${error.message}`);
    }
  }

  async updateFeedback(feedbackId: string, dto: UpdateFeedbackDto): Promise<FeedbackDto> {
    try {
      const feedback = await this.db.findOne('feedback', { id: feedbackId });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.status !== undefined) {
        updateData.status = dto.status;
      }
      if (dto.priority !== undefined) {
        updateData.priority = dto.priority;
      }
      if (dto.assignedTo !== undefined) {
        updateData.assigned_to = dto.assignedTo;
      }
      if (dto.duplicateOfId !== undefined) {
        updateData.duplicate_of_id = dto.duplicateOfId;
        if (dto.status === undefined) {
          updateData.status = FeedbackStatus.DUPLICATE;
        }
      }

      const updated = await this.db.update('feedback', feedbackId, updateData);
      this.logger.log(`Feedback ${feedbackId} updated`);

      return this.formatFeedback(updated);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update feedback: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update feedback: ${error.message}`);
    }
  }

  async resolveFeedback(feedbackId: string, adminUserId: string, dto: ResolveFeedbackDto): Promise<FeedbackDto> {
    try {
      const feedback = await this.db.findOne('feedback', { id: feedbackId });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      const now = new Date().toISOString();
      const updateData: Record<string, any> = {
        status: FeedbackStatus.RESOLVED,
        resolved_at: now,
        resolved_by: adminUserId,
        updated_at: now,
      };

      if (dto.resolutionNotes) {
        updateData.resolution_notes = dto.resolutionNotes;
      }

      const updated = await this.db.update('feedback', feedbackId, updateData);
      this.logger.log(`Feedback ${feedbackId} resolved by ${adminUserId}`);

      // Notify user if requested
      if (dto.notifyUser !== false) {
        await this.notifyUserAboutResolution(feedback.user_id, updated);
      }

      return this.formatFeedback(updated);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to resolve feedback: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to resolve feedback: ${error.message}`);
    }
  }

  // =============================================
  // FEEDBACK RESPONSES
  // =============================================

  async addResponse(feedbackId: string, adminUserId: string, dto: CreateFeedbackResponseDto): Promise<FeedbackResponseDto> {
    try {
      const feedback = await this.db.findOne('feedback', { id: feedbackId });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      const now = new Date().toISOString();
      const response = await this.db.insert('feedback_responses', {
        feedback_id: feedbackId,
        user_id: adminUserId,
        content: dto.content,
        is_internal: dto.isInternal || false,
        status_change: dto.statusChange || null,
        created_at: now,
      });

      // Update feedback status if status change provided
      if (dto.statusChange) {
        await this.db.update('feedback', feedbackId, {
          status: dto.statusChange,
          updated_at: now,
        });
      }

      this.logger.log(`Response added to feedback ${feedbackId}`);
      return this.formatFeedbackResponse(response);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to add response: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to add response: ${error.message}`);
    }
  }

  async getResponses(feedbackId: string, userId: string, isAdmin = false): Promise<FeedbackResponseDto[]> {
    try {
      const feedback = await this.db.findOne('feedback', { id: feedbackId });

      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }

      // Check ownership unless admin
      if (!isAdmin && feedback.user_id !== userId) {
        throw new ForbiddenException('Access denied');
      }

      const result = await this.db.findMany('feedback_responses', {
        feedback_id: feedbackId,
      });

      let responses = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);

      // Filter out internal notes for non-admin users
      if (!isAdmin) {
        responses = responses.filter(r => !r.is_internal);
      }

      // Sort by created_at
      responses.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return responses.map(r => this.formatFeedbackResponse(r));
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to get responses: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get responses: ${error.message}`);
    }
  }

  // =============================================
  // FILE UPLOAD
  // =============================================

  async uploadAttachment(userId: string, file: Express.Multer.File): Promise<{ url: string; name: string; type: string; size: number }> {
    try {
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;
      const result = await /* TODO: use StorageService */ this.db.uploadFile('feedback-attachments', file.buffer, fileName, {
        contentType: file.mimetype,
      });

      return {
        url: result.url,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload attachment: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to upload attachment: ${error.message}`);
    }
  }

  // =============================================
  // NOTIFICATION
  // =============================================

  private async notifyUserAboutResolution(userId: string, feedback: any): Promise<void> {
    try {
      const feedbackTypeMap: Record<string, string> = {
        [FeedbackType.BUG]: 'bug report',
        [FeedbackType.ISSUE]: 'issue',
        [FeedbackType.IMPROVEMENT]: 'improvement suggestion',
        [FeedbackType.FEATURE_REQUEST]: 'feature request',
      };

      const feedbackTypeLabel = feedbackTypeMap[feedback.type] || 'feedback';

      await this.notificationsService.sendNotification({
        user_id: userId,
        type: NotificationType.FEEDBACK_RESOLVED,
        title: 'Your feedback has been addressed!',
        message: `Your ${feedbackTypeLabel} "${feedback.title}" has been resolved.`,
        data: {
          feedbackId: feedback.id,
          feedbackType: feedback.type,
          status: FeedbackStatus.RESOLVED,
        },
        action_url: `/feedback/${feedback.id}`,
        priority: NotificationPriority.NORMAL,
        send_push: true,
        send_email: true,
      });

      // Update notified_at
      await this.db.update('feedback', feedback.id, {
        notified_at: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} notified about feedback resolution`);
    } catch (error) {
      this.logger.error(`Failed to notify user about resolution: ${error.message}`, error.stack);
      // Don't throw - notification failure shouldn't block resolution
    }
  }

  // =============================================
  // HELPERS
  // =============================================

  private formatFeedback(feedback: any): FeedbackDto {
    return {
      id: feedback.id,
      userId: feedback.user_id,
      type: feedback.type,
      title: feedback.title,
      description: feedback.description,
      status: feedback.status,
      priority: feedback.priority,
      category: feedback.category,
      attachments: feedback.attachments || [],
      appVersion: feedback.app_version,
      deviceInfo: feedback.device_info || {},
      resolutionNotes: feedback.resolution_notes,
      resolvedAt: feedback.resolved_at,
      resolvedBy: feedback.resolved_by,
      notifiedAt: feedback.notified_at,
      assignedTo: feedback.assigned_to,
      duplicateOfId: feedback.duplicate_of_id,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
    };
  }

  private formatFeedbackResponse(response: any): FeedbackResponseDto {
    return {
      id: response.id,
      feedbackId: response.feedback_id,
      userId: response.user_id,
      content: response.content,
      isInternal: response.is_internal || false,
      statusChange: response.status_change,
      createdAt: response.created_at,
    };
  }
}
