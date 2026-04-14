import { Module, Global } from '@nestjs/common';
import { WorkspaceGuard } from './guards/workspace.guard';
import { RoleGuard } from './guards/role.guard';
import { WorkspaceContextInterceptor } from './interceptors/workspace-context.interceptor';

@Global()
@Module({
  imports: [],
  providers: [WorkspaceGuard, RoleGuard, WorkspaceContextInterceptor],
  exports: [WorkspaceGuard, RoleGuard, WorkspaceContextInterceptor],
})
export class CommonModule {}
