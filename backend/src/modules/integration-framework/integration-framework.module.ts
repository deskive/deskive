import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { IntegrationFrameworkController } from './integration-framework.controller';
import { CatalogService } from './services/catalog.service';
import { ConnectionService } from './services/connection.service';
import { GenericOAuthService } from './services/generic-oauth.service';
import { AuthModule } from '../auth/auth.module';
import * as seedData from './seed/integrations.seed.json';

@Module({
  imports: [
    AuthModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [IntegrationFrameworkController],
  providers: [
    CatalogService,
    ConnectionService,
    GenericOAuthService,
  ],
  exports: [
    CatalogService,
    ConnectionService,
    GenericOAuthService,
  ],
})
export class IntegrationFrameworkModule implements OnModuleInit {
  private readonly logger = new Logger(IntegrationFrameworkModule.name);

  constructor(private readonly catalogService: CatalogService) {}

  async onModuleInit() {
    // Integration seeding disabled to prevent excessive logs on startup
    // Integrations already exist in database
    // Run manually via API endpoint if needed: POST /api/v1/integrations/seed
  }
}
