import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AutoPilotController } from './autopilot.controller';
import { AutoPilotService } from './autopilot.service';
import { LangChainAgentService } from './langchain/agent.service';
import { AgentMemoryService } from './langchain/memory.service';
import { AgentToolsService } from './langchain/tools.service';
import { CalendarBotContextService } from './calendar-bot-context.service';
import { ScheduledActionsService } from './scheduled-actions.service';

// Import existing modules to use their services as tools
import { ChatModule } from '../chat/chat.module';
import { FilesModule } from '../files/files.module';
import { CalendarModule } from '../calendar/calendar.module';
import { AuthModule } from '../auth/auth.module';
import { NotesModule } from '../notes/notes.module';
import { EmailModule } from '../integration-framework/email/email.module';
import { VideoCallsModule } from '../video-calls/video-calls.module';
import { ProjectsModule } from '../projects/projects.module';
import { SuperAgentMemoryModule } from '../super-agent-memory';

// Import new modules for expanded Autopilot tools
import { BudgetModule } from '../budget/budget.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TemplatesModule } from '../templates/templates.module';
import { DocumentsModule } from '../documents/documents.module';
import { WhiteboardsModule } from '../whiteboards/whiteboards.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { SettingsModule } from '../settings/settings.module';

// Import proactive module for AI-driven notifications
import { ProactiveModule } from './proactive';

@Module({
  imports: [
    ConfigModule,
    AuthModule, // Required for JwtAuthGuard to work
    forwardRef(() => ChatModule),
    FilesModule,
    forwardRef(() => CalendarModule),
    NotesModule,
    EmailModule,
    VideoCallsModule,
    forwardRef(() => ProjectsModule),
    SuperAgentMemoryModule, // For Super Agent memory system
    ProactiveModule, // For proactive AI features (daily briefings, deadline alerts, suggestions cache)
    // New modules for expanded Autopilot tools
    forwardRef(() => BudgetModule),
    forwardRef(() => ApprovalsModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => TemplatesModule),
    forwardRef(() => DocumentsModule),
    forwardRef(() => WhiteboardsModule),
    forwardRef(() => WorkflowsModule),
    forwardRef(() => SettingsModule),
  ],
  controllers: [AutoPilotController],
  providers: [
    AutoPilotService,
    LangChainAgentService,
    AgentMemoryService,
    AgentToolsService,
    CalendarBotContextService,
    ScheduledActionsService,
  ],
  exports: [AutoPilotService, CalendarBotContextService, ScheduledActionsService],
})
export class AutoPilotModule {}
