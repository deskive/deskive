import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, WorkspaceRole } from '../guards/role.guard';

export const RequireRole = (...roles: WorkspaceRole[]) => SetMetadata(ROLES_KEY, roles);
