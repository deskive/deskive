import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { WorkspaceService } from './workspace.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateWorkspaceSettingsDto,
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 409, description: 'Workspace name already exists' })
  async create(@Body() createWorkspaceDto: CreateWorkspaceDto, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    console.log('[WorkspaceController.create] User from token:', user);
    console.log('[WorkspaceController.create] Using userId:', userId);
    return this.workspaceService.create(createWorkspaceDto, userId);
  }

  @Post('logo/upload')
  @ApiOperation({ summary: 'Upload workspace logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = user.sub || user.userId;
    return this.workspaceService.uploadLogo(userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  async findAll(@CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    console.log('[WorkspaceController.findAll] User from token:', user);
    console.log('[WorkspaceController.findAll] Using userId:', userId);
    return this.workspaceService.findAll(userId);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  async findOne(@Param('workspaceId') id: string, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    return this.workspaceService.findOne(id, userId);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Update workspace details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async update(
    @Param('workspaceId') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.update(id, updateWorkspaceDto, userId);
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('owner')
  @ApiOperation({ summary: 'Delete workspace (owner only)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only owner can delete workspace' })
  async remove(@Param('workspaceId') id: string, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    return this.workspaceService.remove(id, userId);
  }

  @Post(':workspaceId/members/invite')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Invite a member to the workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.inviteMember(workspaceId, inviteMemberDto, userId);
  }

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get all members of the workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of workspace members' })
  async getMembers(@Param('workspaceId') workspaceId: string, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    return this.workspaceService.getMembers(workspaceId, userId);
  }

  @Patch(':workspaceId/members/:memberId/role')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Update member role in the workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.updateMemberRole(
      workspaceId,
      memberId,
      updateMemberRoleDto,
      userId,
    );
  }

  @Delete(':workspaceId/members/:memberId')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Remove member from the workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Cannot remove workspace owner' })
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.removeMember(workspaceId, memberId, userId);
  }

  @Get(':workspaceId/stats')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get workspace statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Workspace statistics',
    schema: {
      type: 'object',
      properties: {
        total_members: { type: 'number', description: 'Total number of members in the workspace' },
        active_members: { type: 'number', description: 'Number of active members' },
        pending_invitations: { type: 'number', description: 'Number of pending invitations' },
      },
    },
  })
  async getWorkspaceStats(@Param('workspaceId') workspaceId: string, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    return this.workspaceService.getWorkspaceStats(workspaceId, userId);
  }

  @Get(':workspaceId/members/me')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get current user membership in the workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Current user workspace membership',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        workspace_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'] },
        permissions: { type: 'array', items: { type: 'string' } },
        joined_at: { type: 'string', format: 'date-time' },
        is_active: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async getCurrentMembership(@Param('workspaceId') workspaceId: string, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    return this.workspaceService.getCurrentMembership(workspaceId, userId);
  }

  // IMPORTANT: This route MUST come BEFORE :memberId to avoid 'presence' being treated as a memberId
  @Get(':workspaceId/members/presence')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get presence status for all workspace members' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Member presence status retrieved successfully' })
  @ApiResponse({ status: 403, description: 'User is not a workspace member' })
  async getMemberPresence(@Param('workspaceId') workspaceId: string, @CurrentUser() user: any) {
    const userId = user.sub || user.userId;
    return this.workspaceService.getMemberPresence(workspaceId, userId);
  }

  @Get(':workspaceId/members/:memberId')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get a specific member by user ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'memberId', description: 'User ID of the member' })
  @ApiResponse({
    status: 200,
    description: 'Workspace member details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        workspace_id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'] },
        permissions: { type: 'array', items: { type: 'string' } },
        joined_at: { type: 'string', format: 'date-time' },
        is_active: { type: 'boolean' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async getMemberById(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.getMemberByUserId(workspaceId, memberId, userId);
  }

  @Put(':workspaceId/settings')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Update workspace settings (timezone, currency, language)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workspace settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateSettings(
    @Param('workspaceId') workspaceId: string,
    @Body() updateSettingsDto: UpdateWorkspaceSettingsDto,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.updateSettings(workspaceId, updateSettingsDto, userId);
  }

  @Get(':workspaceId/invitations')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get workspace invitations' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of workspace invitations' })
  async getWorkspaceInvitations(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.getWorkspaceInvitations(workspaceId, userId);
  }

  @Delete(':workspaceId/invitations/:invitationId')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Delete/cancel a workspace invitation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.deleteInvitation(workspaceId, invitationId, userId);
  }

  @Post(':workspaceId/invitations/:invitationId/resend')
  @UseGuards(WorkspaceGuard, RoleGuard)
  @RequireRole('admin', 'owner')
  @ApiOperation({ summary: 'Resend a workspace invitation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Invitation already accepted or expired' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async resendInvitation(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.userId;
    return this.workspaceService.resendInvitation(workspaceId, invitationId, userId);
  }
}
