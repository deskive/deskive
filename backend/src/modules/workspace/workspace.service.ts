import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { WorkspaceInvitationService, InviteWorkspaceMemberDto } from './workspace-invitation.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, UpdateMemberRoleDto, UpdateWorkspaceSettingsDto } from './dto';
import { PresenceService } from '../../common/gateways/presence.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly db: DatabaseService,
    private invitationService: WorkspaceInvitationService,
    private presenceService: PresenceService,
  ) {}

  async uploadLogo(userId: string, file: Express.Multer.File) {
    try {
      // Generate unique file name
      const fileName = `workspace-logo-${userId}-${Date.now()}-${file.originalname}`;

      // Upload file to storage service using workspace-logos bucket
      // Just upload to storage, don't save to database yet (URL will be saved when workspace is created)
      const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile(
        'workspace-logos',
        file.buffer,
        fileName,
        {
          contentType: file.mimetype,
          metadata: {
            userId,
            originalName: file.originalname,
            type: 'workspace-logo'
          }
        }
      );

      console.log('[WorkspaceService.uploadLogo] Logo uploaded successfully:', uploadResult);

      return {
        success: true,
        url: uploadResult.url,
        fileName: fileName,
      };
    } catch (error) {
      console.error('[WorkspaceService.uploadLogo] Failed to upload logo:', error);
      throw new BadRequestException('Failed to upload workspace logo');
    }
  }

  async create(createWorkspaceDto: CreateWorkspaceDto, userId: string) {
    console.log('[WorkspaceService.create] Starting workspace creation for user:', userId);

    // Check if user already owns an ACTIVE workspace with this name
    // We filter by is_active=true so deleted workspaces don't block name reuse
    const existingWorkspacesResult = await this.db.table('workspaces')
      .select('*')
      .where('owner_id', '=', userId)
      .where('name', '=', createWorkspaceDto.name)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const existingWorkspacesData = existingWorkspacesResult.data || [];
    if (existingWorkspacesData.length > 0) {
      throw new ConflictException('You already have a workspace with this name');
    }

    // Create workspace
    const workspaceData = {
      ...createWorkspaceDto,
      owner_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[WorkspaceService.create] Creating workspace with data:', workspaceData);
    const workspace = await this.db.insert('workspaces', workspaceData);
    console.log('[WorkspaceService.create] Workspace created:', workspace);

    // Add owner as a member
    const memberData = {
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner',
      permissions: ['*'], // Owner has all permissions
      joined_at: new Date().toISOString(),
      is_active: true
    };
    
    console.log('[WorkspaceService.create] Adding owner as member with data:', memberData);
    const member = await this.db.insert('workspace_members', memberData);
    console.log('[WorkspaceService.create] Member added:', member);

    return workspace;
  }

  async findAll(userId: string) {
    console.log('[WorkspaceService.findAll] ========================================');
    console.log('[WorkspaceService.findAll] Fetching workspaces for user:', userId);
    console.log('[WorkspaceService.findAll] User ID type:', typeof userId);
    console.log('[WorkspaceService.findAll] User ID length:', userId?.length);

    // First, let's check ALL members in the table to see what's there
    const allMembersResult = await this.db.table('workspace_members')
      .select('*')
      .execute();

    console.log('[WorkspaceService.findAll] Total members in table:', (allMembersResult.data || []).length);
    console.log('[WorkspaceService.findAll] Sample members:', JSON.stringify((allMembersResult.data || []).slice(0, 3), null, 2));

    // Get all workspaces where user is a member using table() method
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .execute();

    console.log('[WorkspaceService.findAll] Membership query result:', JSON.stringify(membershipResult, null, 2));
    const membershipData = membershipResult.data || [];
    console.log('[WorkspaceService.findAll] Found memberships:', membershipData.length);

    if (membershipData.length > 0) {
      console.log('[WorkspaceService.findAll] Membership details:', JSON.stringify(membershipData, null, 2));
    } else {
      // Try without is_active filter to see if that's the issue
      console.log('[WorkspaceService.findAll] No active memberships found, checking without is_active filter...');
      const allUserMembershipsResult = await this.db.table('workspace_members')
        .select('*')
        .where('user_id', '=', userId)
        .execute();

      const allUserMemberships = allUserMembershipsResult.data || [];
      console.log('[WorkspaceService.findAll] Found memberships without is_active filter:', allUserMemberships.length);
      if (allUserMemberships.length > 0) {
        console.log('[WorkspaceService.findAll] Inactive memberships found:', JSON.stringify(allUserMemberships, null, 2));
      } else {
        console.log('[WorkspaceService.findAll] No memberships found at all for this user');
      }

      console.log('[WorkspaceService.findAll] Returning empty array');
      return [];
    }

    const workspaceIds = membershipData.map(m => m.workspace_id);
    console.log('[WorkspaceService.findAll] Workspace IDs to fetch:', workspaceIds);

    // Query each workspace individually since orWhere doesn't work reliably with multiple conditions
    const workspacePromises = workspaceIds.map(async (workspaceId) => {
      console.log('[WorkspaceService.findAll] Fetching workspace:', workspaceId);
      const result = await this.db.table('workspaces')
        .select('*')
        .where('id', '=', workspaceId)
        .where('is_active', '=', true)
        .limit(1)
        .execute();

      const data = result.data || [];
      console.log('[WorkspaceService.findAll] Workspace query result for', workspaceId, ':', data.length > 0 ? 'FOUND' : 'NOT FOUND');
      return data[0] || null;
    });

    const workspaceResults = await Promise.all(workspacePromises);
    const workspaces = workspaceResults.filter(w => w !== null);

    console.log('[WorkspaceService.findAll] Total workspaces found:', workspaces.length);
    console.log('[WorkspaceService.findAll] Workspaces:', JSON.stringify(workspaces, null, 2));

    // Add membership info to each workspace
    const result = workspaces.map(workspace => {
      const membership = membershipData.find(m => m.workspace_id === workspace.id);
      return {
        ...workspace,
        membership: {
          role: membership.role,
          permissions: membership.permissions,
          joined_at: membership.joined_at
        }
      };
    });

    console.log('[WorkspaceService.findAll] Returning workspaces with membership info:', result.length);
    console.log('[WorkspaceService.findAll] Final result:', JSON.stringify(result, null, 2));
    console.log('[WorkspaceService.findAll] ========================================');
    return result;
  }

  async findOne(id: string, userId: string) {
    // Check if user has access to this workspace
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', id)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const workspaceResult = await this.db.table('workspaces')
      .select('*')
      .where('id', '=', id)
      .limit(1)
      .execute();

    const workspaceData = workspaceResult.data || [];
    if (workspaceData.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const workspace = workspaceData[0];
    const membership = membershipData[0];

    return {
      ...workspace,
      membership: {
        role: membership.role,
        permissions: membership.permissions,
        joined_at: membership.joined_at
      }
    };
  }

  async update(id: string, updateWorkspaceDto: UpdateWorkspaceDto, userId: string) {
    // Check if user has admin access
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', id)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const membership = membershipData[0];
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new BadRequestException('Insufficient permissions to update workspace');
    }

    const updateData = {
      ...updateWorkspaceDto,
      updated_at: new Date().toISOString()
    };

    return await this.db.update('workspaces', id, updateData);
  }

  async remove(id: string, userId: string) {
    // Check if user is the owner
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', id)
      .where('user_id', '=', userId)
      .where('role', '=', 'owner')
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new BadRequestException('Only workspace owner can delete the workspace');
    }

    // Soft delete by setting is_active to false
    return await this.db.update('workspaces', id, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
  }

  async inviteMember(workspaceId: string, inviteMemberDto: InviteMemberDto, inviterId: string) {
    // Map workspace roles to supported roles (admin | member)
    let role: 'admin' | 'member' = 'member';
    
    if (inviteMemberDto.role) {
      switch (inviteMemberDto.role) {
        case 'owner':
        case 'admin':
          role = 'admin';
          break;
        case 'member':
        case 'viewer':
        default:
          role = 'member';
          break;
      }
    }

    const inviteDto: InviteWorkspaceMemberDto = {
      email: inviteMemberDto.email,
      role,
      message: inviteMemberDto.message,
    };

    return this.invitationService.inviteToWorkspace(workspaceId, inviteDto, inviterId);
  }

  async getMembers(workspaceId: string, userId: string) {
    console.log('[WorkspaceService.getMembers] Fetching members for workspace:', workspaceId);

    // Check if user has access to this workspace
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    // Get all members of this workspace
    const membersResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    const members = membersResult.data || [];
    console.log('[WorkspaceService.getMembers] Found members:', members.length);

    // Fetch user details for each member
    const membersWithUserDetails = await Promise.all(
      members.map(async (member) => {
        console.log('[WorkspaceService.getMembers] Fetching user details for:', member.user_id);

        try {
          // Get user details from auth service
          const userProfile = await this.db.getUserById(member.user_id);

          if (userProfile) {
            const metadata = userProfile.metadata || {};

            return {
              ...member,
              user: {
                id: userProfile.id,
                email: userProfile.email,
                name: metadata.name || (userProfile as any).fullName || userProfile.name || null,
                username: userProfile.username || metadata.username || null,
                avatar: metadata.avatarUrl || userProfile.avatar_url || null,  // Avatar is in metadata.avatarUrl
                avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
                profileImage: metadata.avatarUrl || userProfile.avatar_url || null,
              }
            };
          } else {
            // User not found, return member data without user details
            console.warn('[WorkspaceService.getMembers] User not found:', member.user_id);
            return {
              ...member,
              user: {
                id: member.user_id,
                email: null,
                name: null,
                username: null,
                avatar: null,
                avatar_url: null,
                profileImage: null,
              }
            };
          }
        } catch (error) {
          console.error('[WorkspaceService.getMembers] Error fetching user details for', member.user_id, ':', error);
          // Return member data without user details on error
          return {
            ...member,
            user: {
              id: member.user_id,
              email: null,
              name: null,
              username: null,
              avatar: null,
              avatar_url: null,
              profileImage: null,
            }
          };
        }
      })
    );

    console.log('[WorkspaceService.getMembers] Returning members with user details');
    return membersWithUserDetails;
  }

  async getMemberByUserId(workspaceId: string, targetUserId: string, requestingUserId: string) {
    console.log('[WorkspaceService.getMemberByUserId] Fetching member:', targetUserId, 'in workspace:', workspaceId);

    // Check if requesting user has access to this workspace
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', requestingUserId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    // Find the target member
    const targetMemberResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', targetUserId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const targetMemberData = targetMemberResult.data || [];
    if (targetMemberData.length === 0) {
      throw new NotFoundException('Member not found in this workspace');
    }

    const member = targetMemberData[0];

    // Fetch user details from auth service
    try {
      const userProfile = await this.db.getUserById(member.user_id);

      if (userProfile) {
        const metadata = userProfile.metadata || {};

        return {
          ...member,
          status: 'active',
          user: {
            id: userProfile.id,
            email: userProfile.email,
            name: metadata.name || (userProfile as any).fullName || userProfile.name || null,
            username: userProfile.username || metadata.username || null,
            avatar: metadata.avatarUrl || userProfile.avatar_url || null,
            avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
            profileImage: metadata.avatarUrl || userProfile.avatar_url || null,
          }
        };
      }
    } catch (error) {
      console.error('[WorkspaceService.getMemberByUserId] Error fetching user details:', error);
    }

    // Return member data without user details if user fetch fails
    return {
      ...member,
      status: 'active',
      user: {
        id: member.user_id,
        email: null,
        name: null,
        username: null,
        avatar: null,
        avatar_url: null,
        profileImage: null,
      }
    };
  }

  async updateMemberRole(workspaceId: string, memberId: string, updateMemberRoleDto: UpdateMemberRoleDto, updaterId: string) {
    // Check if updater has admin access
    const updaterMembershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', updaterId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const updaterMembershipData = updaterMembershipResult.data || [];
    if (updaterMembershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const updaterMembership = updaterMembershipData[0];
    if (!['owner', 'admin'].includes(updaterMembership.role)) {
      throw new BadRequestException('Insufficient permissions to update member roles');
    }

    // Cannot change owner role (only owner can transfer ownership)
    if (updateMemberRoleDto.role === 'owner' && updaterMembership.role !== 'owner') {
      throw new BadRequestException('Only current owner can transfer ownership');
    }

    // Update member role
    return await this.db.update('workspace_members', memberId, {
      role: updateMemberRoleDto.role,
      permissions: updateMemberRoleDto.permissions || [],
    });
  }

  async removeMember(workspaceId: string, memberId: string, removerId: string) {
    // Check if remover has admin access
    const removerMembershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', removerId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const removerMembershipData = removerMembershipResult.data || [];
    if (removerMembershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const removerMembership = removerMembershipData[0];
    if (!['owner', 'admin'].includes(removerMembership.role)) {
      throw new BadRequestException('Insufficient permissions to remove members');
    }

    // Get member to be removed
    const memberResult = await this.db.table('workspace_members')
      .select('*')
      .where('id', '=', memberId)
      .limit(1)
      .execute();

    const memberData = memberResult.data || [];
    if (memberData.length === 0) {
      throw new NotFoundException('Member not found');
    }

    const member = memberData[0];
    
    // Cannot remove owner
    if (member.role === 'owner') {
      throw new BadRequestException('Cannot remove workspace owner');
    }

    // Deactivate member
    return await this.db.update('workspace_members', memberId, {
      is_active: false
    });
  }

  async getWorkspaceStats(workspaceId: string, userId: string) {
    // Check if user has access to this workspace
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    // Get total members count
    const totalMembersResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const allMembers = totalMembersResult.data || [];
    const total_members = allMembers.length;

    // Get active members count
    const activeMembers = allMembers.filter(member => member.is_active === true);
    const active_members = activeMembers.length;

    // Get pending invitations count
    const invitationsResult = await this.db.table('workspace_invites')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('status', '=', 'pending')
      .execute();

    const pending_invitations = (invitationsResult.data || []).length;

    return {
      total_members,
      active_members,
      pending_invitations
    };
  }

  async getCurrentMembership(workspaceId: string, userId: string) {
    // Get user's membership in this workspace
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Membership not found or inactive');
    }

    return membershipData[0];
  }

  async updateSettings(workspaceId: string, updateSettingsDto: UpdateWorkspaceSettingsDto, userId: string) {
    // Check if user has admin access
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const membership = membershipData[0];
    if (!['owner', 'admin'].includes(membership.role)) {
      throw new BadRequestException('Insufficient permissions to update workspace settings');
    }

    // Get current workspace to merge settings
    const workspaceResult = await this.db.table('workspaces')
      .select('*')
      .where('id', '=', workspaceId)
      .limit(1)
      .execute();

    const workspaceData = workspaceResult.data || [];
    if (workspaceData.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const currentWorkspace = workspaceData[0];
    const currentSettings = currentWorkspace.settings || {};

    // Merge new settings into existing settings
    const updatedSettings = {
      ...currentSettings,
      ...(updateSettingsDto.timezone !== undefined && { timezone: updateSettingsDto.timezone }),
      ...(updateSettingsDto.currency !== undefined && { currency: updateSettingsDto.currency }),
      ...(updateSettingsDto.language !== undefined && { language: updateSettingsDto.language }),
      ...(updateSettingsDto.settings !== undefined && updateSettingsDto.settings),
    };

    // Update workspace with merged settings
    const updateData = {
      settings: updatedSettings,
      updated_at: new Date().toISOString()
    };

    return await this.db.update('workspaces', workspaceId, updateData);
  }

  async getWorkspaceInvitations(workspaceId: string, userId: string) {
    // Check if user has access to this workspace
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    // Get all pending invitations for this workspace
    const invitationsResult = await this.db.table('workspace_invites')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('status', '=', 'pending')
      .execute();

    return invitationsResult.data || [];
  }

  /**
   * Delete/cancel a workspace invitation
   */
  async deleteInvitation(workspaceId: string, invitationId: string, userId: string) {
    // Verify user has permission (admin or owner)
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const member = membershipData[0];
    if (member.role !== 'admin' && member.role !== 'owner') {
      throw new ForbiddenException('Only admins and owners can delete invitations');
    }

    // Check if invitation exists and belongs to this workspace
    console.log('🔍 Looking for invitation:', { invitationId, workspaceId });

    const invitationResult = await this.db.table('workspace_invites')
      .select('*')
      .where('id', '=', invitationId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    console.log('🔍 Query result:', invitationResult);

    // Handle result - it might have a .data property
    const invitations = invitationResult.data || invitationResult || [];
    console.log('🔍 Invitations array:', invitations);

    if (!Array.isArray(invitations) || invitations.length === 0) {
      throw new NotFoundException('Invitation not found or does not belong to this workspace');
    }

    const invitation = invitations[0];

    // Delete the invitation using table query
    await this.db.table('workspace_invites')
      .delete()
      .where('id', '=', invitationId)
      .execute();

    console.log('✅ Invitation deleted:', invitationId);

    return {
      message: 'Invitation deleted successfully'
    };
  }

  /**
   * Resend a workspace invitation (generates new token and extends expiry)
   */
  async resendInvitation(workspaceId: string, invitationId: string, userId: string) {
    // Verify user has permission (admin or owner)
    const membershipResult = await this.db.table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .limit(1)
      .execute();

    const membershipData = membershipResult.data || [];
    if (membershipData.length === 0) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    const member = membershipData[0];
    if (member.role !== 'admin' && member.role !== 'owner') {
      throw new ForbiddenException('Only admins and owners can resend invitations');
    }

    // Check if invitation exists and belongs to this workspace
    const invitationQueryResult = await this.db.table('workspace_invites')
      .select('*')
      .where('id', '=', invitationId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    // Handle result - it might have a .data property
    const invitations = invitationQueryResult.data || invitationQueryResult || [];

    if (!Array.isArray(invitations) || invitations.length === 0) {
      throw new NotFoundException('Invitation not found or does not belong to this workspace');
    }

    const invitationResult = invitations[0];

    // Check invitation status
    if (invitationResult.status === 'accepted') {
      throw new BadRequestException('Cannot resend an already accepted invitation');
    }

    // Generate new token and extend expiry
    const newToken = this.generateInvitationToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

    // Update invitation using table query
    await this.db.table('workspace_invites')
      .update({
        token: newToken,
        expires_at: newExpiresAt.toISOString(),
        status: 'pending',
        invited_by: userId, // Update to current user
        created_at: new Date().toISOString() // Reset creation date
      })
      .where('id', '=', invitationId)
      .execute();

    // Fetch the updated invitation
    const updatedInvitationResult = await this.db.table('workspace_invites')
      .select('*')
      .where('id', '=', invitationId)
      .limit(1)
      .execute();

    // Handle result - it might have a .data property
    const updatedInvitations = updatedInvitationResult.data || updatedInvitationResult || [];
    const updatedInvitation = Array.isArray(updatedInvitations) && updatedInvitations.length > 0
      ? updatedInvitations[0]
      : null;

    console.log('✅ Invitation resent:', invitationId);

    // Fetch workspace details for email
    const workspaceResult = await this.db.table('workspaces')
      .select('*')
      .where('id', '=', workspaceId)
      .limit(1)
      .execute();

    const workspaceData = workspaceResult.data || workspaceResult || [];
    const workspace = Array.isArray(workspaceData) && workspaceData.length > 0
      ? workspaceData[0]
      : null;

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Send invitation email
    try {
      const inviteUrl = `${process.env.FRONTEND_URL}/invite/${newToken}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">You're Invited to Join ${workspace.name}</h2>
          <p>Hi there,</p>
          <p>You've been invited to join the <strong>${workspace.name}</strong> workspace.</p>
          ${workspace.description ? `<p><em>${workspace.description}</em></p>` : ''}
          <p style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">
            This invitation will expire in 7 days. If you're unable to click the button, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
          <p style="color: #999; font-size: 11px; margin-top: 40px;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `;

      await /* TODO: use EmailService */ this.db.sendEmail(
        updatedInvitation.email,
        `Invitation to join ${workspace.name}`,
        emailHtml,
        `You've been invited to join ${workspace.name}. Accept your invitation at: ${inviteUrl}`,
      );

      console.log(`✅ Invitation email sent to ${updatedInvitation.email}`);
    } catch (error) {
      console.error(`❌ Failed to send invitation email: ${error.message}`);
      // Don't fail the entire operation if email fails
    }

    return {
      message: 'Invitation resent successfully',
      data: updatedInvitation,
      inviteUrl: `${process.env.FRONTEND_URL}/invite/${newToken}`
    };
  }

  /**
   * Get presence status for all workspace members
   */
  async getMemberPresence(workspaceId: string, userId: string) {
    // Verify user is a workspace member
    const membership = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // Get all workspace members
    const membersResult = await this.db.findMany('workspace_members', {
      workspace_id: workspaceId,
      is_active: true,
    });
    const members = membersResult.data || [];

    // Get user IDs
    const userIds = members.map(m => m.user_id);

    // Get presence status for all members
    const presenceList = this.presenceService.getMultipleUserPresence(userIds);

    // Create a map for quick lookup
    const presenceMap = new Map(presenceList.map(p => [p.userId, p]));

    // Combine member data with presence
    const membersWithPresence = await Promise.all(
      members.map(async (member) => {
        const presence = presenceMap.get(member.user_id);

        // Get user details from auth service (same approach as getMembers)
        let userName = 'Unknown User';
        let userEmail = null;
        let userAvatar = null;

        try {
          const userProfile = await this.db.getUserById(member.user_id);
          if (userProfile) {
            const metadata = userProfile.metadata || {};
            userName = metadata.name || (userProfile as any).fullName || userProfile.name || userProfile.email || 'Unknown User';
            userEmail = userProfile.email;
            userAvatar = userProfile.avatar_url || null;
          }
        } catch (error) {
          console.error('[WorkspaceService.getMemberPresence] Error fetching user details for', member.user_id, ':', error);
        }

        return {
          user_id: member.user_id,
          name: userName,
          email: userEmail,
          avatar: userAvatar,
          role: member.role,
          status: presence?.status || 'offline',
          lastSeen: presence?.lastSeen || member.updated_at,
          connectionCount: presence?.connectionCount || 0,
          devices: presence?.devices || {},
        };
      })
    );

    return membersWithPresence;
  }

  /**
   * Helper method to generate invitation token
   */
  private generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }
}