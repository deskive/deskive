import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LinearOAuthService } from './linear-oauth.service';
import axios from 'axios';

@Injectable()
export class LinearService {
  private readonly logger = new Logger(LinearService.name);
  private readonly LINEAR_API_BASE = 'https://api.linear.app/graphql';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: LinearOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'linear',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Linear not connected');
    }

    return connection;
  }

  private async makeGraphQLRequest(query: string, variables: any, connection: any) {
    const response = await axios.post(
      this.LINEAR_API_BASE,
      { query, variables },
      {
        headers: {
          Authorization: connection.access_token,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.data;
  }

  // ==================== ISSUE ACTIONS ====================

  async createIssue(userId: string, workspaceId: string, issueData: any) {
    const connection = await this.getConnection(userId, workspaceId);

    const mutation = `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id title }
        }
      }
    `;

    return this.makeGraphQLRequest(mutation, { input: issueData }, connection);
  }

  async updateIssue(userId: string, workspaceId: string, issueId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);

    const mutation = `
      mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { id title }
        }
      }
    `;

    return this.makeGraphQLRequest(mutation, { id: issueId, input: updates }, connection);
  }

  async getIssue(userId: string, workspaceId: string, issueId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    const query = `
      query Issue($id: String!) {
        issue(id: $id) {
          id title description state { name }
        }
      }
    `;

    return this.makeGraphQLRequest(query, { id: issueId }, connection);
  }

  async getIssues(userId: string, workspaceId: string, filters?: any) {
    const connection = await this.getConnection(userId, workspaceId);

    const query = `
      query Issues($first: Int) {
        issues(first: $first) {
          nodes { id title description state { name } }
        }
      }
    `;

    return this.makeGraphQLRequest(query, { first: filters?.limit || 50 }, connection);
  }

  // ==================== COMMENT ACTIONS ====================

  async addComment(userId: string, workspaceId: string, issueId: string, body: string) {
    const connection = await this.getConnection(userId, workspaceId);

    const mutation = `
      mutation CommentCreate($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id body }
        }
      }
    `;

    return this.makeGraphQLRequest(mutation, { input: { issueId, body } }, connection);
  }

  // ==================== USER ACTIONS ====================

  async getCurrentUser(userId: string, workspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);

    const query = `
      query Viewer {
        viewer { id name email }
      }
    `;

    return this.makeGraphQLRequest(query, {}, connection);
  }
}
