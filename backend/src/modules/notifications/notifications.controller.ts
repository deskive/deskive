import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdatePreferencesDto,
  NotificationQueryDto,
  SubscribePushDto,
  UnsubscribePushDto,
  BulkActionDto,
  NotificationResponseDto,
  PaginatedNotificationsDto,
  RegisterFcmTokenDto,
  UnregisterFcmTokenDto,
  FcmTokenResponseDto,
} from './dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // =============================================
  // NOTIFICATION ENDPOINTS
  // =============================================

  @Post('send')
  @ApiOperation({ summary: 'Send a notification to one or multiple users' })
  @ApiResponse({
    status: 201,
    description: 'Notification sent successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotification(
    @Request() req: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto | NotificationResponseDto[]> {
    // If no user_id is specified in the DTO, default to the authenticated user
    if (!createNotificationDto.user_id && !createNotificationDto.user_ids) {
      createNotificationDto.user_id = req.user.sub;
    }

    return this.notificationsService.sendNotification(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: PaginatedNotificationsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @Request() req: any,
    @Query() query: NotificationQueryDto,
  ): Promise<PaginatedNotificationsDto> {
    return this.notificationsService.getNotifications(req.user.sub, query);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(@Request() req: any, @Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(req.user.sub, id);
  }

  @Put(':id/unread')
  @ApiOperation({ summary: 'Mark notification as unread' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as unread',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsUnread(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsUnread(req.user.sub, id);
  }

  @Delete('clear-all')
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({
    status: 200,
    description: 'All read notifications deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearAllRead(@Request() req: any): Promise<{ deleted: number }> {
    return this.notificationsService.deleteAllReadNotifications(req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 204,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteNotification(@Request() req: any, @Param('id') id: string): Promise<void> {
    return this.notificationsService.deleteNotification(req.user.sub, id);
  }

  @Post('bulk-read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 5 },
        failed: { type: 'number', example: 0 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkMarkAsRead(
    @Request() req: any,
    @Body() bulkActionDto: BulkActionDto,
  ): Promise<{ success: number; failed: number }> {
    return this.notificationsService.bulkMarkAsRead(req.user.sub, bulkActionDto);
  }

  // =============================================
  // NOTIFICATION PREFERENCES ENDPOINTS
  // =============================================

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        global: {
          type: 'object',
          properties: {
            push: { type: 'boolean' },
            email: { type: 'boolean' },
            in_app: { type: 'boolean' },
          },
        },
        types: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              push: { type: 'boolean' },
              email: { type: 'boolean' },
              in_app: { type: 'boolean' },
            },
          },
        },
        quiet_hours: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            days: { type: 'array', items: { type: 'string' } },
            timezone: { type: 'string' },
          },
        },
        daily_limit: { type: 'number' },
        grouping: { type: 'object' },
        language: { type: 'string' },
        metadata: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPreferences(@Request() req: any) {
    return this.notificationsService.getNotificationPreferences(req.user.sub);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePreferences(@Request() req: any, @Body() updatePreferencesDto: UpdatePreferencesDto) {
    return this.notificationsService.updateNotificationPreferences(
      req.user.sub,
      updatePreferencesDto,
    );
  }

  // =============================================
  // PUSH SUBSCRIPTION ENDPOINTS
  // =============================================

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Push subscription created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        subscription_id: { type: 'string', example: 'sub_123' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async subscribeToPush(
    @Request() req: any,
    @Body() subscribePushDto: SubscribePushDto,
  ): Promise<{ success: boolean; subscription_id: string }> {
    return this.notificationsService.subscribeToPush(req.user.sub, subscribePushDto);
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  @ApiResponse({
    status: 200,
    description: 'Push subscription removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unsubscribeFromPush(
    @Request() req: any,
    @Body() unsubscribePushDto: UnsubscribePushDto,
  ): Promise<{ success: boolean }> {
    return this.notificationsService.unsubscribeFromPush(req.user.sub, unsubscribePushDto);
  }

  // =============================================
  // UTILITY ENDPOINTS
  // =============================================

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const notifications = await this.notificationsService.getNotifications(req.user.sub, {
      is_read: false,
      limit: 1000, // High limit to get all unread
    });

    return { count: notifications.unread_count || 0 };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Request() req: any): Promise<{ updated: number }> {
    return this.notificationsService.markAllAsReadBulk(req.user.sub);
  }

  // =============================================
  // FCM TOKEN ENDPOINTS (FOR FLUTTER MOBILE APP)
  // =============================================

  @Post('fcm/register-token')
  @ApiOperation({
    summary: 'Register FCM token for mobile device',
    description:
      'Called when Flutter app user logs in. Registers the device for push notifications via Firebase Cloud Messaging.',
  })
  @ApiResponse({
    status: 201,
    description: 'FCM token registered successfully',
    type: FcmTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerFcmToken(
    @Request() req: any,
    @Body() registerDto: RegisterFcmTokenDto,
  ): Promise<FcmTokenResponseDto> {
    return this.notificationsService.registerFcmToken(req.user.sub, registerDto);
  }

  @Post('fcm/unregister-token')
  @ApiOperation({
    summary: 'Unregister FCM token',
    description: 'Called when Flutter app user logs out. Marks the device token as inactive.',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token unregistered successfully',
    type: FcmTokenResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unregisterFcmToken(
    @Request() req: any,
    @Body() unregisterDto: UnregisterFcmTokenDto,
  ): Promise<FcmTokenResponseDto> {
    return this.notificationsService.unregisterFcmToken(req.user.sub, unregisterDto);
  }
}
