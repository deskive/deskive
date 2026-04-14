import { Injectable, Logger } from '@nestjs/common';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { ConversationMessage } from '../dto/autopilot.dto';
import { DatabaseService } from '../../database/database.service';

interface ReferencedItem {
  id: string;
  type: 'note' | 'task' | 'event' | 'project' | 'file';
  title: string;
  description?: string;
}

interface SessionMetadata {
  workspaceId: string;
  userId: string;
  createdAt: string;
  referencedItems?: ReferencedItem[];
}

interface SessionData {
  metadata: SessionMetadata;
  messages: ConversationMessage[];
}

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  // In-memory cache for performance (backed by database)
  private sessionCache: Map<string, SessionData> = new Map();

  // Maximum messages to keep per session
  private readonly maxMessagesPerSession = 50;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Load session from database into cache
   */
  private async loadSessionFromDb(sessionId: string): Promise<SessionData | null> {
    try {
      const dbSession = await this.db.findOne('autopilot_sessions', { session_id: sessionId });
      if (dbSession) {
        const sessionData: SessionData = {
          metadata: {
            workspaceId: dbSession.workspace_id,
            userId: dbSession.user_id,
            createdAt: dbSession.created_at,
          },
          messages: dbSession.messages || [],
        };
        this.sessionCache.set(sessionId, sessionData);
        return sessionData;
      }
      return null;
    } catch (error) {
      this.logger.warn(
        `[Memory] Could not load session ${sessionId} from database: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Save session to database
   */
  private async saveSessionToDb(sessionId: string, session: SessionData): Promise<void> {
    try {
      const existingSession = await this.db.findOne('autopilot_sessions', {
        session_id: sessionId,
      });

      const sessionData = {
        session_id: sessionId,
        workspace_id: session.metadata.workspaceId,
        user_id: session.metadata.userId,
        messages: session.messages,
        updated_at: new Date().toISOString(),
      };

      if (existingSession) {
        await this.db.update('autopilot_sessions', existingSession.id, sessionData);
      } else {
        await this.db.insert('autopilot_sessions', {
          ...sessionData,
          created_at: session.metadata.createdAt || new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(
        `[Memory] Failed to save session ${sessionId} to database: ${error.message}`,
      );
    }
  }

  /**
   * Get session (from cache or database)
   */
  private async getSession(sessionId: string): Promise<SessionData | null> {
    // Check cache first
    const session = this.sessionCache.get(sessionId);
    if (session) return session;

    // Load from database
    return this.loadSessionFromDb(sessionId);
  }

  /**
   * Initialize a new session
   */
  async initializeSession(sessionId: string, metadata: SessionMetadata): Promise<void> {
    const session: SessionData = {
      metadata,
      messages: [],
    };
    this.sessionCache.set(sessionId, session);
    await this.saveSessionToDb(sessionId, session);
    this.logger.log(`[Memory] Initialized session: ${sessionId}`);
  }

  /**
   * Add a message to the session
   * @param sessionId - The session identifier
   * @param message - The message to add
   * @param context - Optional context for initializing new sessions (workspaceId, userId)
   */
  async addMessage(
    sessionId: string,
    message: ConversationMessage,
    context?: { workspaceId?: string; userId?: string },
  ): Promise<void> {
    let session = await this.getSession(sessionId);

    if (!session) {
      // Auto-create session if it doesn't exist - use context if provided
      session = {
        metadata: {
          workspaceId: context?.workspaceId || '',
          userId: context?.userId || '',
          createdAt: new Date().toISOString(),
        },
        messages: [],
      };
      this.sessionCache.set(sessionId, session);
      this.logger.log(
        `[Memory] Auto-created new session: ${sessionId} for workspace: ${context?.workspaceId}, user: ${context?.userId}`,
      );
    }

    session.messages.push(message);

    // Trim old messages if exceeding limit
    if (session.messages.length > this.maxMessagesPerSession) {
      session.messages = session.messages.slice(-this.maxMessagesPerSession);
    }

    // Update cache and persist to database
    this.sessionCache.set(sessionId, session);
    await this.saveSessionToDb(sessionId, session);

    this.logger.debug(`[Memory] Added ${message.role} message to session ${sessionId}`);
  }

  /**
   * Get conversation history for a session
   */
  async getHistory(sessionId: string, limit?: number): Promise<ConversationMessage[]> {
    const session = await this.getSession(sessionId);
    if (!session) return [];

    const messages = session.messages;
    if (limit && limit > 0) {
      return messages.slice(-limit);
    }
    return messages;
  }

  /**
   * Get chat history in LangChain message format
   */
  async getChatHistory(sessionId: string): Promise<BaseMessage[]> {
    const history = await this.getHistory(sessionId);

    return history.map((msg) => {
      switch (msg.role) {
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        case 'system':
          return new SystemMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  /**
   * Clear a session's memory
   */
  async clearSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.messages = [];
      this.sessionCache.set(sessionId, session);
      await this.saveSessionToDb(sessionId, session);
      this.logger.log(`[Memory] Cleared session: ${sessionId}`);
    }
  }

  /**
   * Delete a session entirely
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessionCache.delete(sessionId);
    try {
      const dbSession = await this.db.findOne('autopilot_sessions', { session_id: sessionId });
      if (dbSession) {
        await this.db.delete('autopilot_sessions', dbSession.id);
      }
    } catch (error) {
      this.logger.warn(
        `[Memory] Failed to delete session ${sessionId} from database: ${error.message}`,
      );
    }
    this.logger.log(`[Memory] Deleted session: ${sessionId}`);
  }

  /**
   * Get session metadata
   */
  async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
    const session = await this.getSession(sessionId);
    return session?.metadata || null;
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(sessionId: string, updates: Partial<SessionMetadata>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...updates };
      this.sessionCache.set(sessionId, session);
      await this.saveSessionToDb(sessionId, session);
    }
  }

  /**
   * Add referenced items to a session (merges with existing, avoiding duplicates)
   */
  async addReferencedItems(sessionId: string, newItems: ReferencedItem[]): Promise<void> {
    if (!newItems || newItems.length === 0) return;

    const session = await this.getSession(sessionId);
    if (session) {
      const existingItems = session.metadata.referencedItems || [];
      // Merge and deduplicate by id+type
      const mergedItems = [...existingItems];
      for (const newItem of newItems) {
        const exists = mergedItems.some(
          (item) => item.id === newItem.id && item.type === newItem.type,
        );
        if (!exists) {
          mergedItems.push(newItem);
        }
      }
      session.metadata.referencedItems = mergedItems;
      this.sessionCache.set(sessionId, session);
      await this.saveSessionToDb(sessionId, session);
      this.logger.debug(
        `[Memory] Updated referenced items for session ${sessionId}: ${mergedItems.length} items`,
      );
    }
  }

  /**
   * Get all referenced items from a session
   */
  async getReferencedItems(sessionId: string): Promise<ReferencedItem[]> {
    const session = await this.getSession(sessionId);
    return session?.metadata?.referencedItems || [];
  }

  /**
   * Clear referenced items from a session
   */
  async clearReferencedItems(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.metadata.referencedItems = [];
      this.sessionCache.set(sessionId, session);
      await this.saveSessionToDb(sessionId, session);
    }
  }

  /**
   * Get summary of conversation for context window management
   */
  async getConversationSummary(sessionId: string): Promise<string> {
    const history = await this.getHistory(sessionId, 10);

    if (history.length === 0) return '';

    const summary = history
      .map((msg) => {
        const role = msg.role === 'user' ? 'User' : 'AutoPilot';
        const content = msg.content.substring(0, 100);
        return `${role}: ${content}${msg.content.length > 100 ? '...' : ''}`;
      })
      .join('\n');

    return `Recent conversation:\n${summary}`;
  }

  /**
   * Check if session exists (in cache or database)
   */
  async hasSession(sessionId: string): Promise<boolean> {
    if (this.sessionCache.has(sessionId)) return true;
    const session = await this.loadSessionFromDb(sessionId);
    return session !== null;
  }

  /**
   * Get all active session IDs (for monitoring/debugging)
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessionCache.keys());
  }

  /**
   * Get or create a session for a user in a workspace
   * This ensures the user always continues their existing conversation
   */
  async getOrCreateSession(workspaceId: string, userId: string): Promise<string> {
    try {
      // Look for existing active session for this user in this workspace
      const existingSession = await this.db.findOne('autopilot_sessions', {
        workspace_id: workspaceId,
        user_id: userId,
      });

      if (existingSession) {
        // Load into cache and return existing session ID
        await this.loadSessionFromDb(existingSession.session_id);
        this.logger.log(`[Memory] Resuming existing session: ${existingSession.session_id}`);
        return existingSession.session_id;
      }

      // Create new session if none exists
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await this.initializeSession(newSessionId, {
        workspaceId,
        userId,
        createdAt: new Date().toISOString(),
      });
      this.logger.log(`[Memory] Created new session: ${newSessionId}`);
      return newSessionId;
    } catch (error) {
      this.logger.error(`[Memory] Error in getOrCreateSession: ${error.message}`);
      // Fallback to new session if database fails
      const fallbackSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await this.initializeSession(fallbackSessionId, {
        workspaceId,
        userId,
        createdAt: new Date().toISOString(),
      });
      return fallbackSessionId;
    }
  }

  /**
   * Get all sessions for a user in a workspace
   * Returns sessions sorted by updated_at (most recent first)
   */
  async getUserSessions(
    workspaceId: string,
    userId: string,
    limit: number = 20,
  ): Promise<
    {
      id: string;
      sessionId: string;
      title: string;
      messageCount: number;
      createdAt: string;
      updatedAt: string;
    }[]
  > {
    try {
      const sessions = await this.db
        .table('autopilot_sessions')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      const sessionList = (sessions.data || [])
        .map((session: any) => {
          const messages = session.messages || [];
          // Get title from first user message or default
          const firstUserMessage = messages.find((m: any) => m.role === 'user');
          const title = firstUserMessage
            ? firstUserMessage.content.substring(0, 50) +
              (firstUserMessage.content.length > 50 ? '...' : '')
            : 'New conversation';

          return {
            id: session.id,
            sessionId: session.session_id,
            title,
            messageCount: messages.length,
            createdAt: session.created_at,
            updatedAt: session.updated_at || session.created_at,
          };
        })
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, limit);

      return sessionList;
    } catch (error) {
      this.logger.error(`[Memory] Failed to get user sessions: ${error.message}`);
      return [];
    }
  }

  /**
   * Cleanup old sessions (call periodically)
   */
  async cleanupOldSessions(maxAgeHours: number = 24): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    // Cleanup from cache
    for (const [sessionId, session] of this.sessionCache) {
      const createdAt = new Date(session.metadata.createdAt);
      const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (ageHours > maxAgeHours) {
        this.sessionCache.delete(sessionId);
        cleaned++;
      }
    }

    // Note: Database cleanup should be done via a separate scheduled job
    // to avoid blocking the main application

    if (cleaned > 0) {
      this.logger.log(`[Memory] Cleaned up ${cleaned} old sessions from cache`);
    }

    return cleaned;
  }
}
