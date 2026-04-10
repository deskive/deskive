import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Content types that can be indexed for semantic search
 */
export type IndexableContentType = 'note' | 'message' | 'file' | 'task' | 'meeting_transcript';

/**
 * Indexed content item stored in Qdrant
 */
export interface IndexedContent {
  id: string;
  content_type: IndexableContentType;
  content_id: string; // Original ID in the database
  workspace_id: string;
  title?: string;
  content: string;
  metadata: {
    created_by?: string;
    created_at?: string;
    channel_id?: string;
    project_id?: string;
    folder_id?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Semantic search result
 */
export interface SemanticSearchResult extends IndexedContent {
  score: number;
}

/**
 * Options for indexing content
 */
export interface IndexContentOptions {
  content_type: IndexableContentType;
  content_id: string;
  workspace_id: string;
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SemanticSearchService implements OnModuleInit {
  private readonly logger = new Logger(SemanticSearchService.name);
  private readonly collectionName = 'semantic_search';
  private readonly embeddingSize = 1536; // OpenAI text-embedding-3-small (faster/cheaper than large)
  private isInitialized = false;

  constructor(private readonly db: DatabaseService) {}
  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }


  async onModuleInit() {
    await this.ensureCollection();
    await this.testEmbeddingsAPI();
  }

  /**
   * Test if embeddings API is working
   */
  private async testEmbeddingsAPI(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.logger.log('[SemanticSearch] Testing embeddings API...');
      await this.generateEmbedding('Test semantic search embedding');
      this.logger.log('[SemanticSearch] Embeddings API working - semantic search enabled');
    } catch (error) {
      const errorMessage = (error as Error)?.message || '';
      if (errorMessage.includes('AI feature may not be enabled')) {
        this.logger.log(
          '[SemanticSearch] AI/Embeddings feature not enabled. Semantic search disabled.',
        );
      } else {
        this.logger.warn('[SemanticSearch] Embeddings test failed - semantic search disabled');
      }
      this.isInitialized = false;
    }
  }

  /**
   * Ensure the semantic search collection exists in Qdrant
   */
  private async ensureCollection(): Promise<void> {
    try {
      this.logger.log(`[SemanticSearch] Ensuring collection: ${this.collectionName}`);

      await /* TODO: use QdrantService */ this.db.ensureVectorCollection(this.collectionName, {
        vectorSize: this.embeddingSize,
        distance: 'cosine',
      });

      this.isInitialized = true;
      this.logger.log(`[SemanticSearch] Collection ready: ${this.collectionName}`);
    } catch (error) {
      this.logger.error(`[SemanticSearch] Failed to ensure collection:`, error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if semantic search is available
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.aiProvider.generateEmbedding(text, {
        model: 'text-embedding-3-small',
      });

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding response');
      }

      return embedding;
    } catch (error) {
      this.logger.error(`[SemanticSearch] Failed to generate embedding:`, error);
      throw error;
    }
  }

  /**
   * Index a content item for semantic search
   */
  async indexContent(options: IndexContentOptions): Promise<string> {
    if (!this.isInitialized) {
      this.logger.warn('[SemanticSearch] Service not initialized, skipping indexing');
      return '';
    }

    try {
      const vectorId = uuidv4();

      // Combine title and content for better semantic matching
      const searchableText = options.title
        ? `${options.title}\n\n${options.content}`
        : options.content;

      // Truncate to avoid token limits (roughly 8000 tokens)
      const truncatedText = searchableText.substring(0, 30000);

      // Generate embedding
      const embedding = await this.generateEmbedding(truncatedText);

      // Build payload
      const payload: Record<string, any> = {
        content_type: options.content_type,
        content_id: options.content_id,
        workspace_id: options.workspace_id,
        title: options.title || '',
        content: options.content.substring(0, 5000), // Store truncated content for display
        indexed_at: new Date().toISOString(),
        ...options.metadata,
      };

      // Store in Qdrant
      await /* TODO: use QdrantService */ this.db.upsertVectors(this.collectionName, [
        {
          id: vectorId,
          vector: embedding,
          payload,
        },
      ]);

      this.logger.debug(
        `[SemanticSearch] Indexed ${options.content_type}: ${options.content_id}`,
      );
      return vectorId;
    } catch (error) {
      this.logger.error(`[SemanticSearch] Failed to index content:`, error);
      return '';
    }
  }

  /**
   * Remove content from semantic index
   */
  async removeContent(contentType: IndexableContentType, contentId: string): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const filter = {
        must: [
          { key: 'content_type', match: { value: contentType } },
          { key: 'content_id', match: { value: contentId } },
        ],
      };

      await /* TODO: use QdrantService */ this.db.deleteVectorsByFilter(this.collectionName, filter);
      this.logger.debug(`[SemanticSearch] Removed ${contentType}: ${contentId}`);
      return true;
    } catch (error) {
      this.logger.error(`[SemanticSearch] Failed to remove content:`, error);
      return false;
    }
  }

  /**
   * Perform semantic search
   */
  async search(
    query: string,
    workspaceId: string,
    options: {
      contentTypes?: IndexableContentType[];
      limit?: number;
      minScore?: number;
      userId?: string;
      channelId?: string;
      projectId?: string;
    } = {},
  ): Promise<SemanticSearchResult[]> {
    if (!this.isInitialized) {
      this.logger.warn('[SemanticSearch] Service not initialized');
      return [];
    }

    const {
      contentTypes,
      limit = 20,
      minScore = 0.5,
      userId,
      channelId,
      projectId,
    } = options;

    try {
      // Generate embedding for search query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build filter
      const mustConditions: any[] = [
        { key: 'workspace_id', match: { value: workspaceId } },
      ];

      if (contentTypes && contentTypes.length > 0) {
        mustConditions.push({
          key: 'content_type',
          match: { any: contentTypes },
        });
      }

      if (userId) {
        mustConditions.push({ key: 'created_by', match: { value: userId } });
      }

      if (channelId) {
        mustConditions.push({ key: 'channel_id', match: { value: channelId } });
      }

      if (projectId) {
        mustConditions.push({ key: 'project_id', match: { value: projectId } });
      }

      const filter = { must: mustConditions };

      // Search Qdrant
      const results = await /* TODO: use QdrantService */ this.db.searchVectors(
        this.collectionName,
        queryEmbedding,
        {
          limit,
          filter,
          with_payload: true,
          score_threshold: minScore,
        },
      );

      // Convert to SemanticSearchResult
      const searchResults: SemanticSearchResult[] = [];

      if (Array.isArray(results)) {
        for (const result of results) {
          const payload = result.payload || {};
          searchResults.push({
            id: String(result.id),
            score: result.score || 0,
            content_type: payload.content_type as IndexableContentType,
            content_id: payload.content_id as string,
            workspace_id: payload.workspace_id as string,
            title: payload.title as string,
            content: payload.content as string,
            metadata: {
              created_by: payload.created_by,
              created_at: payload.created_at,
              channel_id: payload.channel_id,
              project_id: payload.project_id,
              folder_id: payload.folder_id,
              tags: payload.tags,
            },
          });
        }
      }

      this.logger.log(`[SemanticSearch] Found ${searchResults.length} results for "${query}"`);
      return searchResults;
    } catch (error) {
      this.logger.error(`[SemanticSearch] Search failed:`, error);
      return [];
    }
  }

  /**
   * Find similar content to a specific item
   */
  async findSimilar(
    contentType: IndexableContentType,
    contentId: string,
    workspaceId: string,
    limit: number = 5,
  ): Promise<SemanticSearchResult[]> {
    if (!this.isInitialized) return [];

    try {
      // First, find the vector for this content
      const filter = {
        must: [
          { key: 'content_type', match: { value: contentType } },
          { key: 'content_id', match: { value: contentId } },
        ],
      };

      const existing = await /* TODO: use QdrantService */ this.db.scrollVectors(this.collectionName, {
        filter,
        limit: 1,
        with_payload: true,
      });

      const points = existing?.points || existing || [];
      if (!Array.isArray(points) || points.length === 0) {
        this.logger.warn(`[SemanticSearch] Content not found: ${contentType}/${contentId}`);
        return [];
      }

      const vector = points[0].vector;
      if (!Array.isArray(vector)) {
        return [];
      }

      // Search for similar content, excluding the original
      const results = await /* TODO: use QdrantService */ this.db.searchVectors(
        this.collectionName,
        vector,
        {
          limit: limit + 1, // Get one extra to filter out the original
          filter: {
            must: [{ key: 'workspace_id', match: { value: workspaceId } }],
          },
          with_payload: true,
        },
      );

      // Convert and filter out the original
      const searchResults: SemanticSearchResult[] = [];

      if (Array.isArray(results)) {
        for (const result of results) {
          const payload = result.payload || {};
          // Skip the original content
          if (payload.content_id === contentId && payload.content_type === contentType) {
            continue;
          }

          searchResults.push({
            id: String(result.id),
            score: result.score || 0,
            content_type: payload.content_type as IndexableContentType,
            content_id: payload.content_id as string,
            workspace_id: payload.workspace_id as string,
            title: payload.title as string,
            content: payload.content as string,
            metadata: {
              created_by: payload.created_by,
              created_at: payload.created_at,
              channel_id: payload.channel_id,
              project_id: payload.project_id,
              folder_id: payload.folder_id,
              tags: payload.tags,
            },
          });

          if (searchResults.length >= limit) break;
        }
      }

      return searchResults;
    } catch (error) {
      this.logger.error(`[SemanticSearch] Find similar failed:`, error);
      return [];
    }
  }

  /**
   * Batch index multiple content items
   */
  async batchIndex(items: IndexContentOptions[]): Promise<number> {
    if (!this.isInitialized || items.length === 0) return 0;

    let indexed = 0;
    const batchSize = 10; // Process in batches to avoid overwhelming the API

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const promises = batch.map((item) => this.indexContent(item));
      const results = await Promise.allSettled(promises);

      indexed += results.filter(
        (r) => r.status === 'fulfilled' && r.value !== '',
      ).length;

      // Small delay between batches
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    this.logger.log(`[SemanticSearch] Batch indexed ${indexed}/${items.length} items`);
    return indexed;
  }

  /**
   * Get indexing statistics for a workspace
   */
  async getIndexStats(workspaceId: string): Promise<{
    total: number;
    byType: Record<IndexableContentType, number>;
  }> {
    if (!this.isInitialized) {
      return { total: 0, byType: {} as Record<IndexableContentType, number> };
    }

    try {
      const filter = {
        must: [{ key: 'workspace_id', match: { value: workspaceId } }],
      };

      // Get count by scrolling (Qdrant doesn't have native count with filter)
      const results = await /* TODO: use QdrantService */ this.db.scrollVectors(this.collectionName, {
        filter,
        limit: 10000,
        with_payload: true,
      });

      const points = results?.points || results || [];
      const byType: Record<string, number> = {};

      if (Array.isArray(points)) {
        for (const point of points) {
          const contentType = point.payload?.content_type as string;
          if (contentType) {
            byType[contentType] = (byType[contentType] || 0) + 1;
          }
        }
      }

      return {
        total: Array.isArray(points) ? points.length : 0,
        byType: byType as Record<IndexableContentType, number>,
      };
    } catch (error) {
      this.logger.error(`[SemanticSearch] Get stats failed:`, error);
      return { total: 0, byType: {} as Record<IndexableContentType, number> };
    }
  }
}
