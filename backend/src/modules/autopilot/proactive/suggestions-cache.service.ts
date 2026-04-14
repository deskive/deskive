import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';

interface CacheEntry {
  data: any[];
  expiresAt: Date;
  generatedAt: Date;
}

@Injectable()
export class SuggestionsCacheService {
  private readonly logger = new Logger(SuggestionsCacheService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_HOURS = 4;

  constructor(private readonly db: DatabaseService) {}

  /**
   * Refresh suggestions cache for active users every 4 hours
   */
  @Cron(CronExpression.EVERY_4_HOURS, { name: 'refresh-suggestions-cache' })
  async refreshCache(): Promise<void> {
    this.logger.log('[SuggestionsCache] Starting scheduled cache refresh...');

    try {
      // Get users active in last 24 hours
      const activeUsers = await this.getActiveUsers();
      this.logger.log(`[SuggestionsCache] Found ${activeUsers.length} active users to refresh`);

      let refreshed = 0;
      let errors = 0;

      for (const user of activeUsers) {
        try {
          await this.generateAndCacheSuggestions(user.userId, user.workspaceId);
          refreshed++;
        } catch (error) {
          this.logger.error(
            `[SuggestionsCache] Error refreshing for user ${user.userId}: ${error.message}`,
          );
          errors++;
        }
      }

      this.logger.log(
        `[SuggestionsCache] Refresh complete: ${refreshed} successful, ${errors} errors`,
      );
    } catch (error) {
      this.logger.error(`[SuggestionsCache] Refresh job failed: ${error.message}`);
    }
  }

  /**
   * Get cached suggestions or generate fresh ones
   */
  async getCachedSuggestions(userId: string, workspaceId: string): Promise<any[]> {
    const cacheKey = `${userId}:${workspaceId}`;

    // Check memory cache first
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      this.logger.log(`[SuggestionsCache] Memory cache hit for ${cacheKey}`);
      return cached.data;
    }

    // Check database cache
    try {
      const result = await this.db
        .table('autopilot_suggestions_cache')
        .select('*')
        .where('user_id', '=', userId)
        .where('workspace_id', '=', workspaceId)
        .execute();

      const dbCache = Array.isArray(result) ? result : [];
      if (dbCache.length > 0) {
        const entry = dbCache[0];
        if (new Date(entry.expires_at) > new Date()) {
          this.logger.log(`[SuggestionsCache] Database cache hit for ${cacheKey}`);
          // Store in memory cache
          this.cache.set(cacheKey, {
            data: entry.suggestions,
            expiresAt: new Date(entry.expires_at),
            generatedAt: new Date(entry.generated_at),
          });
          return entry.suggestions;
        }
      }
    } catch (error) {
      this.logger.warn(`[SuggestionsCache] Database cache lookup failed: ${error.message}`);
    }

    // Generate fresh suggestions
    this.logger.log(`[SuggestionsCache] Cache miss for ${cacheKey}, generating fresh suggestions`);
    return this.generateAndCacheSuggestions(userId, workspaceId);
  }

