import { Module, forwardRef } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceInvitationController } from './workspace-invitation.controller';
import { InvitationPublicController } from './invitation-public.controller';
import { WorkspaceInvitationService } from './workspace-invitation.service';
import { AuthModule } from '../auth/auth.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';

@Module({
  imports: [
    AuthModule,
    WebSocketModule,
  ],
  controllers: [
    WorkspaceController,
    WorkspaceInvitationController,
    InvitationPublicController,
  ],
  providers: [WorkspaceService, WorkspaceInvitationService],
  exports: [WorkspaceService, WorkspaceInvitationService],
})
export class WorkspaceModule {}