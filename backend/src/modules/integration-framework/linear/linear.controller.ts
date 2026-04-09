import { Controller, Get, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { LinearService } from './linear.service';
import { LinearOAuthService } from './linear-oauth.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('Linear Integration')
@Controller('integrations/linear')
export class LinearController {
  private readonly logger = new Logger(LinearController.name);

  constructor(
    private readonly linearService: LinearService,
    private readonly linearOAuthService: LinearOAuthService,
  ) {}

  @Get(':workspaceId/auth-url')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Linear OAuth authorization URL' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.linearOAuthService.getAuthorizationUrl(userId, workspaceId);
  }
}
