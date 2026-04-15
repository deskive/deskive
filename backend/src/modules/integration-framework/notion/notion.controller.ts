import { Controller, Get, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { NotionService } from './notion.service';
import { NotionOAuthService } from './notion-oauth.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('Notion Integration')
@Controller('integrations/notion')
export class NotionController {
  private readonly logger = new Logger(NotionController.name);

  constructor(
    private readonly notionService: NotionService,
    private readonly notionOAuthService: NotionOAuthService,
  ) {}

  @Get(':workspaceId/auth-url')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Notion OAuth authorization URL' })
  getAuthUrl(@Param('workspaceId') workspaceId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub || req.user.userId;
    return this.notionOAuthService.getAuthorizationUrl(userId, workspaceId);
  }
}
