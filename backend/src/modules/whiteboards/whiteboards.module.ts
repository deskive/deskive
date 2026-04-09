import { Module, forwardRef } from '@nestjs/common';
import { WhiteboardsService } from './whiteboards.service';
import { WhiteboardsController } from './whiteboards.controller';
import { WhiteboardCollaborationService } from './services/whiteboard-collaboration.service';
import { WhiteboardCollaborationGateway } from './gateways/whiteboard-collaboration.gateway';
import { AuthModule } from '../auth/auth.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [WhiteboardsController],
  providers: [
    WhiteboardsService,
    WhiteboardCollaborationService,
    WhiteboardCollaborationGateway,
  ],
  exports: [WhiteboardsService, WhiteboardCollaborationService],
})
export class WhiteboardsModule {}
