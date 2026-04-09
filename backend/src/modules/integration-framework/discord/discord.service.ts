import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DiscordOAuthService } from './discord-oauth.service';
import axios from 'axios';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);
  private readonly DISCORD_API_BASE = 'https://discord.com/api/v10';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: DiscordOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'discord',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Discord not connected');
    }

    return connection;
  }

  private async makeRequest(method: string, endpoint: string, connection: any, data?: any) {
    const response = await axios({
      method,
      url: `${this.DISCORD_API_BASE}${endpoint}`,
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== MESSAGE ACTIONS ====================

  async sendMessage(userId: string, workspaceId: string, channelId: string, messageData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', `/channels/${channelId}/messages`, connection, messageData);
  }

  async getMessage(userId: string, workspaceId: string, channelId: string, messageId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/channels/${channelId}/messages/${messageId}`, connection);
  }

  async getMessages(userId: string, workspaceId: string, channelId: string, limit: number = 50) {
    const connection = await this.getConnection(userId, workspaceId);
    const response = await axios.get(`${this.DISCORD_API_BASE}/channels/${channelId}/messages`, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
      params: { limit },
    });

    return response.data;
  }

  async deleteMessage(userId: string, workspaceId: string, channelId: string, messageId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('DELETE', `/channels/${channelId}/messages/${messageId}`, connection);
  }

  // ==================== CHANNEL ACTIONS ====================

  async getChannel(userId: string, workspaceId: string, channelId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/channels/${channelId}`, connection);
  }

  async getGuildChannels(userId: string, workspaceId: string, guildId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/guilds/${guildId}/channels`, connection);
  }

  // ==================== GUILD ACTIONS ====================

  async getGuilds(userId: string, workspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', '/users/@me/guilds', connection);
  }

  async getGuild(userId: string, workspaceId: string, guildId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/guilds/${guildId}`, connection);
  }

  // ==================== USER ACTIONS ====================

  async getCurrentUser(userId: string, workspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', '/users/@me', connection);
  }
}
