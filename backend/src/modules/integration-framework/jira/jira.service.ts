import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JiraOAuthService } from './jira-oauth.service';
import axios from 'axios';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private readonly JIRA_API_BASE = 'https://api.atlassian.com/ex/jira';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: JiraOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'jira',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Jira not connected');
    }

    return connection;
  }

  private async makeRequest(method: string, endpoint: string, connection: any, cloudId: string, data?: any) {
    const response = await axios({
      method,
      url: `${this.JIRA_API_BASE}/${cloudId}${endpoint}`,
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== ISSUE ACTIONS ====================

  async createIssue(userId: string, workspaceId: string, cloudId: string, issueData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/rest/api/3/issue', connection, cloudId, { fields: issueData });
  }

  async updateIssue(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('PUT', `/rest/api/3/issue/${issueIdOrKey}`, connection, cloudId, { fields: updates });
  }

  async getIssue(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/rest/api/3/issue/${issueIdOrKey}`, connection, cloudId);
  }

  async searchIssues(userId: string, workspaceId: string, cloudId: string, jql: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/rest/api/3/search', connection, cloudId, { jql, maxResults: 50 });
  }

  async deleteIssue(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('DELETE', `/rest/api/3/issue/${issueIdOrKey}`, connection, cloudId);
  }

  // ==================== COMMENT ACTIONS ====================

  async addComment(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string, body: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', `/rest/api/3/issue/${issueIdOrKey}/comment`, connection, cloudId, {
      body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: body }] }] },
    });
  }

  async getComments(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/rest/api/3/issue/${issueIdOrKey}/comment`, connection, cloudId);
  }

  // ==================== PROJECT ACTIONS ====================

  async getProjects(userId: string, workspaceId: string, cloudId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', '/rest/api/3/project', connection, cloudId);
  }

  async getProject(userId: string, workspaceId: string, cloudId: string, projectIdOrKey: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/rest/api/3/project/${projectIdOrKey}`, connection, cloudId);
  }

  // ==================== TRANSITION ACTIONS ====================

  async transitionIssue(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string, transitionId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', `/rest/api/3/issue/${issueIdOrKey}/transitions`, connection, cloudId, { transition: { id: transitionId } });
  }

  async getTransitions(userId: string, workspaceId: string, cloudId: string, issueIdOrKey: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/rest/api/3/issue/${issueIdOrKey}/transitions`, connection, cloudId);
  }

  // ==================== USER ACTIONS ====================

  async getCurrentUser(userId: string, workspaceId: string, cloudId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', '/rest/api/3/myself', connection, cloudId);
  }
}
