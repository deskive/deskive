import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WhiteboardsService } from './whiteboards.service';
import {
  CreateWhiteboardDto,
  UpdateWhiteboardDto,
  AddCollaboratorDto,
  WhiteboardResponseDto,
  WhiteboardListItemDto,
  CollaboratorResponseDto,
} from './dto/whiteboards.dto';

@ApiTags('Whiteboards')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/whiteboards')
export class WhiteboardsController {
  private readonly logger = new Logger(WhiteboardsController.name);

  constructor(private readonly whiteboardsService: WhiteboardsService) {}

  // ==================== Whiteboard CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Create a new whiteboard' })
  @ApiResponse({ status: 201, type: WhiteboardResponseDto })
  async createWhiteboard(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWhiteboardDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WhiteboardResponseDto> {
    return this.whiteboardsService.createWhiteboard(workspaceId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all whiteboards in workspace' })
  @ApiResponse({ status: 200, type: [WhiteboardListItemDto] })
  async getWhiteboards(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<WhiteboardListItemDto[]> {
    return this.whiteboardsService.getWhiteboards(workspaceId, userId);
  }

  @Get(':whiteboardId')
  @ApiOperation({ summary: 'Get a specific whiteboard' })
  @ApiResponse({ status: 200, type: WhiteboardResponseDto })
  async getWhiteboard(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<WhiteboardResponseDto> {
    return this.whiteboardsService.getWhiteboard(workspaceId, whiteboardId, userId);
  }

  @Patch(':whiteboardId')
  @ApiOperation({ summary: 'Update a whiteboard' })
  @ApiResponse({ status: 200, type: WhiteboardResponseDto })
  async updateWhiteboard(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @Body() dto: UpdateWhiteboardDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WhiteboardResponseDto> {
    this.logger.log(`Controller received update request`);
    this.logger.log(`DTO elements type: ${typeof dto.elements}, isArray: ${Array.isArray(dto.elements)}, length: ${dto.elements?.length}`);
    this.logger.log(`DTO elements preview: ${JSON.stringify(dto.elements)?.substring(0, 300)}`);
    return this.whiteboardsService.updateWhiteboard(workspaceId, whiteboardId, dto, userId);
  }

  @Delete(':whiteboardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a whiteboard' })
  @ApiResponse({ status: 204 })
  async deleteWhiteboard(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.whiteboardsService.deleteWhiteboard(workspaceId, whiteboardId, userId);
  }

  // ==================== Collaborator Management ====================

  @Post(':whiteboardId/collaborators')
  @ApiOperation({ summary: 'Add a collaborator to whiteboard' })
  @ApiResponse({ status: 201, type: CollaboratorResponseDto })
  async addCollaborator(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @Body() dto: AddCollaboratorDto,
    @CurrentUser('sub') userId: string,
  ): Promise<CollaboratorResponseDto> {
    return this.whiteboardsService.addCollaborator(workspaceId, whiteboardId, dto, userId);
  }

  @Get(':whiteboardId/collaborators')
  @ApiOperation({ summary: 'Get whiteboard collaborators' })
  @ApiResponse({ status: 200, type: [CollaboratorResponseDto] })
  async getCollaborators(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<CollaboratorResponseDto[]> {
    return this.whiteboardsService.getCollaborators(workspaceId, whiteboardId, userId);
  }

  @Delete(':whiteboardId/collaborators/:collaboratorUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a collaborator from whiteboard' })
  @ApiResponse({ status: 204 })
  async removeCollaborator(
    @Param('workspaceId') workspaceId: string,
    @Param('whiteboardId') whiteboardId: string,
    @Param('collaboratorUserId') collaboratorUserId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.whiteboardsService.removeCollaborator(workspaceId, whiteboardId, collaboratorUserId, userId);
  }
}
