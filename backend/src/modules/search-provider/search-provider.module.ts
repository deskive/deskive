import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SearchProviderService } from './search-provider.service';

/**
 * Search module — exposes the pluggable SearchProviderService for full-text
 * and faceted search over products, orders, etc.
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
