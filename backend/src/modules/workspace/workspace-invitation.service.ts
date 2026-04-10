import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface InviteWorkspaceMemberDto {
  email: string;
  role?: 'admin' | 'member';
  message?: string;
}

export interface AcceptInvitationDto {
  invitationToken: string;
}

@Injectable()
export class WorkspaceInvitationService {
  private readonly logger = new Logger(WorkspaceInvitationService.name);

  constructor(
    private readonly db: DatabaseService,
  ) {}

  /**
   * Send workspace invitation using database
   * This handles both registered and unregistered users
   */
  async inviteToWorkspace(
    workspaceId: string, 
    inviteDto: InviteWorkspaceMemberDto,
    invitedBy: string
  ) {
    try {
      // Check if workspace exists
      const workspace = await this.db.findOne('workspaces', { id: workspaceId });
      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      // Check if inviter has permission
      await this.verifyWorkspaceAdmin(workspaceId, invitedBy);

      // Check workspace member limit based on subscription plan
      await this.checkMemberLimit(workspaceId, invitedBy);

      // Check if user is already a member
      const existingMember = await this.db.table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', inviteDto.email) // Check by email first
        .where('is_active', '=', true)
        .execute();

      if (existingMember.data && existingMember.data.length > 0) {
        throw new ConflictException('User is already a member of this workspace');
      }

      // Check if there's already a pending invitation
      const existingInvite = await this.db.table('workspace_invites')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('email', '=', inviteDto.email)
        .where('status', '=', 'pending')
        .execute();

      if (existingInvite.data && existingInvite.data.length > 0) {
        throw new ConflictException('An invitation has already been sent to this email');
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation in database
      const invitation = await this.db.insert('workspace_invites', {
        workspace_id: workspaceId,
        email: inviteDto.email,
        role: inviteDto.role || 'member',
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });

      // Send invitation email
      await this.sendInvitationEmail(inviteDto.email, token, workspace.name, inviteDto.message);

      this.logger.log(`Invitation sent to ${inviteDto.email} for workspace ${workspaceId}`);

      return {
        success: true,
        invitationId: invitation.id,
        email: inviteDto.email,
        status: 'pending',
        expiresAt: invitation.expires_at,
        message: 'Invitation sent successfully. The user will receive an email with instructions.',
      };
    } catch (error) {
      this.logger.error('Failed to send workspace invitation', error);
      
      if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to send invitation');
    }
  }

  /**
   * List pending invitations for a workspace
   */
  async listPendingInvitations(workspaceId: string, userId: string) {
    try {
      // Verify user has permission to view invitations
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      const invitations = await this.db.table('workspace_invites')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', 'pending')
        .orderBy('created_at', 'desc')
        .execute();

      // Get inviter details for each invitation
      const invitationsWithDetails = await Promise.all(
        (invitations.data || []).map(async (invite) => {
          let inviterName = 'unknown';
          try {
            const inviter = await this.db.getUserById(invite.invited_by);
            inviterName = inviter?.metadata?.name || inviter?.name || inviter?.email || 'unknown';
          } catch (error) {
            // Inviter might not exist
          }

          return {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            status: invite.status,
            invitedBy: inviterName,
            invitedAt: invite.created_at,
            expiresAt: invite.expires_at,
          };
        })
      );

      return {
        success: true,
        invitations: invitationsWithDetails
      };
    } catch (error) {
      this.logger.error('Failed to list invitations', error);
      throw new BadRequestException('Failed to retrieve invitations');
    }
  }

  /**
   * Get invitation details by token (PUBLIC - for AcceptInvitation page)
   * This allows users to view invitation details before logging in
   */
  async getInvitationByToken(token: string) {
    try {
      // Find the invitation by token
      const invitationResult = await this.db.table('workspace_invites')
        .select('*')
        .where('token', '=', token)
        .execute();

      const invitation = invitationResult.data?.[0];
      if (!invitation) {
        throw new NotFoundException('Invalid invitation token');
      }

      // Get workspace details
      const workspace = await this.db.findOne('workspaces', { id: invitation.workspace_id });

      // Get inviter details
      let inviterName = 'Unknown';
      try {
        const inviter = await this.db.getUserById(invitation.invited_by);
        inviterName = inviter?.metadata?.name || inviter?.name || inviter?.email || 'Unknown';
      } catch (error) {
        // Inviter might not exist
      }

      // Return invitation details in the format expected by frontend
      return {
        success: true,
        invitation: {
          id: invitation.id,
          workspace_id: invitation.workspace_id,
          workspace_name: workspace?.name || 'Unknown Workspace',
          workspace_display_name: workspace?.name || 'Unknown Workspace',
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          token: invitation.token,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          invited_by: invitation.invited_by,
          invited_by_name: inviterName,
          message: invitation.message || '',
          initial_skills: invitation.initial_skills || [],
          workspace: {
            id: workspace?.id,
            name: workspace?.name,
            description: workspace?.description,
            logo: workspace?.logo,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to get invitation by token', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve invitation details');
    }
  }

  /**
   * Decline invitation by token (PUBLIC)
   */
  async declineInvitation(token: string) {
    try {
      // Find the invitation by token
      const invitationResult = await this.db.table('workspace_invites')
        .select('*')
        .where('token', '=', token)
        .execute();

      const invitation = invitationResult.data?.[0];
      if (!invitation) {
        throw new NotFoundException('Invalid invitation token');
      }

      // Update invitation status to declined
      await this.db.update('workspace_invites', invitation.id, {
        status: 'declined',
        declined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Invitation declined successfully',
      };
    } catch (error) {
      this.logger.error('Failed to decline invitation', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to decline invitation');
    }
  }

  /**
   * Accept a workspace invitation
   * This can be called after user registration
   */
  async acceptInvitation(invitationToken: string, userId: string) {
    try {
      // Find the invitation by token
      const invitationResult = await this.db.table('workspace_invites')
        .select('*')
        .where('token', '=', invitationToken)
        .execute();

      const invitation = invitationResult.data?.[0];
      if (!invitation) {
        throw new NotFoundException('Invalid invitation token');
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new BadRequestException('Invitation has expired');
      }

      // Check if already accepted
      if (invitation.status !== 'pending') {
        throw new ConflictException('Invitation has already been ' + invitation.status);
      }

      // Check if user is already a member
      const existingMember = await this.db.table('workspace_members')
        .select('*')
        .where('workspace_id', '=', invitation.workspace_id)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      if (existingMember.data && existingMember.data.length > 0) {
        // Update invitation status
        await this.db.update('workspace_invites', invitation.id, {
          status: 'accepted',
          accepted_at: new Date().toISOString()
        });
        
        throw new ConflictException('You are already a member of this workspace');
      }

      // Add user to workspace
      await this.db.insert('workspace_members', {
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
        permissions: invitation.role === 'admin' ? ['manage_members', 'manage_settings'] : [],
        joined_at: new Date().toISOString(),
        invited_at: invitation.created_at,
        invited_by: invitation.invited_by,
        is_active: true
      });

      // Update invitation status
      await this.db.update('workspace_invites', invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });

      this.logger.log(`User ${userId} accepted invitation to workspace ${invitation.workspace_id}`);

      return {
        success: true,
        workspaceId: invitation.workspace_id,
        role: invitation.role,
        message: 'Successfully joined the workspace',
      };
    } catch (error) {
      this.logger.error('Failed to accept invitation', error);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException('Failed to accept invitation');
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(workspaceId: string, invitationId: string, userId: string) {
    try {
      // Verify user has permission
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // Check if invitation exists and belongs to this workspace
      const invitation = await this.db.findOne('workspace_invites', {
        id: invitationId,
        workspace_id: workspaceId
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new BadRequestException('Can only cancel pending invitations');
      }

      // Update invitation status
      await this.db.update('workspace_invites', invitationId, {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Invitation cancelled successfully',
      };
    } catch (error) {
      this.logger.error('Failed to cancel invitation', error);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to cancel invitation');
    }
  }

  /**
   * Resend an invitation email
   */
  async resendInvitation(workspaceId: string, invitationId: string, userId: string) {
    try {
      // Verify user has permission
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // Get the invitation details
      const invitation = await this.db.findOne('workspace_invites', {
        id: invitationId,
        workspace_id: workspaceId
      });
      
      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }
      
      if (invitation.status !== 'pending') {
        throw new BadRequestException('Can only resend pending invitations');
      }

      // Generate new token and extend expiry
      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days expiry

      // Update invitation with new token and expiry
      await this.db.update('workspace_invites', invitationId, {
        token: newToken,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      });

      // Get workspace details for email
      const workspace = await this.db.findOne('workspaces', { id: workspaceId });

      // Resend invitation email
      await this.sendInvitationEmail(
        invitation.email, 
        newToken, 
        workspace.name, 
        'This is a resent invitation to join our workspace on Deskive'
      );
      
      this.logger.log(`Resent invitation to ${invitation.email} for workspace ${workspaceId}`);
      
      return {
        success: true,
        invitationId: invitation.id,
        message: 'Invitation resent successfully.',
      };
    } catch (error) {
      this.logger.error('Failed to resend invitation', error);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to resend invitation');
    }
  }

  /**
   * Check if workspace has reached member limit.
   * Open-source self-hosted: no plan-based limits, all workspaces unlimited.
   */
  private async checkMemberLimit(workspaceId: string, userId: string): Promise<void> {
    return;
  }

  /**
   * Validate current member count against limit
   */
  private async validateMemberCount(workspaceId: string, maxMembers: number): Promise<void> {
    // Get current active members count
    const activeMembersResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    const currentMemberCount = activeMembersResult.data?.length || 0;

    // Get pending invitations count
    const pendingInvitesResult = await this.db.table('workspace_invites')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('status', '=', 'pending')
      .execute();

    const pendingInvitesCount = pendingInvitesResult.data?.length || 0;

    // Total members = active members + pending invitations
    const totalMembers = currentMemberCount + pendingInvitesCount;

    this.logger.log(
      `Workspace ${workspaceId} member check: ${currentMemberCount} active + ${pendingInvitesCount} pending = ${totalMembers}/${maxMembers} limit`
    );

    if (totalMembers >= maxMembers) {
      throw new BadRequestException(
        `Workspace member limit reached. Your current plan allows ${maxMembers} member${maxMembers === 1 ? '' : 's'}. ` +
        `You currently have ${currentMemberCount} active member${currentMemberCount === 1 ? '' : 's'} and ${pendingInvitesCount} pending invitation${pendingInvitesCount === 1 ? '' : 's'}. ` +
        `Please upgrade your plan to invite more members.`
      );
    }
  }

  /**
   * Verify user is admin of workspace
   */
  private async verifyWorkspaceAdmin(workspaceId: string, userId: string): Promise<void> {
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .execute();

    const membership = membershipResult.data?.[0];
    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      throw new BadRequestException('Insufficient permissions to manage invitations');
    }
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(email: string, token: string, workspaceName: string, message?: string) {
    try {
      // TODO: Replace with your actual frontend URL
      const inviteUrl = `${process.env.FRONTEND_URL || 'https://deskive.com'}/invite/${token}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been invited to join ${workspaceName} on Deskive</h2>
          <p>${message || "You've been invited to collaborate on Deskive."}</p>
          <p>Click the button below to accept the invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
          </div>
          <p>Or copy and paste this link: ${inviteUrl}</p>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        </div>
      `;

      await /* TODO: use EmailService */ this.db.sendEmail(
        email,
        `Invitation to join ${workspaceName} on Deskive`,
        emailHtml,
        `You've been invited to join ${workspaceName} on Deskive. Accept invitation: ${inviteUrl}`
      );
    } catch (error) {
      this.logger.error('Failed to send invitation email', error);
      // Don't throw - we still want to create the invitation even if email fails
    }
  }

  /**
   * Get available roles for workspace invitations
   * database supports 'admin' and 'member' roles
   */
  async getAvailableRoles(workspaceId: string, userId: string) {
    try {
      // Verify user has permission to view roles
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // Return the available roles from database
      const roles = [
        {
          name: 'admin',
          displayName: 'Admin',
          description: 'Can manage workspace settings and invite members',
          isBuiltIn: true,
          hierarchy: 2,
          permissions: ['invite', 'manage_settings', 'manage_members']
        },
        {
          name: 'member',
          displayName: 'Member',
          description: 'Regular workspace member with standard access',
          isBuiltIn: true,
          hierarchy: 1,
          permissions: ['access_workspace']
        }
      ];

      return {
        success: true,
        roles
      };
    } catch (error) {
      this.logger.error('Failed to get available roles', error);
      throw new BadRequestException('Failed to retrieve available roles');
    }
  }

  /**
   * Update member role in workspace
   */
  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: 'admin' | 'member',
    userId: string
  ) {
    try {
      // Verify user has permission to change roles
      await this.verifyWorkspaceAdmin(workspaceId, userId);

      // Check if member exists
      const member = await this.db.findOne('workspace_members', {
        id: memberId,
        workspace_id: workspaceId
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      // Cannot change owner's role
      if (member.role === 'owner') {
        throw new BadRequestException('Cannot change owner role');
      }

      // Update member role
      const permissions = newRole === 'admin' ? ['manage_members', 'manage_settings'] : [];
      
      await this.db.update('workspace_members', memberId, {
        role: newRole,
        permissions,
        updated_at: new Date().toISOString()
      });

      this.logger.log(`Updated member ${memberId} role to ${newRole} in workspace ${workspaceId}`);

      return {
        success: true,
        message: 'Member role updated successfully',
      };
    } catch (error) {
      this.logger.error('Failed to update member role', error);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to update member role');
    }
  }

  /**
   * Check if user has permission for a specific action
   * Since database doesn't expose checkPermission, we'll implement basic role-based checks
   */
  async checkPermission(
    workspaceId: string,
    action: string,
    resource: string,
    userId: string,
    context?: any
  ) {
    try {
      // Get user's membership details
      const membershipResult = await this.db.table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const membership = membershipResult.data?.[0];
      if (!membership) {
        return {
          hasPermission: false,
          message: 'User is not a member of this workspace',
        };
      }

      // Basic permission logic based on role
      const userRole = membership.role;
      let hasPermission = false;

      switch (action) {
        case 'invite':
        case 'manage_settings':
        case 'manage_members':
          hasPermission = userRole === 'admin' || userRole === 'owner';
          break;
        case 'access_workspace':
          hasPermission = true; // All members can access workspace
          break;
        default:
          hasPermission = false;
      }

      return {
        hasPermission,
        message: hasPermission ? 'Permission granted' : 'Insufficient permissions',
        userRole,
      };
    } catch (error) {
      this.logger.error('Failed to check permission', error);
      return {
        hasPermission: false,
        message: 'Permission check failed',
      };
    }
  }
}