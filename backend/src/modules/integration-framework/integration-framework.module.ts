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
  providers: [CatalogService, ConnectionService, GenericOAuthService],
  exports: [CatalogService, ConnectionService, GenericOAuthService],
})
export class IntegrationFrameworkModule implements OnModuleInit {
  private readonly logger = new Logger(IntegrationFrameworkModule.name);

  constructor(private readonly catalogService: CatalogService) {}

  async onModuleInit() {
    // Idempotent auto-seed. Before re-enabling this, a fresh deskive
    // install had an empty `integration_catalog` table — which meant
    // the Connectors page in the UI only showed the 6 hardcoded tiles
    // (Gmail/Calendar/Drive/GitHub/Sheets/Dropbox) and hid all 175
    // other integrations that ship in the seed JSON.
    //
    // The previous implementation was disabled because it logged per
    // row on every restart. This version:
    //   - reads the count first; skips silently if the catalog is
    //     already populated (no log spam on every restart)
    //   - when seeding is needed, calls the already-idempotent
    //     seedFromData() which only inserts slugs that don't exist
    //   - logs a single summary line
    try {
      const existingCount = await this.catalogService.countIntegrations();
      if (existingCount >= (seedData as { integrations: unknown[] }).integrations.length) {
        // Catalog is already at or beyond the seed size — nothing to do.
        return;
      }
      const created = await this.catalogService.seedFromData(
        (seedData as { integrations: any[] }).integrations,
      );
      if (created > 0) {
        this.logger.log(
          `Integration catalog seeded: ${created} new integrations (total: ${existingCount + created})`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Integration catalog auto-seed skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
