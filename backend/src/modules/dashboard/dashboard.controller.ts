import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { GetDashboardDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get comprehensive dashboard data for a workspace' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found or access denied' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async getDashboard(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: GetDashboardDto,
  ) {
    return this.dashboardService.getDashboardData(workspaceId, userId, query);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get smart suggestions for the dashboard' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workspace not found or access denied' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async getSuggestions(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('language') language?: string,
  ) {
    return this.dashboardService.getSuggestions(workspaceId, userId, language || 'en');
  }
}