import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';

/**
 * QdrantService
 *
 * Qdrant integration service that replaces database Qdrant operations.
 * Supports both direct Qdrant operations and LangChain vector store integration.
 * Compatible with LangChain agents and bots.
 */
@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private qdrantClient: QdrantClient;
  private openaiClient: OpenAI;
  private langchainEmbeddings: OpenAIEmbeddings;
  private isQdrantReady = false;
  private isOpenAIReady = false;
  private qdrantUrl: string;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeQdrant();
    await this.initializeOpenAI();
  }

  /**
   * Initialize Qdrant client
   */
  private async initializeQdrant(): Promise<void> {
    try {
      // Support both QDRANT_URL and QDRANT_HOST/QDRANT_PORT formats
      const qdrantHost = this.configService.get<string>('QDRANT_HOST');
      const qdrantPort = this.configService.get<string>('QDRANT_PORT', '6333');
      const qdrantUrl = this.configService.get<string>('QDRANT_URL');
      const qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY');

      // Build URL from host/port or use direct URL
      if (qdrantHost) {
        this.qdrantUrl = `http://${qdrantHost}:${qdrantPort}`;
      } else {
        this.qdrantUrl = qdrantUrl || 'http://localhost:6333';
      }

      const config: any = {
        url: this.qdrantUrl,
        // Disable version compatibility check (server may be older version)
        checkCompatibility: false,
      };

      // Add API key if provided
      if (qdrantApiKey) {
        config.apiKey = qdrantApiKey;
      }

      this.qdrantClient = new QdrantClient(config);

      // Test connection
      await this.qdrantClient.getCollections();

      this.isQdrantReady = true;
      this.logger.log(`[Qdrant] ✅ Connected to Qdrant at ${this.qdrantUrl}`);
    } catch (error) {
      this.logger.warn(`[Qdrant] ⚠️  Failed to connect to Qdrant:`, error.message);
      this.logger.warn(`[Qdrant] Vector search features will be disabled`);
      this.isQdrantReady = false;
    }
  }

  /**
   * Initialize OpenAI client for embeddings
   */
  private async initializeOpenAI(): Promise<void> {
    try {
      const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');

      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Initialize direct OpenAI client
      this.openaiClient = new OpenAI({
        apiKey: openaiApiKey,
      });

      // Initialize LangChain embeddings
      this.langchainEmbeddings = new OpenAIEmbeddings({
        openAIApiKey: openaiApiKey,
        modelName: 'text-embedding-3-large',
      });

      // Mark as ready - will test on first actual usage
      this.isOpenAIReady = true;
      this.logger.log('[Qdrant] OpenAI client and LangChain embeddings initialized successfully');
    } catch (error) {
      this.logger.warn(`[Qdrant] Failed to initialize OpenAI:`, error.message);
      this.logger.warn(`[Qdrant] Embedding generation will be disabled`);
      this.isOpenAIReady = false;
    }
  }

  /**
   * Check if Qdrant is ready
   */
  isReady(): boolean {
    return this.isQdrantReady && this.isOpenAIReady;
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    if (!this.isQdrantReady) return false;

    try {
      await this.qdrantClient.getCollection(collectionName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    collectionName: string,
    options: {
      vectorSize: number;
      distance?: 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';
    },
  ): Promise<void> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      await this.qdrantClient.createCollection(collectionName, {
        vectors: {
          size: options.vectorSize,
          distance: options.distance || 'Cosine',
        },
      });

      this.logger.log(`[Qdrant] Created collection: ${collectionName} (${options.vectorSize}D)`);
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to create collection:`, error);
      throw error;
    }
  }

  /**
   * Ensure collection exists (create if not exists)
   */
  async ensureCollection(
    collectionName: string,
    options: {
      vectorSize: number;
      distance?: 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';
    },
  ): Promise<void> {
    const exists = await this.collectionExists(collectionName);

    if (!exists) {
      try {
        await this.createCollection(collectionName, options);
      } catch (error: any) {
        // Ignore "already exists" errors (race condition between check and create)
        if (error.status === 409 || error.message?.includes('already exists')) {
          this.logger.log(`[Qdrant] Collection already exists: ${collectionName} (race condition handled)`);
          return;
        }
        throw error;
      }
    } else {
      this.logger.log(`[Qdrant] Collection already exists: ${collectionName}`);
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  async generateEmbedding(
    text: string,
    model: string = 'text-embedding-3-large',
  ): Promise<number[]> {
    if (!this.isOpenAIReady) {
      throw new Error('OpenAI is not ready');
    }

    try {
      const response = await this.openaiClient.embeddings.create({
        model,
        input: text,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Empty embedding response');
      }

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to generate embedding:`, error);
      throw error;
    }
  }

  /**
   * Upsert vectors into collection
   */
  async upsertVectors(
    collectionName: string,
    points: Array<{
      id: string;
      vector: number[];
      payload?: Record<string, any>;
    }>,
  ): Promise<void> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      await this.qdrantClient.upsert(collectionName, {
        wait: true,
        points: points.map((point) => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload || {},
        })),
      });

      this.logger.log(`[Qdrant] Upserted ${points.length} vectors to ${collectionName}`);
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to upsert vectors:`, error);
      throw error;
    }
  }

  /**
   * Search vectors with filters
   */
  async searchVectors(
    collectionName: string,
    queryVector: number[],
    options: {
      limit?: number;
      filter?: any;
      with_payload?: boolean;
    } = {},
  ): Promise<any[]> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      const searchParams: any = {
        vector: queryVector,
        limit: options.limit || 10,
        with_payload: options.with_payload !== false,
      };

      if (options.filter) {
        searchParams.filter = options.filter;
      }

      const result = await this.qdrantClient.search(collectionName, searchParams);

      return result;
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to search vectors:`, error);
      throw error;
    }
  }

  /**
   * Scroll through vectors (for getting recent history)
   */
  async scrollVectors(
    collectionName: string,
    options: {
      filter?: any;
      limit?: number;
      with_payload?: boolean;
      order_by?: { key: string; direction: 'asc' | 'desc' };
    } = {},
  ): Promise<any> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      const scrollParams: any = {
        limit: options.limit || 10,
        with_payload: options.with_payload !== false,
      };

      if (options.filter) {
        scrollParams.filter = options.filter;
      }

      if (options.order_by) {
        scrollParams.order_by = {
          key: options.order_by.key,
          direction: options.order_by.direction,
        };
      }

      const result = await this.qdrantClient.scroll(collectionName, scrollParams);

      return result;
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to scroll vectors:`, error);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(collectionName: string, pointIds: string[]): Promise<void> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      await this.qdrantClient.delete(collectionName, {
        wait: true,
        points: pointIds,
      });

      this.logger.log(`[Qdrant] Deleted ${pointIds.length} vectors from ${collectionName}`);
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to delete vectors:`, error);
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async deleteVectorsByFilter(collectionName: string, filter: any): Promise<void> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      await this.qdrantClient.delete(collectionName, {
        wait: true,
        filter,
      });

      this.logger.log(`[Qdrant] Deleted vectors by filter from ${collectionName}`);
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to delete vectors by filter:`, error);
      throw error;
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionName: string): Promise<void> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      await this.qdrantClient.deleteCollection(collectionName);

      this.logger.log(`[Qdrant] Deleted collection: ${collectionName}`);
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to delete collection:`, error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName: string): Promise<any> {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }

    try {
      const info = await this.qdrantClient.getCollection(collectionName);
      return info;
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to get collection info:`, error);
      throw error;
    }
  }

  // ============================================
  // LangChain Integration Methods
  // ============================================

  /**
   * Get LangChain embeddings instance
   * Use this for LangChain agents and bots
   */
  getLangChainEmbeddings(): OpenAIEmbeddings {
    if (!this.isOpenAIReady) {
      throw new Error('OpenAI/LangChain embeddings not ready');
    }
    return this.langchainEmbeddings;
  }

  /**
   * Get Qdrant client for LangChain
   */
  getQdrantClient(): QdrantClient {
    if (!this.isQdrantReady) {
      throw new Error('Qdrant is not ready');
    }
    return this.qdrantClient;
  }

  /**
   * Create a LangChain QdrantVectorStore instance
   * Use this for LangChain agents and bots that need vector store access
   */
  async createLangChainVectorStore(
    collectionName: string,
    options?: {
      customEmbeddings?: OpenAIEmbeddings;
    },
  ): Promise<QdrantVectorStore> {
    if (!this.isQdrantReady || !this.isOpenAIReady) {
      throw new Error('Qdrant or OpenAI not ready');
    }

    try {
      const embeddings = options?.customEmbeddings || this.langchainEmbeddings;

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: this.qdrantUrl,
          collectionName,
        },
      );

      this.logger.log(`[Qdrant] Created LangChain vector store for: ${collectionName}`);
      return vectorStore;
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to create LangChain vector store:`, error);
      throw error;
    }
  }

  /**
   * Create and initialize a new LangChain vector store with documents
   */
  async createLangChainVectorStoreFromDocuments(
    collectionName: string,
    documents: any[],
    options?: {
      customEmbeddings?: OpenAIEmbeddings;
    },
  ): Promise<QdrantVectorStore> {
    if (!this.isQdrantReady || !this.isOpenAIReady) {
      throw new Error('Qdrant or OpenAI not ready');
    }

    try {
      const embeddings = options?.customEmbeddings || this.langchainEmbeddings;

      const vectorStore = await QdrantVectorStore.fromDocuments(
        documents,
        embeddings,
        {
          url: this.qdrantUrl,
          collectionName,
        },
      );

      this.logger.log(`[Qdrant] Created LangChain vector store from documents: ${collectionName}`);
      return vectorStore;
    } catch (error) {
      this.logger.error(`[Qdrant] Failed to create LangChain vector store from documents:`, error);
      throw error;
    }
  }
}
