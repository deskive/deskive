import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateActivityEventDto, EventsQueryDto, ActivityFeedQueryDto, EventType, EventPriority } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventsService {
  constructor(private readonly db: DatabaseService) {}

  async createEvent(workspaceId: string, createEventDto: CreateActivityEventDto, userId: string) {
    const eventData = {
      id: uuidv4(),
      workspace_id: workspaceId,
      user_id: userId,
      event_type: createEventDto.eventType,
      title: createEventDto.title,
      description: createEventDto.description,
      priority: createEventDto.priority || EventPriority.NORMAL,
      metadata: createEventDto.metadata ? JSON.stringify(createEventDto.metadata) : null,
      entity_id: createEventDto.entityId,
      entity_type: createEventDto.entityType,
      tags: createEventDto.tags ? JSON.stringify(createEventDto.tags) : null,
      expires_at: createEventDto.expiresAt,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    const event = await this.db.insert('events', eventData);

    // Also create activity log entry
    await this.createActivityLog(workspaceId, userId, createEventDto);

    return {
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      tags: event.tags ? JSON.parse(event.tags) : null,
    };
  }

  async findEvents(workspaceId: string, query: EventsQueryDto, userId: string) {
    // Build the base query
    let eventsQuery = this.db.table('events')
      .select('*')
      .where('workspace_id', '=', workspaceId);

    // Apply filters
    if (query.eventTypes && query.eventTypes.length > 0) {
      // Use whereIn for multiple values instead of OR conditions
      eventsQuery = eventsQuery.whereIn('event_type', query.eventTypes);
    }

    if (query.priorities && query.priorities.length > 0) {
      // Use whereIn for multiple values instead of OR conditions
      eventsQuery = eventsQuery.whereIn('priority', query.priorities);
    }

    if (query.startDate) {
      eventsQuery = eventsQuery.where('created_at', '>=', query.startDate);
    }

    if (query.endDate) {
      eventsQuery = eventsQuery.where('created_at', '<=', query.endDate);
    }

    if (query.entityId) {
      eventsQuery = eventsQuery.where('entity_id', '=', query.entityId);
    }

    if (query.entityType) {
      eventsQuery = eventsQuery.where('entity_type', '=', query.entityType);
    }

    if (query.userId) {
      eventsQuery = eventsQuery.where('user_id', '=', query.userId);
    }

    if (query.search) {
      // For OR conditions in database, we need to use a different approach
      // We'll need to handle this at the database level or use multiple queries
      // For now, we'll search in title first, then description if needed
      eventsQuery = eventsQuery.where('title', 'ilike', `%${query.search}%`);
      // Note: This is a limitation - we can't easily do OR conditions with database
      // Consider using the search() method or creating a database view
    }

    if (query.unreadOnly) {
      eventsQuery = eventsQuery.where('is_read', '=', false);
    }

    if (query.tags && query.tags.length > 0) {
      // Filter by tags - this would need proper JSON querying in production
      for (const tag of query.tags) {
        eventsQuery = eventsQuery.where('tags', 'ilike', `%${tag}%`);
      }
    }

    // Get total count for pagination
    const totalCount = await eventsQuery.count();

    // Get paginated results
    const eventsResult = await eventsQuery
      .orderBy('created_at', query.sortOrder || 'desc')
      .limit(query.limit || 50)
      .offset(query.offset || 0)
      .execute();

    const events = eventsResult.data || [];

    // Parse JSON fields
    const processedEvents = events.map(event => ({
      ...event,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      tags: event.tags ? JSON.parse(event.tags) : null,
    }));

    // Get event type distribution
    const distributionResult = await this.db.table('events')
      .select('event_type')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .where('created_at', '<=', query.endDate || new Date().toISOString())
      .groupBy('event_type')
      .execute();

    const distribution = distributionResult.data || [];
    const distributionCounts = await Promise.all(
      distribution.map(async (item) => {
        const count = await this.db.table('events')
          .where('workspace_id', '=', workspaceId)
          .where('event_type', '=', item.event_type)
          .where('created_at', '>=', query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .where('created_at', '<=', query.endDate || new Date().toISOString())
          .count();
        return { ...item, count };
      })
    );

    return {
      events: processedEvents,
      pagination: {
        total: totalCount,
        limit: query.limit || 50,
        offset: query.offset || 0,
        pages: Math.ceil(totalCount / (query.limit || 50)),
      },
      distribution: {
        eventTypes: distributionCounts.reduce((acc, item) => {
          acc[item.event_type] = parseInt(item.count as string);
          return acc;
        }, {}),
      },
      summary: {
        totalEvents: totalCount,
        unreadEvents: await this.getUnreadCount(workspaceId, userId),
      },
    };
  }

  async getActivityFeed(workspaceId: string, query: ActivityFeedQueryDto, userId: string) {
    // Build query for activity logs
    let activityQuery = this.db.table('activity_logs')
      .select('*')
      .where('workspace_id', '=', workspaceId);

    // Apply filters
    if (query.activityTypes && query.activityTypes.length > 0) {
      // Use whereIn for multiple values instead of OR conditions
      activityQuery = activityQuery.whereIn('action', query.activityTypes);
    }

    if (query.userIds && query.userIds.length > 0) {
      // Use whereIn for multiple values instead of OR conditions
      activityQuery = activityQuery.whereIn('user_id', query.userIds);
    }

    if (query.startDate) {
      activityQuery = activityQuery.where('created_at', '>=', query.startDate);
    }

    if (query.endDate) {
      activityQuery = activityQuery.where('created_at', '<=', query.endDate);
    }

    // Get total count
    const totalCount = await activityQuery.count();

    // Get paginated results
    const activitiesResult = await activityQuery
      .orderBy('created_at', 'desc')
      .limit(query.limit || 20)
      .offset(query.offset || 0)
      .execute();

    const activities = activitiesResult.data || [];

    // Enrich activities with user information
    const userIds = [...new Set(activities.map(activity => activity.user_id))];
    let usersResult;
    if (userIds.length > 0) {
      // Use whereIn for multiple user IDs
      usersResult = await this.db.table('users')
        .select('id', 'name', 'email', 'avatar_url')
        .whereIn('id', userIds)
        .execute();
    } else {
      usersResult = { data: [] };
    }

    const users = usersResult.data || [];
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    // Process activities with user information
    const processedActivities = activities.map(activity => ({
      ...activity,
      user: userMap[activity.user_id] || null,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
    }));

    // Get activity statistics
    const stats = await this.getActivityStats(workspaceId, query.startDate, query.endDate);

    return {
      activities: processedActivities,
      pagination: {
        total: totalCount,
        limit: query.limit || 20,
        offset: query.offset || 0,
        pages: Math.ceil(totalCount / (query.limit || 20)),
      },
      stats,
    };
  }

  async markEventAsRead(workspaceId: string, eventId: string, userId: string) {
    // Verify event exists in workspace
    const eventResult = await this.db.table('events')
      .select('*')
      .where('id', '=', eventId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    const events = eventResult.data || [];
    if (events.length === 0) {
      throw new NotFoundException('Event not found');
    }

    // Mark as read
    await this.db.table('events')
      .where('id', '=', eventId)
      .update({ is_read: true, read_at: new Date().toISOString() });

    return { success: true, message: 'Event marked as read' };
  }

  async markAllEventsAsRead(workspaceId: string, userId: string) {
    await this.db.table('events')
      .where('workspace_id', '=', workspaceId)
      .where('is_read', '=', false)
      .update({ is_read: true, read_at: new Date().toISOString() });

    return { success: true, message: 'All events marked as read' };
  }

  async deleteExpiredEvents(workspaceId: string) {
    const now = new Date().toISOString();
    
    const result = await this.db.table('events')
      .where('workspace_id', '=', workspaceId)
      .where('expires_at', '<', now)
      .delete();

    return { deletedCount: result.count || 0 };
  }

  private async createActivityLog(workspaceId: string, userId: string, eventDto: CreateActivityEventDto) {
    const activityData = {
      workspace_id: workspaceId,
      user_id: userId,
      action: eventDto.eventType,
      entity_id: eventDto.entityId,
      entity_type: eventDto.entityType,
      description: eventDto.description || eventDto.title,
      metadata: eventDto.metadata ? JSON.stringify({
        ...JSON.parse(eventDto.metadata),
        priority: eventDto.priority,
        tags: eventDto.tags,
      }) : JSON.stringify({
        priority: eventDto.priority,
        tags: eventDto.tags,
      }),
      created_at: new Date().toISOString(),
    };

    return this.db.insert('activity_logs', activityData);
  }

  private async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    const result = await this.db.table('events')
      .where('workspace_id', '=', workspaceId)
      .where('is_read', '=', false)
      .count();

    return result || 0;
  }

  private async getActivityStats(workspaceId: string, startDate?: string, endDate?: string) {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    // Get activity type distribution
    const typeDistributionResult = await this.db.table('activity_logs')
      .select('action')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .groupBy('action')
      .execute();

    const typeDistribution = typeDistributionResult.data || [];
    const typeDistributionCounts = await Promise.all(
      typeDistribution.map(async (item) => {
        const count = await this.db.table('activity_logs')
          .where('workspace_id', '=', workspaceId)
          .where('action', '=', item.action)
          .where('created_at', '>=', start)
          .where('created_at', '<=', end)
          .count();
        return { ...item, count };
      })
    );

    // Get daily activity counts
    const dailyActivityResult = await this.db.table('activity_logs')
      .select('created_at')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .execute();

    const dailyActivities = dailyActivityResult.data || [];

    // Group by day
    const dailyStats = dailyActivities.reduce((acc, activity) => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Get top active users
    const userActivityResult = await this.db.table('activity_logs')
      .select('user_id')
      .where('workspace_id', '=', workspaceId)
      .where('created_at', '>=', start)
      .where('created_at', '<=', end)
      .groupBy('user_id')
      .execute();

    const userActivityData = userActivityResult.data || [];
    const userActivityCounts = await Promise.all(
      userActivityData.map(async (item) => {
        const count = await this.db.table('activity_logs')
          .where('workspace_id', '=', workspaceId)
          .where('user_id', '=', item.user_id)
          .where('created_at', '>=', start)
          .where('created_at', '<=', end)
          .count();
        return { ...item, count };
      })
    );

    const topUsers = userActivityCounts
      .sort((a, b) => parseInt(b.count as string) - parseInt(a.count as string))
      .slice(0, 5);

    return {
      totalActivities: dailyActivities.length,
      typeDistribution: typeDistributionCounts.reduce((acc, item) => {
        acc[item.action] = parseInt(item.count as string);
        return acc;
      }, {}),
      dailyStats: Object.entries(dailyStats).map(([date, count]) => ({
        date,
        count,
      })),
      topActiveUsers: topUsers.map(user => ({
        userId: user.user_id,
        activityCount: parseInt(user.count as string),
      })),
    };
  }

  // Helper method to create system events
  async createSystemEvent(
    workspaceId: string,
    eventType: EventType,
    title: string,
    description?: string,
    metadata?: any,
  ) {
    return this.createEvent(
      workspaceId,
      {
        eventType,
        title,
        description,
        priority: EventPriority.NORMAL,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        entityType: 'system',
      },
      'system', // System user ID
    );
  }
}