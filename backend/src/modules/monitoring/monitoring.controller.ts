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
import { MonitoringService } from './monitoring.service';
import { MonitoringQueryDto, LogQueryDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('monitoring')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/monitoring')
@UseGuards(AuthGuard, WorkspaceGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  @ApiOperation({ summary: 'Get system monitoring overview' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'System monitoring data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getSystemMonitoring(
    @Param('workspaceId') workspaceId: string,
    @Query() query: MonitoringQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.monitoringService.getSystemMonitoring(workspaceId, query);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health checks for all services' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Health check data retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getHealthChecks(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.monitoringService.getHealthChecks(workspaceId);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getPerformanceMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query() query: MonitoringQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.monitoringService.getPerformanceMetrics(workspaceId, query);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get system logs' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'System logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getSystemLogs(
    @Param('workspaceId') workspaceId: string,
    @Query() query: LogQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.monitoringService.getSystemLogs(workspaceId, query);
  }
}