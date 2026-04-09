import { Controller, Get, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { JiraService } from './jira.service';
import { JiraOAuthService } from './jira-oauth.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('Jira Integration')
@Controller('integrations/jira')
export class JiraController {
  private readonly logger = new Logger(JiraController.name);

  constructor(
    private readonly jiraService: JiraService,
    private readonly jiraOAuthService: JiraOAuthService,
  ) {}

  @Get(':workspaceId/auth-url')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Jira OAuth authorization URL' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.jiraOAuthService.getAuthorizationUrl(userId, workspaceId);
  }
}
