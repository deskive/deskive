import { Controller, Get, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { ClickUpService } from './clickup.service';
import { ClickUpOAuthService } from './clickup-oauth.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('ClickUp Integration')
@Controller('integrations/clickup')
export class ClickUpController {
  private readonly logger = new Logger(ClickUpController.name);

  constructor(
    private readonly clickupService: ClickUpService,
    private readonly clickupOAuthService: ClickUpOAuthService,
  ) {}

  @Get(':workspaceId/auth-url')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get ClickUp OAuth authorization URL' })
  getAuthUrl(@Param('workspaceId') workspaceId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub || req.user.userId;
    return this.clickupOAuthService.getAuthorizationUrl(userId, workspaceId);
  }
}