  /**
   * Generate fresh suggestions and cache them
   */
  async generateAndCacheSuggestions(userId: string, workspaceId: string): Promise<any[]> {
    const cacheKey = `${userId}:${workspaceId}`;

    try {
      // Generate basic suggestions based on context
      const suggestions = await this.generateBasicSuggestions(userId, workspaceId);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.CACHE_TTL_HOURS * 60 * 60 * 1000);

      // Store in memory cache
      this.cache.set(cacheKey, {
        data: suggestions,
        expiresAt,
        generatedAt: now,
      });

      // Store in database cache (upsert)
      try {
        const result = await this.db
          .table('autopilot_suggestions_cache')
          .select('id')
          .where('user_id', '=', userId)
          .where('workspace_id', '=', workspaceId)
          .execute();

        const existing = Array.isArray(result) ? result : [];
        if (existing.length > 0) {
          await this.db
            .table('autopilot_suggestions_cache')
            .update({
              suggestions: JSON.stringify(suggestions),
              generated_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .where('id', '=', existing[0].id)
            .execute();
        } else {
          await this.db.insert('autopilot_suggestions_cache', {
            user_id: userId,
            workspace_id: workspaceId,
            suggestions: JSON.stringify(suggestions),
            generated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });
        }
      } catch (dbError) {
        this.logger.warn(
          `[SuggestionsCache] Failed to persist cache to database: ${dbError.message}`,
        );
      }

      return suggestions;
    } catch (error) {
      this.logger.error(`[SuggestionsCache] Failed to generate suggestions: ${error.message}`);
      return [];
    }
  }

  /**
   * Invalidate cache for a user/workspace
   */
  async invalidateCache(userId: string, workspaceId: string): Promise<void> {
    const cacheKey = `${userId}:${workspaceId}`;
    this.cache.delete(cacheKey);

    try {
      await this.db
        .table('autopilot_suggestions_cache')
        .delete()
        .where('user_id', '=', userId)
        .where('workspace_id', '=', workspaceId)
        .execute();
    } catch (error) {
      this.logger.warn(`[SuggestionsCache] Failed to invalidate database cache: ${error.message}`);
    }
  }

  /**
   * Get users active in the last 24 hours
   */
  private async getActiveUsers(): Promise<Array<{ userId: string; workspaceId: string }>> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get recent activity from workspace_members
      const result = await this.db
        .table('workspace_members')
        .select('user_id', 'workspace_id')
        .where('updated_at', '>=', oneDayAgo)
        .execute();

      const activeMembers = Array.isArray(result) ? result : [];
      if (activeMembers.length === 0) {
        // Fallback: get all workspace members
        const allResult = await this.db
          .table('workspace_members')
          .select('user_id', 'workspace_id')
          .execute();

        const allMembers = Array.isArray(allResult) ? allResult : [];
        return allMembers.map((m: any) => ({
          userId: m.user_id,
          workspaceId: m.workspace_id,
        }));
      }

      return activeMembers.map((m: any) => ({
        userId: m.user_id,
        workspaceId: m.workspace_id,
      }));
    } catch (error) {
      this.logger.error(`[SuggestionsCache] Failed to get active users: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear expired entries from memory cache
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'cleanup-expired-cache' })
  cleanupExpiredCache(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`[SuggestionsCache] Cleaned ${cleaned} expired entries from memory cache`);
    }
  }

  /**
   * Generate basic suggestions based on user context
   */
  private async generateBasicSuggestions(userId: string, workspaceId: string): Promise<any[]> {
    const suggestions: any[] = [];
    const now = new Date();

    try {
      // Get overdue tasks
      const overdueResult = await this.db
        .table('tasks')
        .select('id', 'title', 'due_date', 'priority')
        .where('workspace_id', '=', workspaceId)
        .where('due_date', '<', now.toISOString())
        .where('status', '!=', 'done')
        .where('is_deleted', '=', false)
        .execute();

      const overdueTasks = Array.isArray(overdueResult) ? overdueResult : [];
      if (overdueTasks.length > 0) {
        suggestions.push({
          type: 'action',
          action: `Review ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          priority: 'high',
          reason: 'You have tasks past their due date',
        });
      }

      // Get tasks due today
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const todayResult = await this.db
        .table('tasks')
        .select('id', 'title')
        .where('workspace_id', '=', workspaceId)
        .where('due_date', '>=', now.toISOString())
        .where('due_date', '<=', todayEnd.toISOString())
        .where('status', '!=', 'done')
        .where('is_deleted', '=', false)
        .execute();

      const todayTasks = Array.isArray(todayResult) ? todayResult : [];
      if (todayTasks.length > 0) {
        suggestions.push({
          type: 'action',
          action: `Complete ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} due today`,
          priority: 'medium',
          reason: 'These tasks are due by end of day',
        });
      }

      // Get events today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const eventsResult = await this.db
        .table('calendar_events')
        .select('id', 'title', 'start_time')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', todayStart.toISOString())
        .where('start_time', '<=', todayEnd.toISOString())
        .execute();

      const todayEvents = Array.isArray(eventsResult) ? eventsResult : [];
      if (todayEvents.length > 0) {
        suggestions.push({
          type: 'info',
          action: `You have ${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today`,
          priority: 'low',
          reason: 'Check your calendar for the day',
        });
      }
    } catch (error) {
      this.logger.warn(`[SuggestionsCache] Error generating basic suggestions: ${error.message}`);
    }

    return suggestions;
  }
}
