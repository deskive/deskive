import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents a conversation message stored in Qdrant
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  workspace_id: string;
  user_id: string;
  // Action metadata for AI operations
  action?: string; // create, update, delete, batch_create, etc.
  success?: boolean;
  project_ids?: string[]; // IDs of projects involved
  project_names?: string[]; // Names of projects involved
  // Additional context
  entity_type?: string; // 'project', 'task', 'note', etc.
  metadata?: Record<string, any>;
}

/**
 * Search result from Qdrant with similarity score
 */
export interface ConversationSearchResult extends ConversationMessage {
  score: number;
}

/**
 * Options for storing a message
 */
export interface StoreMessageOptions {
  role: 'user' | 'assistant';
  content: string;
  workspace_id: string;
  user_id: string;
  action?: string;
  success?: boolean;
  project_ids?: string[];
  project_names?: string[];
  entity_type?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ConversationMemoryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConversationMemoryService.name);
  private readonly collectionName = 'conversation_memory';
  private readonly embeddingSize = 3072; // OpenAI text-embedding-3-large
  private isInitialized = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly qdrantService: QdrantService,
  ) {}

  async onApplicationBootstrap() {
    // Initialize AFTER all modules are ready (including QdrantService)
    this.logger.log('[ConversationMemory] Starting initialization...');

    // QdrantService may not be ready if Qdrant is not configured/running
    // This is expected in some environments - conversation memory is optional
    if (!this.qdrantService.isReady()) {
      this.logger.warn('[ConversationMemory] QdrantService is not ready (Qdrant may not be configured or running). Conversation memory disabled.');
      this.isInitialized = false;
      return;
    }

    this.logger.log('[ConversationMemory] QdrantService is ready, proceeding with initialization');
    await this.ensureCollection();
    // Test if embeddings API is working
    await this.testEmbeddingsAPI();
  }

  /**
   * Test if the embeddings API is working
   * If not, disable conversation memory gracefully
   */
  private async testEmbeddingsAPI(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.logger.log('[ConversationMemory] Testing embeddings API...');
      // Use a more realistic sentence for testing embeddings API
      await this.generateEmbedding('This is a test message to verify the embeddings API is working correctly for conversation memory.');
      this.logger.log('[ConversationMemory] Embeddings API working - conversation memory enabled');
    } catch (error) {
      const errorMessage = (error as Error)?.message || '';

      // Provide helpful guidance based on the error type
      if (errorMessage.includes('AI feature may not be enabled')) {
        this.logger.log(
          '[ConversationMemory] AI/Embeddings feature not enabled in project. ' +
          'Conversation memory disabled (optional feature). Enable OPENAI_API_KEY in .env to use this feature.'
        );
      } else {
        this.logger.warn('[ConversationMemory] Embeddings test failed - conversation memory disabled');
      }
      this.isInitialized = false;
    }
  }

  /**
   * Ensure the conversation memory collection exists in Qdrant
   */
  private async ensureCollection(): Promise<void> {
    try {
      this.logger.log(`[ConversationMemory] Ensuring collection: ${this.collectionName}`);

      // Check if Qdrant service is ready
      if (!this.qdrantService.isReady()) {
        this.logger.warn(`[ConversationMemory] ⚠️  Qdrant service not ready - conversation memory disabled`);
        this.isInitialized = false;
        return;
      }

      await this.qdrantService.ensureCollection(this.collectionName, {
        vectorSize: this.embeddingSize,
        distance: 'Cosine',
      });

      this.isInitialized = true;
      this.logger.log(`[ConversationMemory] Collection ready: ${this.collectionName}`);
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to ensure collection:`, error);
      // Don't throw - allow service to start even if Qdrant is not available
      this.isInitialized = false;
    }
  }

  /**
   * Check if the service is ready (Qdrant connection established)
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate embedding for text using Qdrant service
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.qdrantService.generateEmbedding(text, 'text-embedding-3-large');

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding response: expected non-empty number array');
      }

      return embedding;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to generate embedding:`, error);
      throw error;
    }
  }

  /**
   * Store a conversation message in Qdrant
   */
  async storeMessage(options: StoreMessageOptions): Promise<string> {
    if (!this.isInitialized) {
      this.logger.warn('[ConversationMemory] Service not initialized, skipping store');
      return '';
    }

    try {
      const messageId = uuidv4();
      const timestamp = new Date();

      // Generate embedding for the message content
      const embedding = await this.generateEmbedding(options.content);

      // Build payload with all metadata
      const payload: Record<string, any> = {
        role: options.role,
        content: options.content,
        timestamp: timestamp.toISOString(),
        workspace_id: options.workspace_id,
        user_id: options.user_id,
      };

      // Add optional fields if present
      if (options.action) payload.action = options.action;
      if (options.success !== undefined) payload.success = options.success;
      if (options.project_ids?.length) payload.project_ids = options.project_ids;
      if (options.project_names?.length) payload.project_names = options.project_names;
      if (options.entity_type) payload.entity_type = options.entity_type;
      if (options.metadata) payload.metadata = options.metadata;

      // Store in Qdrant
      await this.qdrantService.upsertVectors(this.collectionName, [
        {
          id: messageId,
          vector: embedding,
          payload,
        },
      ]);

      this.logger.log(`[ConversationMemory] Stored message: ${messageId} (${options.role}), action=${payload.action}, has_metadata=${!!payload.metadata}`);
      if (payload.action === 'show_events' || payload.action === 'show_today_events' || payload.action === 'show_tomorrow_events') {
        this.logger.log(`[ConversationMemory] Stored event action with event_titles=${payload.metadata?.event_titles}`);
      }
      return messageId;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to store message:`, error);
      // Don't throw - conversation memory is optional, shouldn't break main flow
      return '';
    }
  }

  /**
   * Search for relevant conversation history using semantic search
   */
  async searchRelevantHistory(
    query: string,
    workspace_id: string,
    user_id: string,
    limit: number = 10,
  ): Promise<ConversationSearchResult[]> {
    if (!this.isInitialized) {
      this.logger.warn('[ConversationMemory] Service not initialized, returning empty results');
      return [];
    }

    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build filter for workspace and user
      const filter = {
        must: [
          { key: 'workspace_id', match: { value: workspace_id } },
          { key: 'user_id', match: { value: user_id } },
        ],
      };

      // Search Qdrant
      const results = await this.qdrantService.searchVectors(
        this.collectionName,
        queryEmbedding,
        {
          limit,
          filter,
          with_payload: true,
        },
      );

      // Convert results to ConversationSearchResult format
      const messages: ConversationSearchResult[] = [];

      if (Array.isArray(results)) {
        for (const result of results) {
          const payload = result.payload || {};

          // DEBUG: Log what Qdrant returned
          this.logger.debug(`[ConversationMemory] Retrieved payload keys: ${Object.keys(payload).join(', ')}`);
          this.logger.debug(`[ConversationMemory] payload.action = ${payload.action}, payload.entity_type = ${payload.entity_type}`);

          messages.push({
            id: String(result.id),
            score: result.score || 0,
            role: payload.role as 'user' | 'assistant',
            content: payload.content as string,
            timestamp: new Date(payload.timestamp as string),
            workspace_id: payload.workspace_id as string,
            user_id: payload.user_id as string,
            action: payload.action as string,
            success: payload.success as boolean,
            project_ids: payload.project_ids as string[],
            project_names: payload.project_names as string[],
            entity_type: payload.entity_type as string,
            metadata: payload.metadata as Record<string, any>,
          });
        }
      }

      this.logger.log(`[ConversationMemory] Found ${messages.length} relevant messages for query`);
      return messages;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to search history:`, error);
      return [];
    }
  }

  /**
   * Get recent conversation history (chronological, not semantic)
   * Useful for getting the most recent messages regardless of relevance
   */
  async getRecentHistory(
    workspace_id: string,
    user_id: string,
    limit: number = 10,
  ): Promise<ConversationMessage[]> {
    if (!this.isInitialized) {
      this.logger.warn('[ConversationMemory] Service not initialized, returning empty results');
      return [];
    }

    try {
      const filter = {
        must: [
          { key: 'workspace_id', match: { value: workspace_id } },
          { key: 'user_id', match: { value: user_id } },
        ],
      };

      // Use scroll to get recent messages
      // Note: Removing order_by since it requires a range index on timestamp
      // We'll sort in memory after retrieval
      const results = await this.qdrantService.scrollVectors(this.collectionName, {
        filter,
        limit: limit * 2, // Get more results to sort in memory
        with_payload: true,
      });

      const messages: ConversationMessage[] = [];
      const points = results?.points || results || [];

      if (Array.isArray(points)) {
        for (const point of points) {
          const payload = point.payload || {};
          messages.push({
            id: String(point.id),
            role: payload.role as 'user' | 'assistant',
            content: payload.content as string,
            timestamp: new Date(payload.timestamp as string),
            workspace_id: payload.workspace_id as string,
            user_id: payload.user_id as string,
            action: payload.action as string,
            success: payload.success as boolean,
            project_ids: payload.project_ids as string[],
            project_names: payload.project_names as string[],
            entity_type: payload.entity_type as string,
            metadata: payload.metadata as Record<string, any>,
          });
        }
      }

      // Sort by timestamp descending (newest first) and take the requested limit
      messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const recentMessages = messages.slice(0, limit);

      this.logger.log(`[ConversationMemory] Retrieved ${recentMessages.length} recent messages (sorted in memory)`);
      return recentMessages;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to get recent history:`, error);
      return [];
    }
  }

  /**
   * Delete conversation history for a specific user in a workspace
   */
  async deleteUserHistory(workspace_id: string, user_id: string): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('[ConversationMemory] Service not initialized, skipping delete');
      return false;
    }

    try {
      const filter = {
        must: [
          { key: 'workspace_id', match: { value: workspace_id } },
          { key: 'user_id', match: { value: user_id } },
        ],
      };

      await this.qdrantService.deleteVectorsByFilter(this.collectionName, filter);

      this.logger.log(`[ConversationMemory] Deleted history for user ${user_id} in workspace ${workspace_id}`);
      return true;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to delete user history:`, error);
      return false;
    }
  }

  /**
   * Delete all conversation history for a workspace
   */
  async deleteWorkspaceHistory(workspace_id: string): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.warn('[ConversationMemory] Service not initialized, skipping delete');
      return false;
    }

    try {
      const filter = {
        must: [{ key: 'workspace_id', match: { value: workspace_id } }],
      };

      await this.qdrantService.deleteVectorsByFilter(this.collectionName, filter);

      this.logger.log(`[ConversationMemory] Deleted all history for workspace ${workspace_id}`);
      return true;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to delete workspace history:`, error);
      return false;
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getConversationStats(
    workspace_id: string,
    user_id: string,
  ): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    actionCounts: Record<string, number>;
    entityTypes: Record<string, number>;
  }> {
    if (!this.isInitialized) {
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        actionCounts: {},
        entityTypes: {},
      };
    }

    try {
      // Get all messages for this user (limited for performance)
      const messages = await this.getRecentHistory(workspace_id, user_id, 1000);

      const stats = {
        totalMessages: messages.length,
        userMessages: 0,
        assistantMessages: 0,
        actionCounts: {} as Record<string, number>,
        entityTypes: {} as Record<string, number>,
      };

      for (const msg of messages) {
        if (msg.role === 'user') {
          stats.userMessages++;
        } else {
          stats.assistantMessages++;
        }

        if (msg.action) {
          stats.actionCounts[msg.action] = (stats.actionCounts[msg.action] || 0) + 1;
        }

        if (msg.entity_type) {
          stats.entityTypes[msg.entity_type] = (stats.entityTypes[msg.entity_type] || 0) + 1;
        }
      }

      return stats;
    } catch (error) {
      this.logger.error(`[ConversationMemory] Failed to get stats:`, error);
      return {
        totalMessages: 0,
        userMessages: 0,
        assistantMessages: 0,
        actionCounts: {},
        entityTypes: {},
      };
    }
  }

  /**
   * Build conversation context string from relevant history
   * This is used to inject context into AI prompts
   */
  buildContextFromHistory(messages: ConversationSearchResult[]): string {
    if (messages.length === 0) {
      return '';
    }

    const contextLines = messages.map((msg, idx) => {
      const timeAgo = this.getTimeAgo(msg.timestamp);
      const roleLabel = msg.role === 'user' ? 'User' : 'AI';
      const projectInfo =
        msg.project_names && msg.project_names.length > 0
          ? ` [Projects: ${msg.project_names.join(', ')}]`
          : '';
      const actionInfo = msg.action ? ` [Action: ${msg.action}]` : '';
      const scoreInfo = msg.score ? ` (relevance: ${(msg.score * 100).toFixed(0)}%)` : '';

      return `${idx + 1}. [${timeAgo}] ${roleLabel}: ${msg.content}${projectInfo}${actionInfo}${scoreInfo}`;
    });

    return `
RELEVANT CONVERSATION HISTORY (semantically matched):
${contextLines.join('\n')}

IMPORTANT CONTEXT RULES:
- Use this history to resolve references like "the last project", "those projects", "the one I created"
- Project names and IDs are stored in the history
- When user says "the last 2 projects", extract project info from most recent create operations
- Time context: Messages are ordered by relevance, check timestamps for recency
`;
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  }
}
