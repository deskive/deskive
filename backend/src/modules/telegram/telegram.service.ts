import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import {
  TelegramConnectionDto,
  TelegramBotInfoDto,
  TelegramSendMessageDto,
  TelegramSendMessageResponseDto,
  TelegramGetUpdatesQueryDto,
  TelegramUpdatesResponseDto,
  TelegramUpdateDto,
  TelegramChatInfoDto,
  TelegramSetWebhookDto,
  TelegramWebhookInfoDto,
} from './dto/telegram.dto';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

  constructor(private readonly db: DatabaseService) {}

  // ==================== Connection Management ====================

  /**
   * Save a Telegram bot connection (validates bot token first)
   */
  async saveConnection(
    userId: string,
    workspaceId: string,
    botToken: string,
  ): Promise<TelegramConnectionDto> {
    // Validate the bot token by calling getMe
    const botInfo = await this.verifyBotToken(botToken);

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('telegram_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      bot_token: botToken,
      bot_id: botInfo.id.toString(),
      bot_username: botInfo.username,
      bot_name: botInfo.firstName,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      // Update existing connection
      await this.db.update('telegram_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new connection
      connection = await this.db.insert('telegram_connections', connectionData);
    }

    this.logger.log(
      `Telegram bot @${botInfo.username} connected for user ${userId} in workspace ${workspaceId}`,
    );

    return this.transformConnection(connection);
  }

  /**
   * Get user's Telegram connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<TelegramConnectionDto | null> {
    const connection = await this.db.findOne('telegram_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  /**
   * Disconnect user's Telegram bot in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('telegram_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Telegram connection not found');
    }

    // Soft delete the connection
    await this.db.update('telegram_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Telegram disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get bot token for the connection
   */
  private async getBotToken(userId: string, workspaceId: string): Promise<string> {
    const connection = await this.db.findOne('telegram_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException(
        'Telegram not connected. Please connect your Telegram bot first.',
      );
    }

    return connection.bot_token;
  }

  // ==================== Bot API Operations ====================

  /**
   * Test a bot token before connecting
   */
  async testBotToken(
    botToken: string,
  ): Promise<{ success: boolean; message?: string; botInfo?: TelegramBotInfoDto }> {
    try {
      const botInfo = await this.verifyBotToken(botToken);
      return {
        success: true,
        message: `Bot @${botInfo.username} is valid and ready to connect.`,
        botInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Invalid bot token. Please check your token from @BotFather.',
      };
    }
  }

  /**
   * Verify bot token by calling getMe
   */
  private async verifyBotToken(botToken: string): Promise<TelegramBotInfoDto> {
    try {
      const response = await this.makeApiRequest(botToken, 'getMe');
      return this.transformBotInfo(response);
    } catch (error) {
      this.logger.error('Invalid bot token:', error.message);
      throw new BadRequestException(
        'Invalid Telegram bot token. Please check your token from @BotFather.',
      );
    }
  }

  /**
   * Get bot info (getMe endpoint)
   */
  async getMe(userId: string, workspaceId: string): Promise<TelegramBotInfoDto> {
    const botToken = await this.getBotToken(userId, workspaceId);
    const response = await this.makeApiRequest(botToken, 'getMe');
    return this.transformBotInfo(response);
  }

  /**
   * Send a text message
   */
  async sendMessage(
    userId: string,
    workspaceId: string,
    dto: TelegramSendMessageDto,
  ): Promise<TelegramSendMessageResponseDto> {
    const botToken = await this.getBotToken(userId, workspaceId);

    const params: any = {
      chat_id: dto.chatId,
      text: dto.text,
    };

    if (dto.parseMode) {
      params.parse_mode = dto.parseMode;
    }

    if (dto.disableWebPagePreview !== undefined) {
      params.disable_web_page_preview = dto.disableWebPagePreview;
    }

    if (dto.disableNotification !== undefined) {
      params.disable_notification = dto.disableNotification;
    }

    if (dto.replyToMessageId) {
      params.reply_to_message_id = dto.replyToMessageId;
    }

    try {
      const response = await this.makeApiRequest(botToken, 'sendMessage', params);

      // Update last synced timestamp
      await this.updateLastSynced(userId, workspaceId);

      return {
        messageId: response.message_id,
        chatId: response.chat.id,
        date: response.date,
        text: response.text,
      };
    } catch (error) {
      this.logger.error('Failed to send message:', error.message);
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Get updates (messages sent to bot)
   */
  async getUpdates(
    userId: string,
    workspaceId: string,
    query: TelegramGetUpdatesQueryDto,
  ): Promise<TelegramUpdatesResponseDto> {
    const botToken = await this.getBotToken(userId, workspaceId);

    const params: any = {};

    if (query.offset !== undefined) {
      params.offset = query.offset;
    }

    if (query.limit !== undefined) {
      params.limit = Math.min(query.limit, 100);
    }

    if (query.timeout !== undefined) {
      params.timeout = query.timeout;
    }

    if (query.allowedUpdates && query.allowedUpdates.length > 0) {
      params.allowed_updates = query.allowedUpdates;
    }

    try {
      const response = await this.makeApiRequest(botToken, 'getUpdates', params);

      // Update last synced timestamp
      await this.updateLastSynced(userId, workspaceId);

      const updates: TelegramUpdateDto[] = response.map((update: any) =>
        this.transformUpdate(update),
      );

      // Calculate next offset
      let nextOffset: number | undefined;
      if (updates.length > 0) {
        nextOffset = updates[updates.length - 1].updateId + 1;
      }

      return {
        updates,
        count: updates.length,
        nextOffset,
      };
    } catch (error) {
      this.logger.error('Failed to get updates:', error.message);
      throw new BadRequestException(`Failed to get updates: ${error.message}`);
    }
  }

  /**
   * Get chat information
   */
  async getChat(userId: string, workspaceId: string, chatId: string): Promise<TelegramChatInfoDto> {
    const botToken = await this.getBotToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(botToken, 'getChat', { chat_id: chatId });

      return {
        id: response.id,
        type: response.type,
        title: response.title,
        username: response.username,
        firstName: response.first_name,
        lastName: response.last_name,
        description: response.description,
        inviteLink: response.invite_link,
        pinnedMessage: response.pinned_message
          ? this.transformMessage(response.pinned_message)
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get chat:', error.message);
      throw new BadRequestException(`Failed to get chat info: ${error.message}`);
    }
  }

  /**
   * Set webhook for the bot
   */
  async setWebhook(
    userId: string,
    workspaceId: string,
    dto: TelegramSetWebhookDto,
  ): Promise<{ success: boolean; description: string }> {
    const botToken = await this.getBotToken(userId, workspaceId);

    const params: any = {
      url: dto.url,
    };

    if (dto.secretToken) {
      params.secret_token = dto.secretToken;
    }

    if (dto.maxConnections) {
      params.max_connections = dto.maxConnections;
    }

    if (dto.allowedUpdates && dto.allowedUpdates.length > 0) {
      params.allowed_updates = dto.allowedUpdates;
    }

    try {
      await this.makeApiRequest(botToken, 'setWebhook', params);
      return {
        success: true,
        description: 'Webhook set successfully',
      };
    } catch (error) {
      this.logger.error('Failed to set webhook:', error.message);
      throw new BadRequestException(`Failed to set webhook: ${error.message}`);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(
    userId: string,
    workspaceId: string,
    dropPendingUpdates: boolean = false,
  ): Promise<{ success: boolean; description: string }> {
    const botToken = await this.getBotToken(userId, workspaceId);

    try {
      await this.makeApiRequest(botToken, 'deleteWebhook', {
        drop_pending_updates: dropPendingUpdates,
      });
      return {
        success: true,
        description: 'Webhook deleted successfully',
      };
    } catch (error) {
      this.logger.error('Failed to delete webhook:', error.message);
      throw new BadRequestException(`Failed to delete webhook: ${error.message}`);
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(userId: string, workspaceId: string): Promise<TelegramWebhookInfoDto> {
    const botToken = await this.getBotToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(botToken, 'getWebhookInfo');

      return {
        url: response.url || '',
        hasCustomCertificate: response.has_custom_certificate || false,
        pendingUpdateCount: response.pending_update_count || 0,
        ipAddress: response.ip_address,
        lastErrorDate: response.last_error_date,
        lastErrorMessage: response.last_error_message,
        lastSynchronizationErrorDate: response.last_synchronization_error_date,
        maxConnections: response.max_connections,
        allowedUpdates: response.allowed_updates,
      };
    } catch (error) {
      this.logger.error('Failed to get webhook info:', error.message);
      throw new BadRequestException(`Failed to get webhook info: ${error.message}`);
    }
  }

  // ==================== Helper Methods ====================

  private async makeApiRequest(botToken: string, method: string, params: any = {}): Promise<any> {
    try {
      const response = await axios.post(`${this.TELEGRAM_API_BASE}${botToken}/${method}`, params, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.ok) {
        throw new Error(response.data.description || 'Unknown Telegram API error');
      }

      return response.data.result;
    } catch (error) {
      if (error.response?.data?.description) {
        throw new Error(error.response.data.description);
      }
      throw error;
    }
  }

  private async updateLastSynced(userId: string, workspaceId: string): Promise<void> {
    try {
      const connection = await this.db.findOne('telegram_connections', {
        workspace_id: workspaceId,
        user_id: userId,
        is_active: true,
      });

      if (connection) {
        await this.db.update('telegram_connections', connection.id, {
          last_synced_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn('Failed to update last_synced_at:', error.message);
    }
  }

  private transformConnection(connection: any): TelegramConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      botId: connection.bot_id,
      botUsername: connection.bot_username,
      botName: connection.bot_name,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
      updatedAt: connection.updated_at,
    };
  }

  private transformBotInfo(bot: any): TelegramBotInfoDto {
    return {
      id: bot.id,
      isBot: bot.is_bot,
      firstName: bot.first_name,
      username: bot.username,
      canJoinGroups: bot.can_join_groups,
      canReadAllGroupMessages: bot.can_read_all_group_messages,
      supportsInlineQueries: bot.supports_inline_queries,
    };
  }

  private transformUpdate(update: any): TelegramUpdateDto {
    return {
      updateId: update.update_id,
      message: update.message ? this.transformMessage(update.message) : undefined,
      editedMessage: update.edited_message
        ? this.transformMessage(update.edited_message)
        : undefined,
      channelPost: update.channel_post ? this.transformMessage(update.channel_post) : undefined,
      editedChannelPost: update.edited_channel_post
        ? this.transformMessage(update.edited_channel_post)
        : undefined,
    };
  }

  private transformMessage(message: any): any {
    return {
      messageId: message.message_id,
      from: message.from
        ? {
            id: message.from.id,
            isBot: message.from.is_bot,
            firstName: message.from.first_name,
            lastName: message.from.last_name,
            username: message.from.username,
            languageCode: message.from.language_code,
          }
        : undefined,
      chat: {
        id: message.chat.id,
        type: message.chat.type,
        title: message.chat.title,
        username: message.chat.username,
        firstName: message.chat.first_name,
        lastName: message.chat.last_name,
      },
      date: message.date,
      text: message.text,
      replyToMessage: message.reply_to_message
        ? this.transformMessage(message.reply_to_message)
        : undefined,
    };
  }
}
