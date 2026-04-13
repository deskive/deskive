import { Module, forwardRef } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesAgentService } from './files-agent.service';
import { FilesController, SharedFilesController } from './files.controller';
import { StorageController } from './storage.controller';
import { PublicStorageController } from './public-storage.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConversationMemoryModule } from '../conversation-memory/conversation-memory.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ConversationMemoryModule),
    forwardRef(() => WebSocketModule),
  ],
  controllers: [FilesController, SharedFilesController, StorageController, PublicStorageController],
  providers: [FilesService, FilesAgentService],
  exports: [FilesService, FilesAgentService],
})
export class FilesModule {}