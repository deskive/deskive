import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
import { TelegramService } from './telegram.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  TelegramConnectDto,
  TelegramTestConnectionDto,
  TelegramSendMessageDto,
  TelegramGetUpdatesQueryDto,
  TelegramSetWebhookDto,
} from './dto/telegram.dto';

@ApiTags('telegram')
@Controller('workspaces/:workspaceId/telegram')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  // ==================== Connection Endpoints ====================

  @Post('connect')
  @ApiOperation({ summary: 'Connect a Telegram bot using bot token' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Bot connected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bot token' })
  async connect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TelegramConnectDto,
  ) {
    const connection = await this.telegramService.saveConnection(userId, workspaceId, dto.botToken);
    return {
      data: connection,
      message: 'Telegram bot connected successfully',
    };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get current Telegram connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection details or null if not connected' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.telegramService.getConnection(userId, workspaceId);
    return {
      data: connection,
      message: connection ? 'Connected' : 'Not connected',
    };
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect your Telegram bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  async disconnect(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    await this.telegramService.disconnect(userId, workspaceId);
    return {
      data: null,
      message: 'Telegram bot disconnected successfully',
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test a Telegram bot token before connecting' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Bot token test result' })
  async testConnection(@Body() dto: TelegramTestConnectionDto) {
    const result = await this.telegramService.testBotToken(dto.botToken);
    return {
      data: result,
      message: result.success ? 'Bot token is valid' : 'Bot token test failed',
    };
  }

  // ==================== Bot Info Endpoints ====================

  @Get('me')
  @ApiOperation({ summary: 'Get bot information (getMe)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Bot information' })
  async getMe(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    const botInfo = await this.telegramService.getMe(userId, workspaceId);
    return {
      data: botInfo,
      message: 'Bot info retrieved successfully',
    };
  }

  // ==================== Message Endpoints ====================

  @Post('messages')
  @ApiOperation({ summary: 'Send a text message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Failed to send message' })
  async sendMessage(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TelegramSendMessageDto,
  ) {
    const result = await this.telegramService.sendMessage(userId, workspaceId, dto);
    return {
      data: result,
      message: 'Message sent successfully',
    };
  }

  // ==================== Updates Endpoints ====================

  @Get('updates')
  @ApiOperation({ summary: 'Get recent updates (messages sent to bot)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max updates to return (1-100)' })
  @ApiQuery({ name: 'timeout', required: false, description: 'Long polling timeout in seconds' })
  @ApiResponse({ status: 200, description: 'List of updates' })
  async getUpdates(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: TelegramGetUpdatesQueryDto,
  ) {
    const result = await this.telegramService.getUpdates(userId, workspaceId, query);
    return {
      data: result,
      message: 'Updates retrieved successfully',
    };
  }

  // ==================== Chat Endpoints ====================

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Get chat information' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'chatId', description: 'Chat ID or username' })
  @ApiResponse({ status: 200, description: 'Chat information' })
  async getChat(
    @Param('workspaceId') workspaceId: string,
    @Param('chatId') chatId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const chatInfo = await this.telegramService.getChat(userId, workspaceId, chatId);
    return {
      data: chatInfo,
      message: 'Chat info retrieved successfully',
    };
  }

  // ==================== Webhook Endpoints ====================

  @Post('webhook')
  @ApiOperation({ summary: 'Set webhook URL for the bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Webhook set successfully' })
  async setWebhook(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TelegramSetWebhookDto,
  ) {
    const result = await this.telegramService.setWebhook(userId, workspaceId, dto);
    return {
      data: result,
      message: 'Webhook configured successfully',
    };
  }

  @Delete('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'dropPendingUpdates', required: false, description: 'Drop pending updates' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  async deleteWebhook(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('dropPendingUpdates') dropPendingUpdates?: boolean,
  ) {
    const result = await this.telegramService.deleteWebhook(
      userId,
      workspaceId,
      dropPendingUpdates === true,
    );
    return {
      data: result,
      message: 'Webhook deleted successfully',
    };
  }

  @Get('webhook')
  @ApiOperation({ summary: 'Get webhook info' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Webhook information' })
  async getWebhookInfo(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const webhookInfo = await this.telegramService.getWebhookInfo(userId, workspaceId);
    return {
      data: webhookInfo,
      message: 'Webhook info retrieved successfully',
    };
  }
}
