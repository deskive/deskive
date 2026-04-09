import { Module, OnModuleInit } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesService } from './document-templates.service';
import { AuthModule } from '../auth/auth.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [TemplatesController, DocumentTemplatesController],
  providers: [TemplatesService, DocumentTemplatesService],
  exports: [TemplatesService, DocumentTemplatesService],
})
export class TemplatesModule implements OnModuleInit {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly documentTemplatesService: DocumentTemplatesService,
  ) {}

  async onModuleInit() {
    // Templates are already seeded in database - no need to run on every startup
    // This was causing excessive database logs on startup
    // If you need to re-seed templates, run the seeding scripts manually
    console.log('✅ Templates module initialized');
  }
}
