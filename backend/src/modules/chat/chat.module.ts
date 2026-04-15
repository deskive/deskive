import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    forwardRef(() => WebSocketModule), // Use forwardRef to avoid circular dependency
    forwardRef(() => BotsModule), // Bot automation triggers
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
