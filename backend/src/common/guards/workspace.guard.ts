import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../modules/database/database.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly db: DatabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract workspace ID from request params, query, or body
    const workspaceId = request.params?.workspaceId || 
                       request.query?.workspaceId || 
                       request.body?.workspaceId ||
                       request.headers['x-workspace-id'];

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID required');
    }

    try {
      // Extract user ID with fallback for different token formats
      const userId = user.sub || user.userId;

      console.log('[WorkspaceGuard] User object:', JSON.stringify(user));
      console.log('[WorkspaceGuard] Extracted userId:', userId);
      console.log('[WorkspaceGuard] Checking workspace:', workspaceId);

      if (!userId) {
        console.error('[WorkspaceGuard] No userId found in user object');
        throw new ForbiddenException('User ID not found in token');
      }

      // Check if user is a member of the workspace
      let membershipData: any[] = [];
      try {
        const membershipQuery = await this.db.findMany('workspace_members', {
          workspace_id: workspaceId,
          user_id: userId,
          is_active: true
        });
        console.log('[WorkspaceGuard] Membership query result:', JSON.stringify(membershipQuery));
        membershipData = membershipQuery.data || [];
      } catch (dbError) {
        // If database fails (e.g., 502 error), try using the table query builder as fallback
        console.error('[WorkspaceGuard] database findMany failed, trying table query:', dbError.message);
        try {
          const fallbackQuery = await this.db.table('workspace_members')
            .select('*')
            .where('workspace_id', '=', workspaceId)
            .where('user_id', '=', userId)
            .where('is_active', '=', true)
            .execute();
          console.log('[WorkspaceGuard] Fallback query result:', JSON.stringify(fallbackQuery));
          const fallbackData = fallbackQuery.data || fallbackQuery;
          membershipData = Array.isArray(fallbackData) ? fallbackData : [];
        } catch (fallbackError) {
          console.error('[WorkspaceGuard] Fallback query also failed:', fallbackError.message);
          // If both methods fail, throw with the actual error message for debugging
          throw new ForbiddenException(`Failed to verify workspace membership: ${dbError.message}`);
        }
      }

      const membership = Array.isArray(membershipData) ? membershipData[0] : null;
      if (!membership) {
        console.log('[WorkspaceGuard] No membership found for user', userId, 'in workspace', workspaceId);
        throw new ForbiddenException('Access denied: Not a member of this workspace');
      }

      // Add workspace context to request
      request.workspace = {
        id: workspaceId,
        membershipRole: membership.role,
        permissions: membership.permissions
      };

      console.log('[WorkspaceGuard] Access granted - role:', membership.role);
      return true;
    } catch (error) {
      console.error('[WorkspaceGuard] Error:', error.message);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException(`Failed to verify workspace membership: ${error.message}`);
    }
  }
}