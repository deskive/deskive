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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { RecordingProcessorService } from './recording-processor.service';
import {
  CreateScheduledNotificationDto,
  UpdateScheduledNotificationDto,
  QueryScheduledNotificationsDto,
  ScheduledNotificationResponseDto,
  PaginatedScheduledNotificationsDto,
  SchedulerStatsDto,
} from './dto';

@ApiTags('Scheduler')
@Controller('scheduler')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(
    private readonly schedulerService: NotificationSchedulerService,
    private readonly recordingProcessorService: RecordingProcessorService,
  ) {}

  // =============================================
  // SCHEDULED NOTIFICATIONS
  // =============================================

  @Post('notifications')
  @ApiOperation({ summary: 'Schedule a new notification' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notification scheduled successfully',
    type: ScheduledNotificationResponseDto,
  })
  async scheduleNotification(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateScheduledNotificationDto,
  ): Promise<ScheduledNotificationResponseDto> {
    // If no user_id is provided, use the current user
    if (!dto.user_id && !dto.user_ids) {
      dto.user_id = user.sub;
    }
    return this.schedulerService.scheduleNotification(dto);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get scheduled notifications for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notifications retrieved successfully',
    type: PaginatedScheduledNotificationsDto,
  })
  async getScheduledNotifications(
    @CurrentUser() user: { sub: string },
    @Query() query: QueryScheduledNotificationsDto,
  ): Promise<PaginatedScheduledNotificationsDto> {
    return this.schedulerService.getScheduledNotifications(user.sub, query);
  }

  @Put('notifications/:id')
  @ApiOperation({ summary: 'Update a scheduled notification' })
  @ApiParam({ name: 'id', description: 'Scheduled notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled notification updated successfully',
    type: ScheduledNotificationResponseDto,
  })
  async updateScheduledNotification(
    @CurrentUser() user: { sub: string },
    @Param('id') notificationId: string,
    @Body() dto: UpdateScheduledNotificationDto,
  ): Promise<ScheduledNotificationResponseDto> {
    return this.schedulerService.updateScheduledNotification(notificationId, user.sub, dto);
  }

  @Delete('notifications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a scheduled notification' })
  @ApiParam({ name: 'id', description: 'Scheduled notification ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Scheduled notification cancelled successfully',
  })
  async cancelScheduledNotification(
    @CurrentUser() user: { sub: string },
    @Param('id') notificationId: string,
  ): Promise<void> {
    return this.schedulerService.cancelScheduledNotification(notificationId, user.sub);
  }

  // =============================================
  // SCHEDULER MANAGEMENT (Admin)
  // =============================================

  @Get('stats')
  @ApiOperation({ summary: 'Get scheduler statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduler statistics retrieved successfully',
    type: SchedulerStatsDto,
  })
  async getSchedulerStats(): Promise<SchedulerStatsDto> {
    return this.schedulerService.getSchedulerStats();
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger notification processing (admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing triggered successfully',
  })
  async triggerProcessing(): Promise<{ processed: number }> {
    return this.schedulerService.triggerProcessing();
  }

  // =============================================
  // RECORDING PROCESSING (Admin)
  // =============================================

  @Get('recordings/stats')
  @ApiOperation({ summary: 'Get recording processing statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recording processing statistics retrieved successfully',
  })
  async getRecordingStats() {
    return this.recordingProcessorService.getProcessingStats();
  }

  @Post('recordings/cleanup')
  @ApiOperation({ summary: 'Clean up stuck recordings (mark old processing recordings as failed)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stuck recordings cleaned up successfully',
  })
  async cleanupStuckRecordings() {
    return this.recordingProcessorService.cleanupStuckRecordings();
  }
}
