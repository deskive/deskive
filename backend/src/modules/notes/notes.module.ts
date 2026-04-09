import { Module, forwardRef } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesAgentService } from './notes-agent.service';
import { NotesController } from './notes.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConversationMemoryModule } from '../conversation-memory/conversation-memory.module';
import { GoogleDriveModule } from '../integration-framework/google-drive/google-drive.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { NoteCollaborationService } from './services/note-collaboration.service';
import { NoteCollaborationGateway } from './gateways/note-collaboration.gateway';
import { PdfProcessingService } from './services/pdf-processing.service';
import { UrlProcessingService } from './services/url-processing.service';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    ConversationMemoryModule,
    forwardRef(() => GoogleDriveModule),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [NotesController],
  providers: [
    NotesService,
    NotesAgentService,
    NoteCollaborationService,
    NoteCollaborationGateway,
    PdfProcessingService,
    UrlProcessingService,
  ],
  exports: [NotesService, NotesAgentService, NoteCollaborationService, PdfProcessingService, UrlProcessingService],
})
export class NotesModule {}