import { Controller, Get, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { TrelloService } from './trello.service';
import { TrelloOAuthService } from './trello-oauth.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('Trello Integration')
@Controller('integrations/trello')
export class TrelloController {
  private readonly logger = new Logger(TrelloController.name);

  constructor(
    private readonly trelloService: TrelloService,
    private readonly trelloOAuthService: TrelloOAuthService,
  ) {}

  @Get(':workspaceId/auth-url')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Trello OAuth authorization URL' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.trelloOAuthService.getAuthorizationUrl(userId, workspaceId);
  }
}
