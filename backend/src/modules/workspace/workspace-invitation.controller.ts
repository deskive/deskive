import { Controller, Post, Get, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WorkspaceInvitationService, AcceptInvitationDto } from './workspace-invitation.service';

@ApiTags('workspace-invitations')
@Controller('invitations')
export class WorkspaceInvitationController {
  constructor(private invitationService: WorkspaceInvitationService) {}

  @Post('accept')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  @ApiResponse({ status: 200, description: 'Successfully joined workspace' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({ status: 409, description: 'Already a member of workspace' })
  async acceptInvitation(
    @Body() acceptDto: AcceptInvitationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.invitationService.acceptInvitation(acceptDto.invitationToken, userId);
  }

  @Get('workspace/:workspaceId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending invitations for a workspace (admin only)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of pending invitations' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listPendingInvitations(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.invitationService.listPendingInvitations(workspaceId, userId);
  }

  @Delete(':invitationId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending invitation (admin only)' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiQuery({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.invitationService.cancelInvitation(workspaceId, invitationId, userId);
  }

  @Post(':invitationId/resend')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend an invitation email (admin only)' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiQuery({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async resendInvitation(
    @Param('invitationId') invitationId: string,
    @Query('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.invitationService.resendInvitation(workspaceId, invitationId, userId);
  }
}
