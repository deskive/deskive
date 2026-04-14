import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AIRouterService } from './ai-router.service';
import { AuthModule } from '../auth/auth.module';
import { ConversationMemoryModule } from '../conversation-memory/conversation-memory.module';
import { ProjectsModule } from '../projects/projects.module';
import { NotesModule } from '../notes/notes.module';
import { CalendarModule } from '../calendar/calendar.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    ConversationMemoryModule,
    forwardRef(() => ProjectsModule),
    forwardRef(() => NotesModule),
    forwardRef(() => CalendarModule),
    forwardRef(() => FilesModule),
  ],
  controllers: [AIController],
  providers: [AIService, AIRouterService],
  exports: [AIService, AIRouterService],
})
export class AIModule {}
