import { Module, Global } from '@nestjs/common';
import { ConversationMemoryService } from './conversation-memory.service';
import { QdrantModule } from '../qdrant/qdrant.module';

@Global()
@Module({
  imports: [QdrantModule],
  providers: [ConversationMemoryService],
  exports: [ConversationMemoryService],
})
export class ConversationMemoryModule {}
