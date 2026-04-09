import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { GitHubService } from './github.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../../common/guards/workspace.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  ListRepositoriesQueryDto,
  ListIssuesQueryDto,
  LinkIssueToTaskDto,
} from './dto/github.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('github')
@Controller('workspaces/:workspaceId/github')
export class GitHubController {
  constructor(
    private readonly githubService: GitHubService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== OAuth Endpoints ====================

  @Get('auth/url')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get GitHub OAuth authorization URL' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'returnUrl', required: false, description: 'URL to redirect after OAuth' })
  @ApiResponse({ status: 200, description: 'Returns OAuth URL and state' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ) {
    const result = this.githubService.getAuthUrl(userId, workspaceId, returnUrl);
    return {
      data: result,
      message: 'OAuth URL generated successfully',
    };
  }

  @Get('connection')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current GitHub connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection details or null if not connected' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.githubService.getConnection(userId, workspaceId);
    return {
      data: connection,
      message: connection ? 'Connected' : 'Not connected',
    };
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect GitHub' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'GitHub disconnected successfully' })
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.githubService.disconnect(userId, workspaceId);
    return {
      data: null,
      message: 'GitHub disconnected successfully',
    };
  }

  // ==================== Repository Endpoints ====================

  @Get('repositories')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user repositories' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of repositories' })
  async listRepositories(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListRepositoriesQueryDto,
  ) {
    const result = await this.githubService.listRepositories(userId, workspaceId, query);
    return {
      data: result,
      message: 'Repositories fetched successfully',
    };
  }

  @Get('repositories/:owner/:repo')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific repository' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'owner', description: 'Repository owner' })
  @ApiParam({ name: 'repo', description: 'Repository name' })
  @ApiResponse({ status: 200, description: 'Repository details' })
  async getRepository(
    @Param('workspaceId') workspaceId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.githubService.getRepository(userId, workspaceId, owner, repo);
    return {
      data: result,
      message: 'Repository fetched successfully',
    };
  }

  // ==================== Issue/PR Endpoints ====================

  @Get('repositories/:owner/:repo/issues')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List issues and PRs from a repository' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'owner', description: 'Repository owner' })
  @ApiParam({ name: 'repo', description: 'Repository name' })
  @ApiResponse({ status: 200, description: 'List of issues and PRs' })
  async listIssues(
    @Param('workspaceId') workspaceId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListIssuesQueryDto,
  ) {
    const result = await this.githubService.listIssues(userId, workspaceId, owner, repo, query);
    return {
      data: result,
      message: 'Issues fetched successfully',
    };
  }

  @Get('repositories/:owner/:repo/issues/:issueNumber')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific issue or PR' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'owner', description: 'Repository owner' })
  @ApiParam({ name: 'repo', description: 'Repository name' })
  @ApiParam({ name: 'issueNumber', description: 'Issue or PR number' })
  @ApiResponse({ status: 200, description: 'Issue/PR details' })
  async getIssue(
    @Param('workspaceId') workspaceId: string,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('issueNumber') issueNumber: number,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.githubService.getIssue(userId, workspaceId, owner, repo, issueNumber);
    return {
      data: result,
      message: 'Issue fetched successfully',
    };
  }

  // ==================== Task Link Endpoints ====================

  @Post('links')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a GitHub issue/PR to a task' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Issue linked successfully' })
  async linkIssueToTask(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: LinkIssueToTaskDto,
  ) {
    const result = await this.githubService.linkIssueToTask(userId, workspaceId, dto);
    return {
      data: result,
      message: 'Issue linked to task successfully',
    };
  }

  @Delete('links/:linkId')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink a GitHub issue/PR from a task' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 200, description: 'Issue unlinked successfully' })
  async unlinkIssueFromTask(
    @Param('workspaceId') workspaceId: string,
    @Param('linkId') linkId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.githubService.unlinkIssueFromTask(userId, workspaceId, linkId);
    return {
      data: null,
      message: 'Issue unlinked from task successfully',
    };
  }

  @Get('tasks/:taskId/links')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all GitHub links for a task' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'List of GitHub links' })
  async getTaskLinks(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.githubService.getTaskLinks(userId, workspaceId, taskId);
    return {
      data: result,
      message: 'Task links fetched successfully',
    };
  }

  @Post('links/:linkId/sync')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync/refresh a GitHub issue link with latest data' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID' })
  @ApiResponse({ status: 200, description: 'Link synced successfully' })
  async syncIssueLink(
    @Param('workspaceId') workspaceId: string,
    @Param('linkId') linkId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.githubService.syncIssueLink(userId, workspaceId, linkId);
    return {
      data: result,
      message: 'Link synced successfully',
    };
  }
}

