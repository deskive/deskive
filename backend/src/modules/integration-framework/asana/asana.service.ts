import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AsanaOAuthService } from './asana-oauth.service';
import axios from 'axios';

@Injectable()
export class AsanaService {
  private readonly logger = new Logger(AsanaService.name);
  private readonly ASANA_API_BASE = 'https://app.asana.com/api/1.0';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: AsanaOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'asana',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Asana not connected');
    }

    return connection;
  }

  private async makeRequest(method: string, endpoint: string, connection: any, data?: any) {
    const response = await axios({
      method,
      url: `${this.ASANA_API_BASE}${endpoint}`,
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data.data;
  }

  // ==================== TASK ACTIONS ====================

  async createTask(userId: string, workspaceId: string, taskData: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', '/tasks', connection, {
      data: taskData,
    });
  }

  async updateTask(userId: string, workspaceId: string, taskId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('PUT', `/tasks/${taskId}`, connection, {
      data: updates,
    });
  }

  async getTask(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/tasks/${taskId}`, connection);
  }

  async getTasks(userId: string, workspaceId: string, filters?: any) {
    const connection = await this.getConnection(userId, workspaceId);

    const params = new URLSearchParams();
    if (filters?.projectId) params.append('project', filters.projectId);
    if (filters?.assigneeId) params.append('assignee', filters.assigneeId);

    const response = await axios.get(`${this.ASANA_API_BASE}/tasks?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    return response.data.data;
  }

  async deleteTask(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('DELETE', `/tasks/${taskId}`, connection);
  }

  async assignTask(userId: string, workspaceId: string, taskId: string, assigneeId: string) {
    return this.updateTask(userId, workspaceId, taskId, { assignee: assigneeId });
  }

  // ==================== PROJECT ACTIONS ====================

  async createProject(userId: string, workspaceId: string, projectData: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', '/projects', connection, {
      data: projectData,
    });
  }

  async updateProject(userId: string, workspaceId: string, projectId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('PUT', `/projects/${projectId}`, connection, {
      data: updates,
    });
  }

  async getProject(userId: string, workspaceId: string, projectId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/projects/${projectId}`, connection);
  }

  async getProjects(userId: string, workspaceId: string, asanaWorkspaceId?: string) {
    const connection = await this.getConnection(userId, workspaceId);

    const params = asanaWorkspaceId ? `?workspace=${asanaWorkspaceId}` : '';
    const response = await axios.get(`${this.ASANA_API_BASE}/projects${params}`, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    return response.data.data;
  }

  async deleteProject(userId: string, workspaceId: string, projectId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('DELETE', `/projects/${projectId}`, connection);
  }

  // ==================== COMMENT ACTIONS ====================

  async addComment(userId: string, workspaceId: string, taskId: string, text: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/tasks/${taskId}/stories`, connection, {
      data: { text },
    });
  }

  async getComments(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/tasks/${taskId}/stories`, connection);
  }

  // ==================== SUBTASK ACTIONS ====================

  async createSubtask(userId: string, workspaceId: string, parentTaskId: string, subtaskData: any) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/tasks/${parentTaskId}/subtasks`, connection, {
      data: subtaskData,
    });
  }

  async getSubtasks(userId: string, workspaceId: string, taskId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/tasks/${taskId}/subtasks`, connection);
  }

  // ==================== SEARCH ACTIONS ====================

  async searchTasks(userId: string, workspaceId: string, asanaWorkspaceId: string, query?: string) {
    const connection = await this.getConnection(userId, workspaceId);

    const params = new URLSearchParams({
      workspace: asanaWorkspaceId,
      ...(query && { text: query }),
    });

    const response = await axios.get(`${this.ASANA_API_BASE}/tasks?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    return response.data.data;
  }

  // ==================== USER ACTIONS ====================

  async getCurrentUser(userId: string, workspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', '/users/me', connection);
  }

  async getUser(userId: string, workspaceId: string, asanaUserId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('GET', `/users/${asanaUserId}`, connection);
  }

  // ==================== SECTION ACTIONS ====================

  async createSection(userId: string, workspaceId: string, projectId: string, name: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/projects/${projectId}/sections`, connection, {
      data: { name },
    });
  }

  // ==================== TAG/LABEL ACTIONS ====================

  async addTagToTask(userId: string, workspaceId: string, taskId: string, tagId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    return this.makeRequest('POST', `/tasks/${taskId}/addTag`, connection, {
      data: { tag: tagId },
    });
  }

  async getTags(userId: string, workspaceId: string, asanaWorkspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    const response = await axios.get(`${this.ASANA_API_BASE}/tags?workspace=${asanaWorkspaceId}`, {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    return response.data.data;
  }
}
