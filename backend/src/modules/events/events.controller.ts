import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateActivityEventDto, EventsQueryDto, ActivityFeedQueryDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('events')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard, WorkspaceGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('workspaces/:workspaceId/events')
  @ApiOperation({ summary: 'Get events for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async findEvents(
    @Param('workspaceId') workspaceId: string,
    @Query() query: EventsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.eventsService.findEvents(workspaceId, query, userId);
  }

  @Post('workspaces/:workspaceId/events')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async createEvent(
    @Param('workspaceId') workspaceId: string,
    @Body() createEventDto: CreateActivityEventDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.eventsService.createEvent(workspaceId, createEventDto, userId);
  }

  @Get('workspaces/:workspaceId/activity-feed')
  @ApiOperation({ summary: 'Get activity feed for workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Activity feed retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied to workspace' })
  async getActivityFeed(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ActivityFeedQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.eventsService.getActivityFeed(workspaceId, query, userId);
  }

  @Patch('workspaces/:workspaceId/events/:eventId/read')
  @ApiOperation({ summary: 'Mark event as read' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event marked as read' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async markEventAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('eventId') eventId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.eventsService.markEventAsRead(workspaceId, eventId, userId);
  }

  @Patch('workspaces/:workspaceId/events/read-all')
  @ApiOperation({ summary: 'Mark all events as read' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'All events marked as read' })
  async markAllEventsAsRead(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.eventsService.markAllEventsAsRead(workspaceId, userId);
  }

  @Delete('workspaces/:workspaceId/events/expired')
  @ApiOperation({ summary: 'Delete expired events' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Expired events deleted' })
  async deleteExpiredEvents(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.eventsService.deleteExpiredEvents(workspaceId);
  }
}