/**
 * GitHub App Installation Callback Controller
 * Handles the callback from GitHub App installation flow
 * Route: /api/v1/oauth/github/callback (matches GITHUB_OAUTH_REDIRECT_URI in .env)
 */
@ApiTags('github')
@Controller('oauth/github')
export class GitHubOAuthCallbackController {
  constructor(
    private readonly githubService: GitHubService,
    private readonly configService: ConfigService,
  ) {}

  @Get('callback')
  @ApiOperation({ summary: 'Handle GitHub App installation callback' })
  @ApiQuery({ name: 'installation_id', description: 'GitHub App installation ID', required: false })
  @ApiQuery({ name: 'setup_action', description: 'Setup action (install/update)', required: false })
  @ApiQuery({ name: 'state', description: 'State parameter for CSRF validation' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with result' })
  async handleInstallationCallback(
    @Query('installation_id') installationId: string,
    @Query('setup_action') setupAction: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    try {
      // Handle errors
      if (error) {
        console.error('GitHub App installation error:', error, errorDescription);
        return res.redirect(`${frontendUrl}?github_error=${encodeURIComponent(errorDescription || error)}`);
      }

      if (!installationId || !state) {
        console.error('Missing params - installationId:', installationId, 'state:', state);
        return res.redirect(`${frontendUrl}?github_error=missing_params`);
      }

      // Parse state to get workspace info
      let stateData: any;
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      } catch (e) {
        console.error('Failed to parse GitHub state:', e);
        return res.redirect(`${frontendUrl}?github_error=invalid_state`);
      }

      const workspaceId = stateData.workspaceId;

      console.log(`GitHub App ${setupAction} for installation ${installationId}, workspace ${workspaceId}`);

      // Handle the installation callback
      const connection = await this.githubService.handleInstallationCallback(
        parseInt(installationId),
        state,
      );

      // Build redirect URL
      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${workspaceId}/apps`;
      const separator = returnUrl.includes('?') ? '&' : '?';
      const redirectUrl = `${returnUrl}${separator}githubConnected=true&username=${encodeURIComponent(connection.githubLogin || '')}`;

      console.log('GitHub App redirect URL:', redirectUrl);

      // Check if returnUrl is a custom scheme (mobile app deep link)
      if (this.isCustomScheme(returnUrl)) {
        return this.sendDeepLinkPage(res, redirectUrl, 'GitHub Connected Successfully');
      }

      return res.redirect(redirectUrl);
    } catch (err) {
      console.error('GitHub App installation callback error:', err);

      let stateData: any = {};
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      } catch (e) {
        // Ignore parse error
      }

      let returnUrl = stateData.returnUrl || `${frontendUrl}/workspaces/${stateData.workspaceId || ''}/apps`;
      const separator = returnUrl.includes('?') ? '&' : '?';
      const errorUrl = `${returnUrl}${separator}githubError=${encodeURIComponent(err.message || 'unknown_error')}`;

      if (this.isCustomScheme(returnUrl)) {
        return this.sendDeepLinkPage(res, errorUrl, 'GitHub Connection Failed', err.message);
      }

      return res.redirect(errorUrl);
    }
  }

  /**
   * Check if URL uses a custom scheme (not http/https)
   */
  private isCustomScheme(url: string): boolean {
    try {
      const parsed = new URL(url);
      return !['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Send an HTML page that triggers a deep link
   */
  private sendDeepLinkPage(res: Response, deepLinkUrl: string, title: string, errorMessage?: string) {
    const isError = title.toLowerCase().includes('failed');
    const bgGradient = isError
      ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
      : 'linear-gradient(135deg, #24292e 0%, #0366d6 100%)';
    const buttonColor = isError ? '#e53935' : '#0366d6';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: ${bgGradient};
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
    }
    h1 { margin-bottom: 10px; font-size: 24px; }
    p { opacity: 0.9; margin-bottom: 20px; }
    .error-msg {
      background: rgba(0,0,0,0.2);
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
      word-break: break-word;
    }
    .button {
      display: inline-block;
      background: white;
      color: ${buttonColor};
      padding: 15px 40px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .button:hover { transform: scale(1.05); }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    .github-icon { font-size: 64px; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    ${isError ? '<div class="icon">&#10060;</div>' : '<div class="github-icon"><svg height="64" viewBox="0 0 16 16" width="64" fill="white"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg></div>'}
    <h1>${title}</h1>
    ${errorMessage ? `<div class="error-msg">${errorMessage}</div>` : ''}
    <p>Redirecting you back to the app...</p>
    <a href="${deepLinkUrl}" class="button">Open App</a>
  </div>
  <script>
    window.location.href = "${deepLinkUrl}";
    setTimeout(function() {
      window.location.href = "${deepLinkUrl}";
    }, 500);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }
}
