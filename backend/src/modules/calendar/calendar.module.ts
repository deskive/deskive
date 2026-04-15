import { Module, forwardRef } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarAgentService } from './calendar-agent.service';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';
import { EventBotAssignmentsService } from './event-bot-assignments.service';
import { EventBotReminderService } from './event-bot-reminder.service';
import { CalendarController } from './calendar.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ConversationMemoryModule } from '../conversation-memory/conversation-memory.module';
import { ChatModule } from '../chat/chat.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    SchedulerModule,
    ConversationMemoryModule,
    forwardRef(() => ChatModule),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [CalendarController],
  providers: [
    CalendarService,
    CalendarAgentService,
    GoogleCalendarOAuthService,
    GoogleCalendarSyncService,
    EventBotAssignmentsService,
    EventBotReminderService,
  ],
  exports: [
    CalendarService,
    CalendarAgentService,
    GoogleCalendarOAuthService,
    GoogleCalendarSyncService,
    EventBotAssignmentsService,
    EventBotReminderService,
  ],
})
export class CalendarModule {}
