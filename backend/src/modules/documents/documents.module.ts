import { Module, OnModuleInit } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { ExternalDocumentsController } from './external.controller';
import { DocumentsService } from './documents.service';
import { AuthModule } from '../auth/auth.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [AuthModule, TemplatesModule],
  controllers: [DocumentsController, ExternalDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule implements OnModuleInit {
  constructor(private readonly documentsService: DocumentsService) {}

  async onModuleInit() {
    try {
      await this.documentsService.ensureTablesExist();
      console.log('✅ Documents module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize documents module:', error);
    }
  }
}
