import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryType,
  ContextType,
  StoreMemoryDto,
  StoreEpisodicMemoryDto,
  StorePreferenceDto,
  SearchMemoriesDto,
  MemorySearchResultDto,
  UserPreferenceDto,
  MemoryContextDto,
} from './dto/memory.dto';

/**
 * Internal memory record structure (database format)
 */
interface AgentMemoryRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  agent_id?: string;
  memory_type: string;
  content: string;
  summary?: string;
  context_type?: string;
  context_id?: string;
  importance: number;
  tags: string[];
  metadata: Record<string, any>;
  embedding_id?: string;
  expires_at?: string;
  access_count: number;
  last_accessed_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Internal preference record structure (database format)
 */
interface AgentMemoryPreferenceRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  preference_key: string;
  preference_value: any;
  confidence: number;
  learned_from: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Vector search result from Qdrant
 */
interface VectorSearchResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
}

/**
 * SuperAgentMemoryService
 *
 * Provides comprehensive memory capabilities for Super Agents:
 * - Episodic memory: Key decisions and actions
 * - Preference learning: User patterns and preferences
 * - Long-term memory: Historical knowledge
 * - Semantic search: Find relevant memories using AI embeddings
 */
@Injectable()
export class SuperAgentMemoryService implements OnModuleInit {
  private readonly logger = new Logger(SuperAgentMemoryService.name);
  private readonly collectionName = 'agent_memory';
  private readonly embeddingSize = 3072; // OpenAI text-embedding-3-large dimension
  private isInitialized = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly qdrantService: QdrantService,
  ) {}

  async onModuleInit() {
    await this.ensureCollection();
    await this.testEmbeddingsAPI();
  }

  /**
   * Test if the embeddings API is working
   */
  private async testEmbeddingsAPI(): Promise<void> {
    if (!this.isInitialized) {
      this.logger.warn(
        '[SuperAgentMemory] ⚠️  Vector collection not initialized - skipping embeddings test',
      );
      return;
    }

    try {
      this.logger.log('[SuperAgentMemory] Testing embeddings API...');
      await this.generateEmbedding('Test memory content for Super Agent memory system.');
      this.logger.log('[SuperAgentMemory] ✅ Embeddings API working - semantic search ENABLED');
    } catch (error) {
      const errorMessage = (error as Error)?.message || '';

      if (errorMessage.includes('AI feature may not be enabled')) {
        this.logger.warn(
          '[SuperAgentMemory] ⚠️  AI/Embeddings feature NOT ENABLED on database. ' +
            'Enable it at: OPENAI_API_KEY in .env',
        );
      } else {
        this.logger.warn(
          '[SuperAgentMemory] ⚠️  Embeddings test failed - semantic search disabled',
        );
        this.logger.debug('[SuperAgentMemory] Error:', errorMessage);
      }
      // Note: We don't disable the whole service, just semantic search
    }
  }

  /**
   * Ensure the Qdrant collection exists
   */
  private async ensureCollection(): Promise<void> {
    try {
      this.logger.log(
        `[SuperAgentMemory] Ensuring vector collection: ${this.collectionName} (${this.embeddingSize} dimensions)`,
      );

      // Check if Qdrant service is ready
      if (!this.qdrantService.isReady()) {
        this.logger.warn(
          `[SuperAgentMemory] ⚠️  Qdrant service not ready - semantic search disabled`,
        );
        this.isInitialized = false;
        return;
      }

      // Ensure collection exists (will create if not exists)
      await this.qdrantService.ensureCollection(this.collectionName, {
        vectorSize: this.embeddingSize,
        distance: 'Cosine',
      });

      this.isInitialized = true;
      this.logger.log(
        `[SuperAgentMemory] ✅ Vector collection ready: ${this.collectionName} (${this.embeddingSize}D)`,
      );
    } catch (error) {
      this.logger.warn(
        `[SuperAgentMemory] ⚠️  Vector database not available - semantic search disabled`,
      );
      this.logger.debug(`[SuperAgentMemory] Error details:`, error);
      // Allow service to start without Qdrant - will fall back to database-only
      this.isInitialized = false;
    }
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.qdrantService.generateEmbedding(text, 'text-embedding-3-large');

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding response');
      }

      return embedding;
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to generate embedding:`, error);
      throw error;
    }
  }

  // ============================================
  // Memory Storage Operations
  // ============================================

  /**
   * Store a new memory
   */
  async storeMemory(dto: StoreMemoryDto): Promise<string> {
    try {
      const memoryId = uuidv4();
      const now = new Date().toISOString();

      // Store in database
      const dbRecord: Partial<AgentMemoryRecord> = {
        id: memoryId,
        workspace_id: dto.workspaceId,
        user_id: dto.userId,
        agent_id: dto.agentId,
        memory_type: dto.memoryType,
        content: dto.content,
        summary: dto.summary,
        context_type: dto.contextType,
        context_id: dto.contextId,
        importance: dto.importance || 5,
        tags: dto.tags || [],
        metadata: dto.metadata || {},
        expires_at: dto.expiresAt,
        access_count: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      await this.db.insert('agent_memory', dbRecord);

      // Store vector embedding in Qdrant if available
      if (this.isInitialized) {
        try {
          this.logger.log(
            `[SuperAgentMemory] Generating embedding for memory content (${dto.content.length} chars)...`,
          );
          const embedding = await this.generateEmbedding(dto.content);
          this.logger.log(`[SuperAgentMemory] Embedding generated: ${embedding.length} dimensions`);

          const vectorPayload = {
            id: memoryId,
            vector: embedding,
            payload: {
              workspace_id: dto.workspaceId,
              user_id: dto.userId,
              memory_type: dto.memoryType,
              context_type: dto.contextType,
              importance: dto.importance || 5,
              tags: dto.tags || [],
              is_active: true,
              created_at: now,
            },
          };

          this.logger.log(
            `[SuperAgentMemory] Upserting vector to Qdrant: ID=${memoryId}, dimensions=${embedding.length}`,
          );
          await this.qdrantService.upsertVectors(this.collectionName, [vectorPayload]);

          // Update database with embedding_id
          await this.db.update(
            'agent_memory',
            { id: memoryId },
            {
              embedding_id: memoryId,
              updated_at: new Date().toISOString(),
            },
          );
        } catch (embedError) {
          this.logger.warn(
            `[SuperAgentMemory] Failed to store embedding, continuing with DB-only:`,
            embedError,
          );
        }
      }

      this.logger.log(`[SuperAgentMemory] Stored memory: ${memoryId} (${dto.memoryType})`);
      return memoryId;
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to store memory:`, error);
      throw error;
    }
  }

  /**
   * Store an episodic memory (simplified helper)
   */
  async storeEpisodicMemory(dto: StoreEpisodicMemoryDto): Promise<string> {
    return this.storeMemory({
      ...dto,
      memoryType: MemoryType.EPISODIC,
    });
  }

  /**
   * Store a decision memory
   */
  async storeDecisionMemory(
    workspaceId: string,
    userId: string,
    decision: string,
    context: string,
    importance: number = 8,
  ): Promise<string> {
    return this.storeMemory({
      workspaceId,
      userId,
      memoryType: MemoryType.DECISION,
      content: `Decision: ${decision}\nContext: ${context}`,
      importance,
      tags: ['decision'],
    });
  }

  /**
   * Store or update a user preference
   */
  async storePreference(dto: StorePreferenceDto): Promise<string> {
    try {
      const now = new Date().toISOString();

      // Check if preference already exists
      const existing = await this.db.findOne('agent_memory_preferences', {
        workspace_id: dto.workspaceId,
        user_id: dto.userId,
        preference_key: dto.preferenceKey,
      });

      if (existing) {
        // Update existing preference
        const newConfidence = Math.min(
          1.0,
          (existing.confidence || 0.5) + (dto.confidence || 0.1) * 0.5,
        );
        const learnedFrom = [...(existing.learned_from || []), ...(dto.learnedFrom || [])].slice(
          -50,
        ); // Keep last 50 sources

        await this.db.update(
          'agent_memory_preferences',
          { id: existing.id },
          {
            preference_value: dto.preferenceValue,
            confidence: newConfidence,
            learned_from: learnedFrom,
            updated_at: now,
          },
        );

        this.logger.log(
          `[SuperAgentMemory] Updated preference: ${dto.preferenceKey} (confidence: ${newConfidence.toFixed(2)})`,
        );
        return existing.id;
      } else {
        // Create new preference
        const preferenceId = uuidv4();

        await this.db.insert('agent_memory_preferences', {
          id: preferenceId,
          workspace_id: dto.workspaceId,
          user_id: dto.userId,
          preference_key: dto.preferenceKey,
          preference_value: dto.preferenceValue,
          confidence: dto.confidence || 0.5,
          learned_from: dto.learnedFrom || [],
          created_at: now,
          updated_at: now,
        });

        this.logger.log(`[SuperAgentMemory] Created preference: ${dto.preferenceKey}`);
        return preferenceId;
      }
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to store preference:`, error);
      throw error;
    }
  }

  // ============================================
  // Memory Retrieval Operations
  // ============================================

  /**
   * Search memories using semantic search
   */
  async searchMemories(dto: SearchMemoriesDto): Promise<MemorySearchResultDto[]> {
    try {
      const results: MemorySearchResultDto[] = [];

      // Try semantic search first if available
      if (this.isInitialized) {
        try {
          this.logger.log(`[SuperAgentMemory] 🔍 Using VECTOR SEARCH for query: "${dto.query}"`);

          const queryEmbedding = await this.generateEmbedding(dto.query);
          this.logger.log(
            `[SuperAgentMemory] Generated embedding vector (${queryEmbedding.length} dimensions)`,
          );

          // Build Qdrant filter - SIMPLIFIED to test
          const filter: Record<string, any> = {
            must: [
              { key: 'workspace_id', match: { value: dto.workspaceId } },
              { key: 'user_id', match: { value: dto.userId } },
            ],
          };

          this.logger.log(
            `[SuperAgentMemory] Filter criteria: workspace_id=${dto.workspaceId}, user_id=${dto.userId}`,
          );

          if (!dto.includeInactive) {
            filter.must.push({ key: 'is_active', match: { value: true } });
          }

          if (dto.memoryType) {
            filter.must.push({ key: 'memory_type', match: { value: dto.memoryType } });
          }

          if (dto.contextType) {
            filter.must.push({ key: 'context_type', match: { value: dto.contextType } });
          }

          if (dto.minImportance) {
            filter.must.push({ key: 'importance', range: { gte: dto.minImportance } });
          }

          // Search Qdrant with filters
          this.logger.log(
            `[SuperAgentMemory] Searching vector database with ${filter.must.length} filters...`,
          );
          const vectorSearchResponse = await this.qdrantService.searchVectors(
            this.collectionName,
            queryEmbedding,
            {
              limit: dto.limit || 10,
              filter,
              with_payload: true,
            },
          );

          this.logger.log(
            `[SuperAgentMemory] Vector search response type: ${typeof vectorSearchResponse}, isArray: ${Array.isArray(vectorSearchResponse)}`,
          );

          // Qdrant client returns array directly
          const vectorResults: any[] = Array.isArray(vectorSearchResponse)
            ? vectorSearchResponse
            : [];

          this.logger.log(
            `[SuperAgentMemory] ✅ Found ${vectorResults.length} results from Qdrant`,
          );

          if (vectorResults.length === 0) {
            this.logger.log(
              `[SuperAgentMemory] ℹ️  No semantic matches found - this is normal if no memories have been stored yet`,
            );
            return [];
          }

          this.logger.log(`[SuperAgentMemory] 🎯 Found ${vectorResults.length} semantic matches`);

          // Fetch full records from database
          for (const vr of vectorResults) {
            const record = await this.db.findOne('agent_memory', { id: vr.id });
            if (record) {
              results.push(this.mapToSearchResult(record, vr.score));
              this.logger.log(
                `[SuperAgentMemory]   - Memory "${record.content.substring(0, 50)}..." (score: ${vr.score.toFixed(3)})`,
              );

              // Update access stats
              await this.updateAccessStats(vr.id);
            }
          }

          this.logger.log(
            `[SuperAgentMemory] ✅ VECTOR SEARCH COMPLETE - Returning ${results.length} memories`,
          );
          return results;
        } catch (embedError) {
          this.logger.warn(
            `[SuperAgentMemory] ⚠️  Vector search failed, falling back to DATABASE search`,
          );
          this.logger.warn(`[SuperAgentMemory] Error: ${embedError.message}`);
        }
      } else {
        this.logger.log(
          `[SuperAgentMemory] ℹ️  Vector search not initialized - using DATABASE search`,
        );
      }

      // Fallback to database-only search
      this.logger.log(
        `[SuperAgentMemory] 🔍 Using DATABASE SEARCH (keyword matching) for query: "${dto.query}"`,
      );

      const conditions: Record<string, any> = {
        workspace_id: dto.workspaceId,
        user_id: dto.userId,
      };

      if (!dto.includeInactive) {
        conditions.is_active = true;
      }

      if (dto.memoryType) {
        conditions.memory_type = dto.memoryType;
      }

      if (dto.contextType) {
        conditions.context_type = dto.contextType;
      }

      const dbResults = await this.db.findMany('agent_memory', conditions, {
        orderBy: 'importance',
        order: 'desc',
        limit: dto.limit || 10,
      });

      this.logger.log(
        `[SuperAgentMemory] Found ${dbResults.data?.length || 0} total memories, filtering by keyword match...`,
      );

      for (const record of dbResults.data || []) {
        // Simple keyword matching for relevance score
        const contentLower = record.content.toLowerCase();
        const queryLower = dto.query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        const matchCount = queryWords.filter((w) => contentLower.includes(w)).length;
        const score = matchCount / queryWords.length;

        if (score > 0) {
          results.push(this.mapToSearchResult(record, score));
          await this.updateAccessStats(record.id);
        }
      }

      this.logger.log(
        `[SuperAgentMemory] ✅ DATABASE SEARCH COMPLETE - Returning ${results.length} keyword-matched memories`,
      );
      return results.sort((a, b) => b.score - a.score).slice(0, dto.limit || 10);
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to search memories:`, error);
      return [];
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(
    workspaceId: string,
    userId: string,
  ): Promise<Map<string, UserPreferenceDto>> {
    try {
      const result = await this.db.findMany('agent_memory_preferences', {
        workspace_id: workspaceId,
        user_id: userId,
      });

      const preferences = new Map<string, UserPreferenceDto>();

      for (const record of result.data || []) {
        preferences.set(record.preference_key, {
          preferenceKey: record.preference_key,
          preferenceValue: record.preference_value,
          confidence: record.confidence,
          updatedAt: new Date(record.updated_at),
        });
      }

      return preferences;
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to get preferences:`, error);
      return new Map();
    }
  }

  /**
   * Get a single preference value
   */
  async getPreference(workspaceId: string, userId: string, key: string): Promise<any | null> {
    try {
      const record = await this.db.findOne('agent_memory_preferences', {
        workspace_id: workspaceId,
        user_id: userId,
        preference_key: key,
      });

      return record?.preference_value || null;
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to get preference:`, error);
      return null;
    }
  }

  /**
   * Get relevant memories and preferences for a query
   */
  async getRelevantMemories(
    query: string,
    workspaceId: string,
    userId: string,
    limit: number = 10,
  ): Promise<MemoryContextDto> {
    try {
      // Search memories
      const memories = await this.searchMemories({
        query,
        workspaceId,
        userId,
        limit,
      });

      // Get preferences
      const preferencesMap = await this.getUserPreferences(workspaceId, userId);
      const preferences = Array.from(preferencesMap.values());

      // Build context string
      const contextString = this.buildMemoryContext(memories, preferences);

      return {
        memories,
        preferences,
        contextString,
      };
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to get relevant memories:`, error);
      return {
        memories: [],
        preferences: [],
        contextString: '',
      };
    }
  }

  /**
   * Build a context string for AI prompt injection
   */
  buildMemoryContext(memories: MemorySearchResultDto[], preferences: UserPreferenceDto[]): string {
    if (memories.length === 0 && preferences.length === 0) {
      return '';
    }

    const lines: string[] = [];

    // Add relevant memories
    if (memories.length > 0) {
      lines.push('RELEVANT MEMORIES:');
      for (const mem of memories) {
        const timeAgo = this.getTimeAgo(mem.createdAt);
        const tags = mem.tags.length > 0 ? ` [${mem.tags.join(', ')}]` : '';
        const relevance = `(relevance: ${(mem.score * 100).toFixed(0)}%)`;
        lines.push(`- [${timeAgo}] ${mem.content}${tags} ${relevance}`);
      }
      lines.push('');
    }

    // Add user preferences
    if (preferences.length > 0) {
      lines.push('USER PREFERENCES (learned patterns):');
      for (const pref of preferences.filter((p) => p.confidence >= 0.5)) {
        const confidence = `(confidence: ${(pref.confidence * 100).toFixed(0)}%)`;
        lines.push(
          `- ${pref.preferenceKey}: ${JSON.stringify(pref.preferenceValue)} ${confidence}`,
        );
      }
      lines.push('');
    }

    lines.push('IMPORTANT: Use this context to personalize responses and maintain consistency.');

    return lines.join('\n');
  }

  // ============================================
  // Memory Management Operations
  // ============================================

  /**
   * Update memory importance
   */
  async updateMemoryImportance(memoryId: string, delta: number): Promise<void> {
    try {
      const record = await this.db.findOne('agent_memory', { id: memoryId });
      if (!record) return;

      const newImportance = Math.max(1, Math.min(10, record.importance + delta));

      await this.db.update(
        'agent_memory',
        { id: memoryId },
        {
          importance: newImportance,
          updated_at: new Date().toISOString(),
        },
      );

      // Update Qdrant payload if available
      if (this.isInitialized && record.embedding_id) {
        try {
          // Re-upsert with updated importance
          const embedding = await this.generateEmbedding(record.content);
          await this.qdrantService.upsertVectors(this.collectionName, [
            {
              id: memoryId,
              vector: embedding,
              payload: {
                workspace_id: record.workspace_id,
                user_id: record.user_id,
                memory_type: record.memory_type,
                context_type: record.context_type,
                importance: newImportance,
                tags: record.tags,
                is_active: record.is_active,
                created_at: record.created_at,
              },
            },
          ]);
        } catch (error) {
          this.logger.warn(`[SuperAgentMemory] Failed to update Qdrant:`, error);
        }
      }

      this.logger.log(`[SuperAgentMemory] Updated importance: ${memoryId} -> ${newImportance}`);
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to update importance:`, error);
    }
  }

  /**
   * Deactivate a memory (soft delete)
   */
  async deactivateMemory(memoryId: string): Promise<void> {
    try {
      await this.db.update(
        'agent_memory',
        { id: memoryId },
        {
          is_active: false,
          updated_at: new Date().toISOString(),
        },
      );

      // Update Qdrant if available
      if (this.isInitialized) {
        try {
          await this.qdrantService.deleteVectors(this.collectionName, [memoryId]);
        } catch (error) {
          this.logger.warn(`[SuperAgentMemory] Failed to delete from Qdrant:`, error);
        }
      }

      this.logger.log(`[SuperAgentMemory] Deactivated memory: ${memoryId}`);
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to deactivate memory:`, error);
    }
  }

  /**
   * Cleanup expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      const now = new Date().toISOString();

      // Find expired memories
      const query = this.db
        .table('agent_memory')
        .where('expires_at', '<', now)
        .where('is_active', '=', true);

      const expired = await query.execute();
      const expiredRecords = expired.data || [];

      let count = 0;
      for (const record of expiredRecords) {
        await this.deactivateMemory(record.id);
        count++;
      }

      if (count > 0) {
        this.logger.log(`[SuperAgentMemory] Cleaned up ${count} expired memories`);
      }

      return count;
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to cleanup expired memories:`, error);
      return 0;
    }
  }

  /**
   * Delete all memories for a user in a workspace
   */
  async deleteUserMemories(workspaceId: string, userId: string): Promise<boolean> {
    try {
      // Delete from database
      await this.db.deleteMany('agent_memory', {
        workspace_id: workspaceId,
        user_id: userId,
      });

      await this.db.deleteMany('agent_memory_preferences', {
        workspace_id: workspaceId,
        user_id: userId,
      });

      // Delete from Qdrant
      if (this.isInitialized) {
        try {
          await this.qdrantService.deleteVectorsByFilter(this.collectionName, {
            must: [
              { key: 'workspace_id', match: { value: workspaceId } },
              { key: 'user_id', match: { value: userId } },
            ],
          });
        } catch (error) {
          this.logger.warn(`[SuperAgentMemory] Failed to delete from Qdrant:`, error);
        }
      }

      this.logger.log(
        `[SuperAgentMemory] Deleted all memories for user ${userId} in workspace ${workspaceId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to delete user memories:`, error);
      return false;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Update access statistics for a memory
   */
  private async updateAccessStats(memoryId: string): Promise<void> {
    try {
      const record = await this.db.findOne('agent_memory', { id: memoryId });
      if (record) {
        await this.db.update(
          'agent_memory',
          { id: memoryId },
          {
            access_count: (record.access_count || 0) + 1,
            last_accessed_at: new Date().toISOString(),
          },
        );
      }
    } catch (error) {
      // Silent fail - stats are not critical
    }
  }

  /**
   * Map database record to search result DTO
   */
  private mapToSearchResult(record: AgentMemoryRecord, score: number): MemorySearchResultDto {
    return {
      id: record.id,
      score,
      memoryType: record.memory_type as MemoryType,
      content: record.content,
      summary: record.summary,
      contextType: record.context_type as ContextType,
      contextId: record.context_id,
      importance: record.importance,
      tags: record.tags || [],
      createdAt: new Date(record.created_at),
      lastAccessedAt: record.last_accessed_at ? new Date(record.last_accessed_at) : undefined,
    };
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

  // ============================================
  // Preference Learning Helpers
  // ============================================

  /**
   * Learn preference from user action
   */
  async learnFromAction(
    workspaceId: string,
    userId: string,
    action: string,
    data: Record<string, any>,
    memoryId?: string,
  ): Promise<void> {
    try {
      // Extract learnable patterns
      switch (action) {
        case 'create_task':
          if (data.priority) {
            await this.storePreference({
              workspaceId,
              userId,
              preferenceKey: 'default_task_priority',
              preferenceValue: data.priority,
              confidence: 0.3,
              learnedFrom: memoryId ? [memoryId] : [],
            });
          }
          break;

        case 'schedule_meeting':
          if (data.time) {
            await this.storePreference({
              workspaceId,
              userId,
              preferenceKey: 'preferred_meeting_time',
              preferenceValue: data.time,
              confidence: 0.3,
              learnedFrom: memoryId ? [memoryId] : [],
            });
          }
          break;

        case 'assign_task':
          if (data.assignee) {
            await this.storePreference({
              workspaceId,
              userId,
              preferenceKey: 'frequent_assignee',
              preferenceValue: data.assignee,
              confidence: 0.2,
              learnedFrom: memoryId ? [memoryId] : [],
            });
          }
          break;

        // Add more action handlers as needed
      }
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to learn from action:`, error);
    }
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(
    workspaceId: string,
    userId: string,
  ): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
    byContextType: Record<string, number>;
    preferenceCount: number;
    avgImportance: number;
  }> {
    try {
      const memories = await this.db.findMany(
        'agent_memory',
        {
          workspace_id: workspaceId,
          user_id: userId,
          is_active: true,
        },
        { limit: 1000 },
      );

      const preferences = await this.db.findMany('agent_memory_preferences', {
        workspace_id: workspaceId,
        user_id: userId,
      });

      const memoryList = memories.data || [];
      const prefList = preferences.data || [];

      const byType: Record<string, number> = {};
      const byContextType: Record<string, number> = {};
      let totalImportance = 0;

      for (const mem of memoryList) {
        byType[mem.memory_type] = (byType[mem.memory_type] || 0) + 1;
        if (mem.context_type) {
          byContextType[mem.context_type] = (byContextType[mem.context_type] || 0) + 1;
        }
        totalImportance += mem.importance || 5;
      }

      return {
        totalMemories: memoryList.length,
        byType,
        byContextType,
        preferenceCount: prefList.length,
        avgImportance: memoryList.length > 0 ? totalImportance / memoryList.length : 0,
      };
    } catch (error) {
      this.logger.error(`[SuperAgentMemory] Failed to get stats:`, error);
      return {
        totalMemories: 0,
        byType: {},
        byContextType: {},
        preferenceCount: 0,
        avgImportance: 0,
      };
    }
  }
}
