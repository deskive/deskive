import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SearchProviderService } from './search-provider.service';

/**
 * Pluggable keyword search module — exposes SearchProviderService for
 * full-text + faceted search over deskive workspace content (workspaces,
 * projects, tasks, channels, files, calendar events). Coexists with the
 * existing SearchModule under `modules/search/` which handles Qdrant-
 * based semantic / vector search.
 *
 * Pick a provider by setting SEARCH_PROVIDER in your .env. See
 * `docs/providers/search.md` for the full list.
 *
 * Imports DatabaseModule because the pg-trgm provider needs raw SQL
 * access to the Postgres pool exposed by DatabaseService.
 */
@Module({
  imports: [DatabaseModule],
  providers: [SearchProviderService],
  exports: [SearchProviderService],
})
export class SearchProviderModule {}
