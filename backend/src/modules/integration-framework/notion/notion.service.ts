import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { NotionOAuthService } from './notion-oauth.service';
import axios from 'axios';

@Injectable()
export class NotionService {
  private readonly logger = new Logger(NotionService.name);
  private readonly NOTION_API_BASE = 'https://api.notion.com/v1';
  private readonly NOTION_VERSION = '2022-06-28';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: NotionOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'notion',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Notion not connected');
    }

    return connection;
  }

  private async makeRequest(method: string, endpoint: string, connection: any, data?: any) {
    const response = await axios({
      method,
      url: `${this.NOTION_API_BASE}${endpoint}`,
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Notion-Version': this.NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== PAGE ACTIONS ====================

  async createPage(userId: string, workspaceId: string, pageData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/pages', connection, pageData);
  }

  async updatePage(userId: string, workspaceId: string, pageId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('PATCH', `/pages/${pageId}`, connection, updates);
  }

  async getPage(userId: string, workspaceId: string, pageId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/pages/${pageId}`, connection);
  }

  // ==================== DATABASE ACTIONS ====================

  async queryDatabase(userId: string, workspaceId: string, databaseId: string, filter?: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest(
      'POST',
      `/databases/${databaseId}/query`,
      connection,
      filter ? { filter } : {},
    );
  }

  async getDatabase(userId: string, workspaceId: string, databaseId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/databases/${databaseId}`, connection);
  }

  // ==================== BLOCK ACTIONS ====================

  async getBlockChildren(userId: string, workspaceId: string, blockId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/blocks/${blockId}/children`, connection);
  }

  async appendBlockChildren(userId: string, workspaceId: string, blockId: string, children: any[]) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('PATCH', `/blocks/${blockId}/children`, connection, { children });
  }

  // ==================== SEARCH ACTIONS ====================

  async search(userId: string, workspaceId: string, query: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/search', connection, { query });
  }
}
