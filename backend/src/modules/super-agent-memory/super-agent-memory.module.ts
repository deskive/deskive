import { Module } from '@nestjs/common';
import { SuperAgentMemoryService } from './super-agent-memory.service';
import { QdrantModule } from '../qdrant/qdrant.module';

@Module({
  imports: [QdrantModule],
  providers: [SuperAgentMemoryService],
  exports: [SuperAgentMemoryService],
})
export class SuperAgentMemoryModule {}
