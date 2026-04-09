import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== OAuth DTOs ====================

export class GitHubOAuthUrlResponseDto {
  @ApiProperty({ description: 'GitHub OAuth authorization URL' })
  authorizationUrl: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state: string;
}

export class GitHubOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from GitHub' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'State parameter for CSRF validation' })
  @IsString()
  state: string;
}

export class GitHubConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ description: 'User ID who owns this connection' })
  userId: string;

  @ApiPropertyOptional({ description: 'GitHub user ID' })
  githubId?: string;

  @ApiPropertyOptional({ description: 'GitHub username' })
  githubLogin?: string;

  @ApiPropertyOptional({ description: 'GitHub display name' })
  githubName?: string;

  @ApiPropertyOptional({ description: 'GitHub email' })
  githubEmail?: string;

  @ApiPropertyOptional({ description: 'GitHub avatar URL' })
  githubAvatar?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastSyncedAt?: string;

  @ApiProperty()
  createdAt: string;
}

// ==================== Repository DTOs ====================

export class GitHubRepositoryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  private: boolean;

  @ApiProperty()
  htmlUrl: string;

  @ApiPropertyOptional()
  language?: string;

  @ApiProperty()
  defaultBranch: string;

  @ApiProperty()
  stargazersCount: number;

  @ApiProperty()
  forksCount: number;

  @ApiProperty()
  openIssuesCount: number;

  @ApiProperty()
  updatedAt: string;
}

export class ListRepositoriesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 30 })
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({ description: 'Sort by: created, updated, pushed, full_name', default: 'updated' })
  @IsOptional()
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsOptional()
  direction?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Filter by type: all, owner, public, private, member', default: 'all' })
  @IsOptional()
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
}

export class ListRepositoriesResponseDto {
  @ApiProperty({ type: [GitHubRepositoryDto] })
  repositories: GitHubRepositoryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;
}

// ==================== Issue/PR DTOs ====================

export class GitHubLabelDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  color: string;
}

export class GitHubIssueDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  number: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  body?: string;

  @ApiProperty({ enum: ['open', 'closed'] })
  state: 'open' | 'closed';

  @ApiProperty()
  htmlUrl: string;

  @ApiProperty({ enum: ['issue', 'pull_request'] })
  type: 'issue' | 'pull_request';

  @ApiPropertyOptional()
  authorLogin?: string;

  @ApiPropertyOptional()
  authorAvatar?: string;

  @ApiProperty({ type: [GitHubLabelDto] })
  labels: GitHubLabelDto[];

  @ApiPropertyOptional()
  assignees?: string[];

  @ApiProperty()
  commentsCount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  closedAt?: string;

  // PR-specific fields
  @ApiPropertyOptional()
  mergedAt?: string;

  @ApiPropertyOptional()
  draft?: boolean;

  @ApiPropertyOptional()
  merged?: boolean;
}

export class ListIssuesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by state', default: 'open' })
  @IsOptional()
  state?: 'open' | 'closed' | 'all';

  @ApiPropertyOptional({ description: 'Filter by type', default: 'all' })
  @IsOptional()
  type?: 'issue' | 'pull_request' | 'all';

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 30 })
  @IsOptional()
  @Type(() => Number)
  perPage?: number;

  @ApiPropertyOptional({ description: 'Sort by: created, updated, comments', default: 'updated' })
  @IsOptional()
  sort?: 'created' | 'updated' | 'comments';

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsOptional()
  direction?: 'asc' | 'desc';
}

export class ListIssuesResponseDto {
  @ApiProperty({ type: [GitHubIssueDto] })
  issues: GitHubIssueDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;
}

// ==================== Issue Link DTOs ====================

export class GitHubIssueLinkDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ enum: ['issue', 'pull_request'] })
  issueType: 'issue' | 'pull_request';

  @ApiProperty()
  issueNumber: number;

  @ApiProperty()
  issueId: string;

  @ApiProperty()
  repoOwner: string;

  @ApiProperty()
  repoName: string;

  @ApiProperty()
  repoFullName: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['open', 'closed', 'merged'] })
  state: 'open' | 'closed' | 'merged';

  @ApiProperty()
  htmlUrl: string;

  @ApiPropertyOptional()
  authorLogin?: string;

  @ApiPropertyOptional()
  authorAvatar?: string;

  @ApiProperty({ type: [GitHubLabelDto] })
  labels: GitHubLabelDto[];

  @ApiProperty()
  autoUpdateTaskStatus: boolean;

  @ApiPropertyOptional()
  createdAtGithub?: string;

  @ApiPropertyOptional()
  updatedAtGithub?: string;

  @ApiPropertyOptional()
  closedAtGithub?: string;

  @ApiPropertyOptional()
  mergedAtGithub?: string;

  @ApiProperty()
  linkedBy: string;

  @ApiProperty()
  createdAt: string;
}

export class LinkIssueToTaskDto {
  @ApiProperty({ description: 'Task ID to link the issue to' })
  @IsString()
  @IsUUID()
  taskId: string;

  @ApiProperty({ description: 'Repository owner (username or org)' })
  @IsString()
  repoOwner: string;

  @ApiProperty({ description: 'Repository name' })
  @IsString()
  repoName: string;

  @ApiProperty({ description: 'Issue or PR number' })
  @IsNumber()
  @Type(() => Number)
  issueNumber: number;

  @ApiPropertyOptional({ description: 'Auto-complete task when issue/PR closes', default: false })
  @IsOptional()
  @IsBoolean()
  autoUpdateTaskStatus?: boolean;
}

export class UnlinkIssueFromTaskDto {
  @ApiProperty({ description: 'Link ID to remove' })
  @IsString()
  @IsUUID()
  linkId: string;
}
