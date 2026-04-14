import { Module, forwardRef } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectAgentService } from './project-agent.service';
import { TaskAgentService } from './task-agent.service';
import { UnifiedAgentService } from './unified-agent.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConversationMemoryModule } from '../conversation-memory/conversation-memory.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    ConversationMemoryModule,
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAgentService, TaskAgentService, UnifiedAgentService],
  exports: [ProjectsService, UnifiedAgentService],
})
export class ProjectsModule {}
