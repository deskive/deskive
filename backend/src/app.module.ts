import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseModule } from './modules/database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { RedisModule } from './modules/redis/redis.module';
import { AiProviderModule } from './modules/ai-provider/ai-provider.module';
import { AuthModule } from './modules/auth/auth.module';
import { WebSocketModule } from './common/gateways/websocket.module';
import { CommonModule } from './common/common.module';

// Deskive specific modules
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ChatModule } from './modules/chat/chat.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FilesModule } from './modules/files/files.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { NotesModule } from './modules/notes/notes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { AIModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { EventsModule } from './modules/events/events.module';
import { SeoModule } from './modules/seo/seo.module';
import { VideoCallsModule } from './modules/video-calls/video-calls.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BillingModule } from './modules/billing/billing.module';
import { ConversationMemoryModule } from './modules/conversation-memory/conversation-memory.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ContactModule } from './modules/contact/contact.module';
import { GoogleDriveModule } from './modules/integration-framework/google-drive/google-drive.module';
import { GoogleSheetsModule } from './modules/integration-framework/google-sheets/google-sheets.module';
import { DropboxModule } from './modules/integration-framework/dropbox/dropbox.module';
import { YoutubeModule } from './modules/integration-framework/youtube/youtube.module';
import { SlackModule } from './modules/slack/slack.module';
import { SlackWhiteboardModule } from './modules/slack-whiteboard/slack-whiteboard.module';
import { SlackProjectsModule } from './modules/slack-projects/slack-projects.module';
import { SlackCalendarModule } from './modules/slack-calendar/slack-calendar.module';
import { TwitterModule } from './modules/twitter/twitter.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { SendGridModule } from './modules/sendgrid/sendgrid.module';
import { OpenAIModule } from './modules/openai/openai.module';
import { EmailModule } from './modules/integration-framework/email/email.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { GitHubModule } from './modules/integration-framework/github/github.module';
import { AsanaModule } from './modules/integration-framework/asana/asana.module';
import { ClickUpModule } from './modules/integration-framework/clickup/clickup.module';
import { JiraModule } from './modules/integration-framework/jira/jira.module';
import { LinearModule } from './modules/integration-framework/linear/linear.module';
import { NotionModule } from './modules/integration-framework/notion/notion.module';
import { TrelloModule } from './modules/integration-framework/trello/trello.module';
import { AutoPilotModule } from './modules/autopilot/autopilot.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { WhiteboardsModule } from './modules/whiteboards/whiteboards.module';
import { IntegrationFrameworkModule } from './modules/integration-framework/integration-framework.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { BotsModule } from './modules/bots/bots.module';
import { BudgetModule } from './modules/budget/budget.module';
import { BlogModule } from './modules/blog/blog.module';
import { FormsModule } from './modules/forms/forms.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { FeedbackModule } from './modules/feedback/feedback.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    WebSocketModule,
    CommonModule,
    DatabaseModule,
    StorageModule,
    RedisModule,
    AiProviderModule,
    AuthModule,
    // Core AI memory module (global)
    ConversationMemoryModule,
    // Deskive modules
    WorkspaceModule,
    ChatModule,
    CryptoModule,
    VideoCallsModule,
    ProjectsModule,
    FilesModule,
    CalendarModule,
    NotesModule,
    NotificationsModule,
    SearchModule,
    IntegrationModule,
    AIModule,
    DashboardModule,
    AnalyticsModule,
    MonitoringModule,
    EventsModule,
    SeoModule,
    SettingsModule,
    BillingModule,
    BlogModule,
    SchedulerModule,
    ContactModule,
    GoogleDriveModule,
    GoogleSheetsModule,
    DropboxModule,
    YoutubeModule,
    SlackModule,
    SlackWhiteboardModule,
    SlackProjectsModule,
    SlackCalendarModule,
    TwitterModule,
    TelegramModule,
    SendGridModule,
    OpenAIModule,
    EmailModule,
    IntegrationsModule,
    GitHubModule,
    AsanaModule,
    ClickUpModule,
    JiraModule,
    LinearModule,
    NotionModule,
    TrelloModule,
    AutoPilotModule,
    ApprovalsModule,
    WhiteboardsModule,
    BotsModule,
    IntegrationFrameworkModule,
    TemplatesModule,
    DocumentsModule,
    SignaturesModule,
    BudgetModule,
    FormsModule,
    WorkflowsModule,
    FeedbackModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}