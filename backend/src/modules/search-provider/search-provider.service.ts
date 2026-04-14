/**
 * SearchProviderService — pluggable full-text / faceted search façade.
 *
 * Modules that need keyword search over workspace content should inject
 * this and call `search(collection, query)`. Internally dispatches to
 * whichever provider the operator has selected via SEARCH_PROVIDER in
 * .env (pg-trgm, meilisearch, typesense, none).
 *
 * Scope note: this does NOT replace deskive's existing semantic search
 * (ContentIndexerService + SemanticSearchService + Qdrant) which handles
 * embedding-based vector search. The two coexist — vector search lives
 * in `modules/search`, keyword search lives here in `modules/search-provider`.
 *
 * See `./providers/` and `docs/providers/search.md`.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import {
  createSearchProvider,
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchableDocument,
} from './providers';

@Injectable()
export class SearchProviderService implements OnModuleInit {
  private readonly logger = new Logger(SearchProviderService.name);
  private provider!: SearchProvider;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  onModuleInit() {
    // Hand the raw query function to the factory so the pg-trgm
    // provider can run its own SQL directly against the pool, without
    // taking a dep on the whole DatabaseService.
    this.provider = createSearchProvider({
      config: this.config,
      pgQuery: async (sql, params) => this.db.query(sql, params),
    });
    this.logger.log(
      `Search provider initialized: ${this.provider.name} (available=${this.provider.isAvailable()})`,
    );
  }

  getProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  isAvailable(): boolean {
    return !!this.provider && this.provider.isAvailable();
  }

  async search<T = SearchableDocument>(
    collection: string,
    query: SearchQuery,
  ): Promise<SearchResult<T>> {
    return this.provider.search<T>(collection, query);
  }

  async indexDocument(collection: string, document: SearchableDocument): Promise<void> {
    return this.provider.indexDocument(collection, document);
  }

  async indexBatch(collection: string, documents: SearchableDocument[]): Promise<void> {
    return this.provider.indexBatch(collection, documents);
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    return this.provider.deleteDocument(collection, id);
  }

  async reindex(collection: string, source: AsyncIterable<SearchableDocument>): Promise<number> {
    return this.provider.reindex(collection, source);
  }

  getProvider(): SearchProvider {
    return this.provider;
  }
}
