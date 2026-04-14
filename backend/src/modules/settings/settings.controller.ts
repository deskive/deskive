import { Controller, Get, Patch, Put, Body, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import {
  UpdateNotificationSettingsDto,
  NotificationSettingsDto,
} from './dto/notification-settings.dto';
import { TabArrangementDto, UpdateTabArrangementDto } from './dto/tab-arrangement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Get user notification settings' })
  @ApiResponse({
    status: 200,
    description: 'Notification settings retrieved successfully',
    type: NotificationSettingsDto,
  })
  async getNotificationSettings(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Getting notification settings for user: ${userId}`);
    return this.settingsService.getNotificationSettings(userId);
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update user notification settings' })
  @ApiResponse({
    status: 200,
    description: 'Notification settings updated successfully',
    type: NotificationSettingsDto,
  })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Updating notification settings for user: ${userId}`);
    return this.settingsService.updateNotificationSettings(userId, dto);
  }

  @Get('tab-arrangement')
  @ApiOperation({ summary: 'Get user tab arrangement settings' })
  @ApiResponse({
    status: 200,
    description: 'Tab arrangement retrieved successfully',
    type: TabArrangementDto,
  })
  async getTabArrangement(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Getting tab arrangement for user: ${userId}`);
    return this.settingsService.getTabArrangement(userId);
  }

  @Put('tab-arrangement')
  @ApiOperation({ summary: 'Update user tab arrangement settings' })
  @ApiResponse({
    status: 200,
    description: 'Tab arrangement updated successfully',
    type: TabArrangementDto,
  })
  async updateTabArrangement(@Request() req: any, @Body() dto: UpdateTabArrangementDto) {
    const userId = req.user.sub || req.user.userId;
    this.logger.log(`Updating tab arrangement for user: ${userId}`);
    return this.settingsService.updateTabArrangement(userId, dto);
  }
}
