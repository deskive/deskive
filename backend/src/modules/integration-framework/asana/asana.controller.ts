import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { AsanaService } from './asana.service';
import { AsanaOAuthService } from './asana-oauth.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub?: string;
    userId?: string;
  };
}

@ApiTags('Asana Integration')
@Controller('integrations/asana')
export class AsanaController {
  private readonly logger = new Logger(AsanaController.name);

  constructor(
    private readonly asanaService: AsanaService,
    private readonly asanaOAuthService: AsanaOAuthService,
  ) {}

  @Get(':workspaceId/auth-url')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Asana OAuth authorization URL' })
  getAuthUrl(@Param('workspaceId') workspaceId: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub || req.user.userId;
    return this.asanaOAuthService.getAuthorizationUrl(userId, workspaceId);
  }

  @Get(':workspaceId/tasks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Asana tasks' })
  async getTasks(
    @Param('workspaceId') workspaceId: string,
    @Query() filters: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.asanaService.getTasks(userId, workspaceId, filters);
  }

  @Post(':workspaceId/tasks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Asana task' })
  async createTask(
    @Param('workspaceId') workspaceId: string,
    @Body() taskData: any,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.asanaService.createTask(userId, workspaceId, taskData);
  }
}
