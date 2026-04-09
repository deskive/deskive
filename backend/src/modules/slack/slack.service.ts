import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import { SlackOAuthService } from './slack-oauth.service';
import {
  SlackConnectionDto,
  SlackChannelDto,
  SlackMessageDto,
  SlackUserDto,
  SlackFileDto,
  SlackSendMessageDto,
  ListMessagesQueryDto,
  ListFilesQueryDto,
  SearchQueryDto,
} from './dto/slack.dto';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly slackApiUrl = 'https://slack.com/api';

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly slackOAuthService: SlackOAuthService,
  ) {}

  // ==========================================================================
  // OAuth & Connection Management
  // ==========================================================================

  /**
   * Handle OAuth callback and store connection
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ connection: SlackConnectionDto; returnUrl?: string }> {
    // Decode state to get workspace and user info
    const { workspaceId, userId, returnUrl } = this.slackOAuthService.decodeState(state);

    // Exchange code for tokens
    const tokenResponse = await this.slackOAuthService.exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await this.slackOAuthService.getUserInfo(
      tokenResponse.authed_user.access_token,
      tokenResponse.authed_user.id,
    );

    // Check for existing connection
    const existingConnection = await this.db.findOne('slack_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokenResponse.authed_user.access_token,
      token_type: tokenResponse.authed_user.token_type || 'Bearer',
      scope: tokenResponse.authed_user.scope,
      team_id: tokenResponse.team.id,
      team_name: tokenResponse.team.name,
      slack_user_id: tokenResponse.authed_user.id,
      slack_email: userInfo.profile?.email,
      slack_name: userInfo.real_name || userInfo.name,
      slack_picture: userInfo.profile?.image_192 || userInfo.profile?.image_72,
      bot_user_id: tokenResponse.bot_user_id,
      bot_access_token: tokenResponse.access_token,
      incoming_webhook_url: tokenResponse.incoming_webhook?.url,
      incoming_webhook_channel: tokenResponse.incoming_webhook?.channel,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      // Update existing connection
      await this.db.update('slack_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new connection
      connection = await this.db.insert('slack_connections', {
        ...connectionData,
        created_at: new Date().toISOString(),
      });
    }

    return {
      connection: this.mapToConnectionDto(connection),
      returnUrl,
    };
  }

  /**
   * Get current Slack connection for user in workspace
   */
  async getConnection(workspaceId: string, userId: string): Promise<SlackConnectionDto | null> {
    const connection = await this.db.findOne('slack_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.mapToConnectionDto(connection);
  }

  /**
   * Disconnect Slack
   */
  async disconnect(workspaceId: string, userId: string): Promise<void> {
    const connection = await this.db.findOne('slack_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('No Slack connection found');
    }

    // Revoke token
    try {
      await this.slackOAuthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    // Soft delete the connection
    await this.db.update('slack_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Channels
  // ==========================================================================

  /**
   * List channels the user has access to
   */
  async listChannels(
    workspaceId: string,
    userId: string,
    cursor?: string,
    limit = 100,
  ): Promise<{ channels: SlackChannelDto[]; nextCursor?: string }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'conversations.list', {
      types: 'public_channel,private_channel,mpim,im',
      exclude_archived: true,
      limit,
      cursor,
    });

    const channels = response.channels.map((ch: any) => this.mapToChannelDto(ch));

    return {
      channels,
      nextCursor: response.response_metadata?.next_cursor,
    };
  }

  /**
   * Get channel info
   */
  async getChannel(
    workspaceId: string,
    userId: string,
    channelId: string,
  ): Promise<SlackChannelDto> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'conversations.info', {
      channel: channelId,
    });

    return this.mapToChannelDto(response.channel);
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  /**
   * List messages in a channel
   */
  async listMessages(
    workspaceId: string,
    userId: string,
    query: ListMessagesQueryDto,
  ): Promise<{ messages: SlackMessageDto[]; hasMore: boolean; nextCursor?: string }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'conversations.history', {
      channel: query.channel,
      limit: query.limit || 50,
      cursor: query.cursor,
      oldest: query.oldest,
      latest: query.latest,
    });

    const messages = response.messages.map((msg: any) => this.mapToMessageDto(msg));

    return {
      messages,
      hasMore: response.has_more || false,
      nextCursor: response.response_metadata?.next_cursor,
    };
  }

  /**
   * Send a message
   */
  async sendMessage(
    workspaceId: string,
    userId: string,
    dto: SlackSendMessageDto,
  ): Promise<{ ok: boolean; channel: string; ts: string; message?: SlackMessageDto }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const payload: any = {
      channel: dto.channel,
      text: dto.text,
    };

    if (dto.threadTs) {
      payload.thread_ts = dto.threadTs;
      if (dto.replyBroadcast) {
        payload.reply_broadcast = true;
      }
    }

    if (dto.blocks) {
      payload.blocks = dto.blocks;
    }

    if (dto.attachments) {
      payload.attachments = dto.attachments;
    }

    const response = await this.slackApi(accessToken, 'chat.postMessage', payload);

    return {
      ok: response.ok,
      channel: response.channel,
      ts: response.ts,
      message: response.message ? this.mapToMessageDto(response.message) : undefined,
    };
  }

  /**
   * Update a message
   */
  async updateMessage(
    workspaceId: string,
    userId: string,
    channel: string,
    ts: string,
    text: string,
  ): Promise<{ ok: boolean }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'chat.update', {
      channel,
      ts,
      text,
    });

    return { ok: response.ok };
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    workspaceId: string,
    userId: string,
    channel: string,
    ts: string,
  ): Promise<{ ok: boolean }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'chat.delete', {
      channel,
      ts,
    });

    return { ok: response.ok };
  }

  // ==========================================================================
  // Reactions
  // ==========================================================================

  /**
   * Add a reaction to a message
   */
  async addReaction(
    workspaceId: string,
    userId: string,
    channel: string,
    timestamp: string,
    name: string,
  ): Promise<{ ok: boolean }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'reactions.add', {
      channel,
      timestamp,
      name,
    });

    return { ok: response.ok };
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(
    workspaceId: string,
    userId: string,
    channel: string,
    timestamp: string,
    name: string,
  ): Promise<{ ok: boolean }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'reactions.remove', {
      channel,
      timestamp,
      name,
    });

    return { ok: response.ok };
  }

  // ==========================================================================
  // Users
  // ==========================================================================

  /**
   * List users in the workspace
   */
  async listUsers(
    workspaceId: string,
    userId: string,
    cursor?: string,
    limit = 100,
  ): Promise<{ members: SlackUserDto[]; nextCursor?: string }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'users.list', {
      limit,
      cursor,
    });

    const members = response.members
      .filter((user: any) => !user.deleted && !user.is_bot)
      .map((user: any) => this.mapToUserDto(user));

    return {
      members,
      nextCursor: response.response_metadata?.next_cursor,
    };
  }

  /**
   * Get user info
   */
  async getUser(
    workspaceId: string,
    userId: string,
    slackUserId: string,
  ): Promise<SlackUserDto> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'users.info', {
      user: slackUserId,
    });

    return this.mapToUserDto(response.user);
  }

  // ==========================================================================
  // Files
  // ==========================================================================

  /**
   * List files
   */
  async listFiles(
    workspaceId: string,
    userId: string,
    query: ListFilesQueryDto,
  ): Promise<{ files: SlackFileDto[]; total: number; page: number; pages: number }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const params: any = {
      count: query.count || 50,
      page: query.page || 1,
    };

    if (query.channel) params.channel = query.channel;
    if (query.user) params.user = query.user;

    const response = await this.slackApi(accessToken, 'files.list', params);

    const files = response.files.map((file: any) => this.mapToFileDto(file));

    return {
      files,
      total: response.paging?.total || 0,
      page: response.paging?.page || 1,
      pages: response.paging?.pages || 1,
    };
  }

  /**
   * Get file info
   */
  async getFile(
    workspaceId: string,
    userId: string,
    fileId: string,
  ): Promise<SlackFileDto> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const response = await this.slackApi(accessToken, 'files.info', {
      file: fileId,
    });

    return this.mapToFileDto(response.file);
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Search messages and files
   */
  async search(
    workspaceId: string,
    userId: string,
    query: SearchQueryDto,
  ): Promise<{ messages: { total: number; matches: SlackMessageDto[] }; files?: { total: number; matches: SlackFileDto[] } }> {
    const accessToken = await this.getAccessToken(workspaceId, userId);

    const params: any = {
      query: query.query,
      count: query.count || 20,
      page: query.page || 1,
    };

    if (query.sort) params.sort = query.sort;
    if (query.sortDir) params.sort_dir = query.sortDir;

    const response = await this.slackApi(accessToken, 'search.all', params);

    return {
      messages: {
        total: response.messages?.total || 0,
        matches: (response.messages?.matches || []).map((msg: any) => this.mapToMessageDto(msg)),
      },
      files: response.files ? {
        total: response.files.total || 0,
        matches: (response.files.matches || []).map((file: any) => this.mapToFileDto(file)),
      } : undefined,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getConnectionRecord(workspaceId: string, userId: string) {
    return this.db.findOne('slack_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });
  }

  private async getAccessToken(workspaceId: string, userId: string): Promise<string> {
    const connection = await this.getConnectionRecord(workspaceId, userId);
    if (!connection) {
      throw new NotFoundException('No Slack connection found. Please connect your Slack account first.');
    }
    return connection.access_token;
  }

  private async slackApi(accessToken: string, method: string, params: any = {}): Promise<any> {
    try {
      const response = await axios.post(
        `${this.slackApiUrl}/${method}`,
        params,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );

      if (!response.data.ok) {
        throw new BadRequestException(response.data.error || `Slack API error: ${method}`);
      }

      return response.data;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Slack API error (${method}):`, error);
      throw new BadRequestException(`Failed to call Slack API: ${method}`);
    }
  }

  private mapToConnectionDto(record: any): SlackConnectionDto {
    return {
      id: record.id,
      workspaceId: record.workspace_id,
      userId: record.user_id,
      teamId: record.team_id,
      teamName: record.team_name,
      slackUserId: record.slack_user_id,
      slackEmail: record.slack_email,
      slackName: record.slack_name,
      slackPicture: record.slack_picture,
      isActive: record.is_active,
      lastSyncedAt: record.last_synced_at ? new Date(record.last_synced_at) : undefined,
      createdAt: new Date(record.created_at),
    };
  }

  private mapToChannelDto(channel: any): SlackChannelDto {
    return {
      id: channel.id,
      name: channel.name || channel.user || 'Unknown',
      topic: channel.topic?.value,
      purpose: channel.purpose?.value,
      isPrivate: channel.is_private || false,
      isIm: channel.is_im || false,
      isMember: channel.is_member || false,
      numMembers: channel.num_members || 0,
      created: channel.created,
    };
  }

  private mapToMessageDto(message: any): SlackMessageDto {
    return {
      ts: message.ts,
      text: message.text || '',
      user: message.user || '',
      username: message.username,
      threadTs: message.thread_ts,
      replyCount: message.reply_count,
      attachments: message.attachments,
      blocks: message.blocks,
      reactions: message.reactions,
    };
  }

  private mapToUserDto(user: any): SlackUserDto {
    return {
      id: user.id,
      name: user.name,
      realName: user.real_name,
      displayName: user.profile?.display_name,
      email: user.profile?.email,
      image: user.profile?.image_192 || user.profile?.image_72,
      isBot: user.is_bot || false,
      isAdmin: user.is_admin || false,
      statusText: user.profile?.status_text,
      statusEmoji: user.profile?.status_emoji,
    };
  }

  private mapToFileDto(file: any): SlackFileDto {
    return {
      id: file.id,
      name: file.name,
      title: file.title,
      mimetype: file.mimetype,
      size: file.size,
      urlPrivate: file.url_private,
      permalink: file.permalink,
      thumb: file.thumb_360 || file.thumb_160 || file.thumb_80,
      created: file.created,
      user: file.user,
    };
  }
}
