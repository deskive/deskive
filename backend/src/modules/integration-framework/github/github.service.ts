import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GitHubOAuthService } from './github-oauth.service';
import axios from 'axios';
import {
  GitHubConnectionDto,
  GitHubRepositoryDto,
  ListRepositoriesQueryDto,
  ListRepositoriesResponseDto,
  GitHubIssueDto,
  ListIssuesQueryDto,
  ListIssuesResponseDto,
  GitHubIssueLinkDto,
  LinkIssueToTaskDto,
} from './dto/github.dto';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly GITHUB_API_BASE = 'https://api.github.com';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: GitHubOAuthService,
  ) {}

  // ==================== Connection Management ====================

  /**
   * Get OAuth URL for connecting GitHub
   */
  getAuthUrl(userId: string, workspaceId: string, returnUrl?: string) {
    return this.oauthService.getAuthorizationUrl(userId, workspaceId, returnUrl);
  }

  /**
   * Handle GitHub App installation callback
   * This is called when user installs the app on their account/org
   */
  async handleInstallationCallback(installationId: number, state: string): Promise<GitHubConnectionDto> {
    // Decode and validate state
    const stateData = this.oauthService.decodeState(state);
    const { userId, workspaceId } = stateData;

    // Get installation details
    const installation = await this.oauthService.getInstallation(installationId);

    // Get installation access token
    const tokens = await this.oauthService.getInstallationAccessToken(installationId);

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('github_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokens.accessToken,
      refresh_token: null,
      token_type: tokens.tokenType,
      scope: Object.keys(tokens.permissions).join(','),
      expires_at: tokens.expiresAt.toISOString(),
      installation_id: String(installationId),
      github_id: String(installation.account.id),
      github_login: installation.account.login,
      github_name: installation.account.login,
      github_email: null, // Not available from installation
      github_avatar: installation.account.avatarUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      // Update existing connection
      await this.db.update('github_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new connection
      connection = await this.db.insert('github_connections', connectionData);
    }

    this.logger.log(`GitHub App installed for user ${userId} (${installation.account.login}) in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Get user's GitHub connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<GitHubConnectionDto | null> {
    const connection = await this.db.findOne('github_connections', {
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
   * Disconnect user's GitHub in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('github_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('GitHub connection not found');
    }

    // Note: GitHub OAuth tokens cannot be revoked programmatically
    // User must revoke from GitHub settings

    // Soft delete the connection
    await this.db.update('github_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`GitHub disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get valid access token for API calls
   * Automatically refreshes installation tokens if expired
   */
  private async getValidAccessToken(userId: string, workspaceId: string): Promise<string> {
    const connection = await this.db.findOne('github_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('GitHub not connected. Please connect your GitHub account first.');
    }

    // Check if token is expired (installation tokens expire after 1 hour)
    const expiresAt = connection.expires_at ? new Date(connection.expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();

    if (isExpired && connection.installation_id) {
      // Refresh installation access token
      this.logger.log(`Refreshing expired installation token for user ${userId}`);
      try {
        const tokens = await this.oauthService.refreshInstallationToken(parseInt(connection.installation_id));

        // Update stored token
        await this.db.update('github_connections', connection.id, {
          access_token: tokens.accessToken,
          expires_at: tokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        });

        return tokens.accessToken;
      } catch (error) {
        this.logger.error('Failed to refresh installation token:', error.message);
        await this.db.update('github_connections', connection.id, {
          is_active: false,
          updated_at: new Date().toISOString(),
        });
        throw new NotFoundException('GitHub token refresh failed. Please reconnect your GitHub account.');
      }
    }

    // Validate token is still valid (for non-installation tokens or if not expired)
    if (!connection.installation_id) {
      const isValid = await this.oauthService.validateToken(connection.access_token);
      if (!isValid) {
        await this.db.update('github_connections', connection.id, {
          is_active: false,
          updated_at: new Date().toISOString(),
        });
        throw new NotFoundException('GitHub token is invalid or expired. Please reconnect your GitHub account.');
      }
    }

    return connection.access_token;
  }

  // ==================== Repository Operations ====================

  /**
   * List repositories accessible to the GitHub App installation
   */
  async listRepositories(
    userId: string,
    workspaceId: string,
    query: ListRepositoriesQueryDto,
  ): Promise<ListRepositoriesResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const params = new URLSearchParams({
      page: String(query.page || 1),
      per_page: String(query.perPage || 100),
    });

    try {
      // Use installation repositories endpoint for GitHub App
      const response = await axios.get(`${this.GITHUB_API_BASE}/installation/repositories?${params.toString()}`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      // Installation API returns { total_count, repositories: [...] }
      const repoData = response.data.repositories || response.data;
      const totalCount = response.data.total_count || repoData.length;

      const repositories = (Array.isArray(repoData) ? repoData : []).map((repo: any) => this.transformRepository(repo));

      return {
        repositories,
        total: totalCount,
        page: query.page || 1,
        perPage: query.perPage || 100,
      };
    } catch (error) {
      this.logger.error('Failed to list repositories:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get a specific repository
   */
  async getRepository(userId: string, workspaceId: string, owner: string, repo: string): Promise<GitHubRepositoryDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await axios.get(`${this.GITHUB_API_BASE}/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return this.transformRepository(response.data);
    } catch (error) {
      this.logger.error('Failed to get repository:', error.response?.data || error.message);
      throw error;
    }
  }

  // ==================== Transform Helpers ====================

  private transformConnection(connection: any): GitHubConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      githubId: connection.github_id,
      githubLogin: connection.github_login,
      githubName: connection.github_name,
      githubEmail: connection.github_email,
      githubAvatar: connection.github_avatar,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
    };
  }

  private transformRepository(repo: any): GitHubRepositoryDto {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      htmlUrl: repo.html_url,
      language: repo.language,
      defaultBranch: repo.default_branch,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      updatedAt: repo.updated_at,
    };
  }

  // ==================== Issue/PR Operations ====================

  /**
   * List issues and PRs from a repository
   */
  async listIssues(
    userId: string,
    workspaceId: string,
    owner: string,
    repo: string,
    query: ListIssuesQueryDto,
  ): Promise<ListIssuesResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const params = new URLSearchParams({
      state: query.state || 'open',
      page: String(query.page || 1),
      per_page: String(query.perPage || 30),
      sort: query.sort || 'updated',
      direction: query.direction || 'desc',
    });

    try {
      const response = await axios.get(
        `${this.GITHUB_API_BASE}/repos/${owner}/${repo}/issues?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      let issues = response.data.map((issue: any) => this.transformIssue(issue));

      // Filter by type if specified
      if (query.type && query.type !== 'all') {
        issues = issues.filter((issue: GitHubIssueDto) => issue.type === query.type);
      }

      // Filter by search query if specified
      if (query.query) {
        const searchLower = query.query.toLowerCase();
        issues = issues.filter(
          (issue: GitHubIssueDto) =>
            issue.title.toLowerCase().includes(searchLower) ||
            (issue.body && issue.body.toLowerCase().includes(searchLower)),
        );
      }

      // Get total count from Link header if available
      const linkHeader = response.headers.link;
      let total = issues.length;
      if (linkHeader && linkHeader.includes('rel="last"')) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (lastMatch) {
          total = parseInt(lastMatch[1]) * (query.perPage || 30);
        }
      }

      return {
        issues,
        total,
        page: query.page || 1,
        perPage: query.perPage || 30,
      };
    } catch (error) {
      this.logger.error('Failed to list issues:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get a specific issue or PR
   */
  async getIssue(
    userId: string,
    workspaceId: string,
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<GitHubIssueDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await axios.get(
        `${this.GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return this.transformIssue(response.data);
    } catch (error) {
      this.logger.error('Failed to get issue:', error.response?.data || error.message);
      throw error;
    }
  }

  // ==================== Issue Link Operations ====================

  /**
   * Link a GitHub issue/PR to a task
   */
  async linkIssueToTask(
    userId: string,
    workspaceId: string,
    dto: LinkIssueToTaskDto,
  ): Promise<GitHubIssueLinkDto> {
    // Get user's GitHub connection
    const connection = await this.db.findOne('github_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('GitHub not connected. Please connect your GitHub account first.');
    }

    // Verify task exists (tasks are linked to workspace via project)
    const task = await this.db.findOne('tasks', {
      id: dto.taskId,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify task belongs to a project in this workspace
    const project = await this.db.findOne('projects', {
      id: task.project_id,
      workspace_id: workspaceId,
    });

    if (!project) {
      throw new NotFoundException('Task not found in this workspace');
    }

    // Check if already linked
    const existingLink = await this.db.findOne('github_issue_links', {
      task_id: dto.taskId,
      repo_owner: dto.repoOwner,
      repo_name: dto.repoName,
      issue_number: dto.issueNumber,
    });

    if (existingLink) {
      throw new ConflictException('This issue is already linked to this task');
    }

    // Fetch issue details from GitHub
    const issue = await this.getIssue(userId, workspaceId, dto.repoOwner, dto.repoName, dto.issueNumber);

    // Determine state (for PRs, check if merged)
    let state: 'open' | 'closed' | 'merged' = issue.state;
    if (issue.type === 'pull_request' && issue.merged) {
      state = 'merged';
    }

    // Create the link
    const linkData = {
      workspace_id: workspaceId,
      task_id: dto.taskId,
      github_connection_id: connection.id,
      issue_type: issue.type,
      issue_number: dto.issueNumber,
      issue_id: String(issue.id),
      repo_owner: dto.repoOwner,
      repo_name: dto.repoName,
      repo_full_name: `${dto.repoOwner}/${dto.repoName}`,
      title: issue.title,
      state,
      html_url: issue.htmlUrl,
      author_login: issue.authorLogin,
      author_avatar: issue.authorAvatar,
      labels: JSON.stringify(issue.labels),
      auto_update_task_status: dto.autoUpdateTaskStatus || false,
      created_at_github: issue.createdAt,
      updated_at_github: issue.updatedAt,
      closed_at_github: issue.closedAt,
      merged_at_github: issue.mergedAt,
      linked_by: userId,
    };

    const link = await this.db.insert('github_issue_links', linkData);

    this.logger.log(
      `Linked GitHub ${issue.type} #${dto.issueNumber} to task ${dto.taskId} in workspace ${workspaceId}`,
    );

    return this.transformIssueLink(link);
  }

  /**
   * Unlink a GitHub issue/PR from a task
   */
  async unlinkIssueFromTask(userId: string, workspaceId: string, linkId: string): Promise<void> {
    const link = await this.db.findOne('github_issue_links', {
      id: linkId,
      workspace_id: workspaceId,
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.db.delete('github_issue_links', linkId);

    this.logger.log(`Unlinked GitHub issue link ${linkId} in workspace ${workspaceId}`);
  }

  /**
   * Get all GitHub links for a task
   */
  async getTaskLinks(userId: string, workspaceId: string, taskId: string): Promise<GitHubIssueLinkDto[]> {
    const result = await this.db.findMany('github_issue_links', {
      task_id: taskId,
      workspace_id: workspaceId,
    });

    const links = result?.data || result || [];
    return (Array.isArray(links) ? links : []).map((link: any) => this.transformIssueLink(link));
  }

  /**
   * Sync/refresh a GitHub issue link with latest data
   */
  async syncIssueLink(userId: string, workspaceId: string, linkId: string): Promise<GitHubIssueLinkDto> {
    const link = await this.db.findOne('github_issue_links', {
      id: linkId,
      workspace_id: workspaceId,
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Fetch latest issue data from GitHub
    const issue = await this.getIssue(userId, workspaceId, link.repo_owner, link.repo_name, link.issue_number);

    // Determine state
    let state: 'open' | 'closed' | 'merged' = issue.state;
    if (issue.type === 'pull_request' && issue.merged) {
      state = 'merged';
    }

    // Update the link
    const updateData = {
      title: issue.title,
      state,
      author_login: issue.authorLogin,
      author_avatar: issue.authorAvatar,
      labels: JSON.stringify(issue.labels),
      updated_at_github: issue.updatedAt,
      closed_at_github: issue.closedAt,
      merged_at_github: issue.mergedAt,
      updated_at: new Date().toISOString(),
    };

    await this.db.update('github_issue_links', linkId, updateData);

    const updatedLink = { ...link, ...updateData };
    return this.transformIssueLink(updatedLink);
  }

  // ==================== Transform Helpers ====================

  private transformIssue(issue: any): GitHubIssueDto {
    const isPR = !!issue.pull_request;

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      htmlUrl: issue.html_url,
      type: isPR ? 'pull_request' : 'issue',
      authorLogin: issue.user?.login,
      authorAvatar: issue.user?.avatar_url,
      labels: (issue.labels || []).map((label: any) => ({
        name: label.name,
        color: label.color,
      })),
      assignees: (issue.assignees || []).map((a: any) => a.login),
      commentsCount: issue.comments || 0,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      mergedAt: issue.pull_request?.merged_at,
      draft: issue.draft,
      merged: issue.pull_request?.merged_at ? true : false,
    };
  }

  private transformIssueLink(link: any): GitHubIssueLinkDto {
    return {
      id: link.id,
      taskId: link.task_id,
      workspaceId: link.workspace_id,
      issueType: link.issue_type,
      issueNumber: link.issue_number,
      issueId: link.issue_id,
      repoOwner: link.repo_owner,
      repoName: link.repo_name,
      repoFullName: link.repo_full_name,
      title: link.title,
      state: link.state,
      htmlUrl: link.html_url,
      authorLogin: link.author_login,
      authorAvatar: link.author_avatar,
      labels: typeof link.labels === 'string' ? JSON.parse(link.labels) : link.labels || [],
      autoUpdateTaskStatus: link.auto_update_task_status,
      createdAtGithub: link.created_at_github,
      updatedAtGithub: link.updated_at_github,
      closedAtGithub: link.closed_at_github,
      mergedAtGithub: link.merged_at_github,
      linkedBy: link.linked_by,
      createdAt: link.created_at,
    };
  }
}
