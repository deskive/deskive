import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ClickUpOAuthService } from './clickup-oauth.service';
import axios from 'axios';

@Injectable()
export class ClickUpService {
  private readonly logger = new Logger(ClickUpService.name);
  private readonly CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: ClickUpOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'clickup',
      is_active: true,
    });

    if (!connection) {
      throw new Error('ClickUp not connected');
    }

    return connection;
  }

  private async makeRequest(method: string, endpoint: string, connection: any, data?: any) {
    const response = await axios({
      method,
      url: `${this.CLICKUP_API_BASE}${endpoint}`,
      headers: {
        Authorization: connection.access_token,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== TASK ACTIONS ====================

  async createTask(userId: string, workspaceId: string, listId: string, taskData: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/list/${listId}/task`, connection, taskData);
  }

  async updateTask(userId: string, workspaceId: string, taskId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('PUT', `/task/${taskId}`, connection, updates);
  }

  async getTask(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/task/${taskId}`, connection);
  }

  async getTasks(userId: string, workspaceId: string, listId: string, filters?: any) {
    const connection = await this.getConnection(userId, workspaceId);

    const params = new URLSearchParams();
    if (filters?.archived) params.append('archived', filters.archived);
    if (filters?.subtasks) params.append('subtasks', filters.subtasks);

    return this.makeRequest('GET', `/list/${listId}/task?${params.toString()}`, connection);
  }

  async deleteTask(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('DELETE', `/task/${taskId}`, connection);
  }

  // ==================== LIST ACTIONS ====================

  async createList(userId: string, workspaceId: string, folderId: string, listData: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/folder/${folderId}/list`, connection, listData);
  }

  async getLists(userId: string, workspaceId: string, folderId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/folder/${folderId}/list`, connection);
  }

  // ==================== COMMENT ACTIONS ====================

  async addComment(userId: string, workspaceId: string, taskId: string, commentText: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/task/${taskId}/comment`, connection, {
      comment_text: commentText,
    });
  }

  async getComments(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/task/${taskId}/comment`, connection);
  }

  // ==================== SPACE/FOLDER ACTIONS ====================

  async getSpaces(userId: string, workspaceId: string, teamId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/team/${teamId}/space`, connection);
  }

  async getFolders(userId: string, workspaceId: string, spaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/space/${spaceId}/folder`, connection);
  }

  // ==================== USER ACTIONS ====================

  async getCurrentUser(userId: string, workspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', '/user', connection);
  }
}
