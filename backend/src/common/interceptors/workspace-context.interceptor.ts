import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { DatabaseService } from '../../modules/database/database.service';

@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && !request.workspace) {
      // Try to get workspace context from various sources
      const workspaceId = request.params?.workspaceId || 
                         request.query?.workspaceId || 
                         request.body?.workspaceId ||
                         request.headers['x-workspace-id'];

      if (workspaceId) {
        try {
          // Get workspace details
          const workspaceQuery = await this.db.findMany('workspaces', {
            id: workspaceId
          });

          const workspace = workspaceQuery[0];
          if (workspace) {
            request.workspaceData = workspace;
          }

          // Get user's membership in this workspace
          const membershipQuery = await this.db.findMany('workspace_members', {
            workspace_id: workspaceId,
            user_id: user.sub,
            is_active: true
          });

          const membership = membershipQuery[0];
          if (membership) {
            request.workspace = {
              id: workspaceId,
              membershipRole: membership.role,
              permissions: membership.permissions
            };
          }
        } catch (error) {
          // Fail silently - guards will handle access control
          console.error('Failed to load workspace context:', error);
        }
      }
    }

    return next.handle();
  }
}