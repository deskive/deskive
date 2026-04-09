import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/analytics')
@UseGuards(AuthGuard, WorkspaceGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get workspace analytics overview' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getWorkspaceAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analyticsService.getWorkspaceAnalytics(workspaceId, query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user analytics for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'User analytics data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getUserAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analyticsService.getUserAnalytics(workspaceId, query);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get project analytics for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Project analytics data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getProjectAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analyticsService.getProjectAnalytics(workspaceId, query);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get task analytics for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Task analytics data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getTaskAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analyticsService.getTaskAnalytics(workspaceId, query);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity analytics for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Activity analytics data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getActivityAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.analyticsService.getActivityAnalytics(workspaceId, query);
  }
}