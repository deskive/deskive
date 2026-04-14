import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { ChatModule } from '../../modules/chat/chat.module';
import { AppGateway } from './app.gateway';
import { PresenceService } from './presence.service';

@Module({
  imports: [
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
    forwardRef(() => ChatModule), // Import ChatModule for ChatService
  ],
  providers: [AppGateway, PresenceService],
  exports: [AppGateway, PresenceService],
})
export class WebSocketModule {}
