// src/lib/api/github-api.ts
import { api } from '@/lib/fetch';

// ==================== Types ====================

export interface GitHubConnection {
  id: string;
  workspaceId: string;
  userId: string;
  githubId?: string;
  githubLogin?: string;
  githubName?: string;
  githubEmail?: string;
  githubAvatar?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  htmlUrl: string;
  language?: string;
  defaultBranch: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  updatedAt: string;
}

export interface ListRepositoriesParams {
  page?: number;
  perPage?: number;
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
}

export interface ListRepositoriesResponse {
  repositories: GitHubRepository[];
  total: number;
  page: number;
  perPage: number;
}

// ==================== Issue/PR Types ====================

export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  htmlUrl: string;
  type: 'issue' | 'pull_request';
  authorLogin?: string;
  authorAvatar?: string;
  labels: GitHubLabel[];
  assignees?: string[];
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  // PR-specific fields
  mergedAt?: string;
  draft?: boolean;
  merged?: boolean;
}

export interface ListIssuesParams {
  state?: 'open' | 'closed' | 'all';
  type?: 'issue' | 'pull_request' | 'all';
  query?: string;
  page?: number;
  perPage?: number;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
}

export interface ListIssuesResponse {
  issues: GitHubIssue[];
  total: number;
  page: number;
  perPage: number;
}

// ==================== Issue Link Types ====================

export interface GitHubIssueLink {
  id: string;
  taskId: string;
  workspaceId: string;
  issueType: 'issue' | 'pull_request';
  issueNumber: number;
  issueId: string;
  repoOwner: string;
  repoName: string;
  repoFullName: string;
  title: string;
  state: 'open' | 'closed' | 'merged';
  htmlUrl: string;
  authorLogin?: string;
  authorAvatar?: string;
  labels: GitHubLabel[];
  autoUpdateTaskStatus: boolean;
  createdAtGithub?: string;
  updatedAtGithub?: string;
  closedAtGithub?: string;
  mergedAtGithub?: string;
  linkedBy: string;
  createdAt: string;
}

export interface LinkIssueToTaskParams {
  taskId: string;
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  autoUpdateTaskStatus?: boolean;
}

// ==================== API Functions ====================

export const githubApi = {
  // ==================== OAuth & Connection ====================

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(workspaceId: string, returnUrl?: string): Promise<{
    authorizationUrl: string;
    state: string;
  }> {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    const response = await api.get<{ data: { authorizationUrl: string; state: string } }>(
      `/workspaces/${workspaceId}/github/auth/url${params}`
    );
    return response.data;
  },

  /**
   * Get current connection status
   */
  async getConnection(workspaceId: string): Promise<GitHubConnection | null> {
    const response = await api.get<{ data: GitHubConnection | null }>(
      `/workspaces/${workspaceId}/github/connection`
    );
    return response.data;
  },

  /**
   * Disconnect GitHub
   */
  async disconnect(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/github/disconnect`);
  },

  // ==================== Repositories ====================

  /**
   * List user's repositories
   */
  async listRepositories(
    workspaceId: string,
    params: ListRepositoriesParams = {}
  ): Promise<ListRepositoriesResponse> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);
    if (params.type) queryParams.append('type', params.type);

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/github/repositories${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ data: ListRepositoriesResponse }>(url);
    return response.data;
  },

  /**
   * Get a specific repository
   */
  async getRepository(
    workspaceId: string,
    owner: string,
    repo: string
  ): Promise<GitHubRepository> {
    const response = await api.get<{ data: GitHubRepository }>(
      `/workspaces/${workspaceId}/github/repositories/${owner}/${repo}`
    );
    return response.data;
  },

  // ==================== Issues/PRs ====================

  /**
   * List issues and PRs from a repository
   */
  async listIssues(
    workspaceId: string,
    owner: string,
    repo: string,
    params: ListIssuesParams = {}
  ): Promise<ListIssuesResponse> {
    const queryParams = new URLSearchParams();

    if (params.state) queryParams.append('state', params.state);
    if (params.type) queryParams.append('type', params.type);
    if (params.query) queryParams.append('query', params.query);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.direction) queryParams.append('direction', params.direction);

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/github/repositories/${owner}/${repo}/issues${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ data: ListIssuesResponse }>(url);
    return response.data;
  },

  /**
   * Get a specific issue or PR
   */
  async getIssue(
    workspaceId: string,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<GitHubIssue> {
    const response = await api.get<{ data: GitHubIssue }>(
      `/workspaces/${workspaceId}/github/repositories/${owner}/${repo}/issues/${issueNumber}`
    );
    return response.data;
  },

  // ==================== Task Links ====================

  /**
   * Link a GitHub issue/PR to a task
   */
  async linkIssueToTask(
    workspaceId: string,
    params: LinkIssueToTaskParams
  ): Promise<GitHubIssueLink> {
    const response = await api.post<{ data: GitHubIssueLink }>(
      `/workspaces/${workspaceId}/github/links`,
      params
    );
    return response.data;
  },

  /**
   * Unlink a GitHub issue/PR from a task
   */
  async unlinkIssueFromTask(
    workspaceId: string,
    linkId: string
  ): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/github/links/${linkId}`);
  },

  /**
   * Get all GitHub links for a task
   */
  async getTaskLinks(
    workspaceId: string,
    taskId: string
  ): Promise<GitHubIssueLink[]> {
    const response = await api.get<{ data: GitHubIssueLink[] }>(
      `/workspaces/${workspaceId}/github/tasks/${taskId}/links`
    );
    return response.data;
  },

  /**
   * Sync/refresh a GitHub issue link with latest data
   */
  async syncIssueLink(
    workspaceId: string,
    linkId: string
  ): Promise<GitHubIssueLink> {
    const response = await api.post<{ data: GitHubIssueLink }>(
      `/workspaces/${workspaceId}/github/links/${linkId}/sync`,
      {}
    );
    return response.data;
  },
};

// ==================== Helper Functions ====================

/**
 * Get language color for GitHub repository
 */
export function getLanguageColor(language?: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Ruby: '#701516',
    Go: '#00ADD8',
    Rust: '#dea584',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
  };
  return colors[language || ''] || '#858585';
}

/**
 * Format repository updated time
 */
export function formatUpdatedAt(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

/**
 * Format star count
 */
export function formatStarCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}
