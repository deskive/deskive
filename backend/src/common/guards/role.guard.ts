import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export const ROLES_KEY = 'roles';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspace = request.workspace;

    if (!workspace || !workspace.membershipRole) {
      throw new ForbiddenException('Workspace context required');
    }

    const hasRole = this.checkRoleHierarchy(workspace.membershipRole, requiredRoles);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: Required role(s): ${requiredRoles.join(', ')}, current role: ${workspace.membershipRole}`,
      );
    }

    return true;
  }

  private checkRoleHierarchy(userRole: string, requiredRoles: WorkspaceRole[]): boolean {
    const roleHierarchy: Record<WorkspaceRole, number> = {
      viewer: 1,
      member: 2,
      admin: 3,
      owner: 4,
    };

    const userRoleLevel = roleHierarchy[userRole as WorkspaceRole] || 0;
    const requiredLevel = Math.min(...requiredRoles.map((role) => roleHierarchy[role] || 0));

    return userRoleLevel >= requiredLevel;
  }
}
