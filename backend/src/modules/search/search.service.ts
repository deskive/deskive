import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SearchQueryDto } from './dto';

interface SearchFilters {
  author?: string;
  date_from?: string;
  date_to?: string;
  tags?: string;
  project_id?: string;
  semantic?: boolean;
}

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) { }

  async universalSearch(workspaceId: string, searchParams: SearchQueryDto, userId: string) {
    const { query, types = ['notes', 'files', 'folders', 'messages', 'tasks', 'projects', 'events', 'videos'], page = 1, limit = 20, ...filters } = searchParams;

    console.log('[Search] Starting search with:', { query, types, page, limit, workspaceId, userId: userId?.substring(0, 8) });

    // Validate query - must have a search term
    if (!query || query.trim().length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        query: '',
        types,
        has_more: false
      };
    }

    const offset = (page - 1) * limit;
    const results: any[] = [];

    // Search in different content types in parallel using allSettled to prevent one failure from breaking all
    const searchPromises = types.map(type => this.searchInContentType(type, workspaceId, query, filters, userId));
    const searchResults = await Promise.allSettled(searchPromises);

    // Combine and flatten results
    searchResults.forEach((result, index) => {
      const contentType = types[index];
      // Only process fulfilled promises
      if (result.status === 'fulfilled') {
        const typeResults = result.value;
        console.log(`[Search] Type '${contentType}' returned ${typeResults.length} results`);
        typeResults.forEach((item: any) => {
          results.push({
            ...item,
            content_type: contentType,
            relevance_score: this.calculateRelevanceScore(item, query, contentType)
          });
        });
      } else {
        console.error(`[Search] Search failed for type ${contentType}:`, result.reason);
      }
    });

    console.log(`[Search] Total combined results: ${results.length}, after relevance filter: ${results.filter(r => r.relevance_score > 0).length}`);

    // Filter out results with zero relevance score (no actual match)
    const filteredResults = results.filter(r => r.relevance_score > 0);

    // Sort by relevance
    filteredResults.sort((a, b) => b.relevance_score - a.relevance_score);

    // Apply pagination
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    // Save search to history (async, don't wait)
    this.saveSearchHistory(workspaceId, userId, query, filteredResults.length, types, filters);

    return {
      data: paginatedResults,
      total: filteredResults.length,
      page,
      limit,
      query,
      types,
      has_more: filteredResults.length > offset + limit
    };
  }

  private async searchInContentType(type: string, workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    const searchTerm = query.toLowerCase();

    try {
      switch (type) {
        case 'notes':
          return await this.searchNotes(workspaceId, searchTerm, filters, userId);
        case 'files':
          return await this.searchFiles(workspaceId, searchTerm, filters, userId);
        case 'folders':
          return await this.searchFolders(workspaceId, searchTerm, filters, userId);
        case 'messages':
          return await this.searchMessages(workspaceId, searchTerm, filters, userId);
        case 'tasks':
          return await this.searchTasks(workspaceId, searchTerm, filters, userId);
        case 'projects':
          return await this.searchProjects(workspaceId, searchTerm, filters, userId);
        case 'events':
          return await this.searchEvents(workspaceId, searchTerm, filters, userId);
        case 'videos':
          return await this.searchVideos(workspaceId, searchTerm, filters, userId);
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error searching ${type}:`, error);
      return [];
    }
  }

  private async searchNotes(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('notes')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .where('deleted_at', 'IS', null);

        // IMPORTANT: Only show notes created by user OR public notes
        // Note: database doesn't support nested where, so we filter in code later

        if (filters.author) {
          q = q.where('created_by', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('created_at', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('created_at', '<=', filters.date_to);
        }
        return q;
      };

      // Search in title
      const titleResults = await buildBaseQuery().where('title', 'ILIKE', searchPattern).execute();

      // Search in content_text
      const contentResults = await buildBaseQuery().where('content_text', 'ILIKE', searchPattern).execute();

      // Extract data from database response format { data: [...], count: n }
      const titleData = titleResults?.data || (Array.isArray(titleResults) ? titleResults : []);
      const contentData = contentResults?.data || (Array.isArray(contentResults) ? contentResults : []);

      // Combine and deduplicate results
      const resultsMap = new Map();
      const allResults = [...titleData, ...contentData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          resultsMap.set(item.id, item);
        }
      });

      // Filter: Only show notes created by user OR public notes
      const filteredResults = Array.from(resultsMap.values()).filter(note =>
        note.created_by === userId || note.is_public === true
      );

      return filteredResults;
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  private async searchFiles(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('files')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .where('is_deleted', '=', false);

        // IMPORTANT: Only show files uploaded by current user
        q = q.where('uploaded_by', '=', userId);

        if (filters.author) {
          q = q.where('uploaded_by', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('created_at', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('created_at', '<=', filters.date_to);
        }
        return q;
      };

      // Search in name
      const nameResults = await buildBaseQuery().where('name', 'ILIKE', searchPattern).execute();

      // Search in extracted_text
      const textResults = await buildBaseQuery().where('extracted_text', 'ILIKE', searchPattern).execute();

      // Extract data from database response format
      const nameData = nameResults?.data || (Array.isArray(nameResults) ? nameResults : []);
      const textData = textResults?.data || (Array.isArray(textResults) ? textResults : []);

      // Combine and deduplicate
      const resultsMap = new Map();
      const allResults = [...nameData, ...textData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          resultsMap.set(item.id, item);
        }
      });

      return Array.from(resultsMap.values());
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  private async searchFolders(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;
      let queryBuilder = this.db.table('folders')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_deleted', '=', false)
        .where('name', 'ILIKE', searchPattern);

      // IMPORTANT: Only show folders created by current user
      queryBuilder = queryBuilder.where('created_by', '=', userId);

      // Apply filters
      if (filters.author) {
        queryBuilder = queryBuilder.where('created_by', '=', filters.author);
      }
      if (filters.date_from) {
        queryBuilder = queryBuilder.where('created_at', '>=', filters.date_from);
      }
      if (filters.date_to) {
        queryBuilder = queryBuilder.where('created_at', '<=', filters.date_to);
      }

      const result = await queryBuilder.execute();
      return result?.data || (Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error searching folders:', error);
      return [];
    }
  }

  private async searchMessages(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Get channels where user is a member
      const memberChannelsResult = await this.db.table('channel_members')
        .select('channel_id')
        .where('user_id', '=', userId)
        .execute();

      const memberData = memberChannelsResult?.data || (Array.isArray(memberChannelsResult) ? memberChannelsResult : []);
      const channelIds = memberData.map((m: any) => m.channel_id);

      if (channelIds.length === 0) return [];

      // Get channel details for name lookup
      const channelsResult = await this.db.table('channels')
        .select('id', 'name', 'type', 'is_private')
        .whereIn('id', channelIds)
        .execute();

      const channelsData = channelsResult?.data || (Array.isArray(channelsResult) ? channelsResult : []);
      const channelMap = new Map();
      channelsData.forEach((channel: any) => {
        channelMap.set(channel.id, channel);
      });

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('messages')
          .select('*')
          .where('is_deleted', '=', false)
          .whereIn('channel_id', channelIds);

        if (filters.author) {
          q = q.where('user_id', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('created_at', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('created_at', '<=', filters.date_to);
        }
        return q;
      };

      // Search in content
      const contentResults = await buildBaseQuery().where('content', 'ILIKE', searchPattern).execute();

      // Search in content_html
      const htmlResults = await buildBaseQuery().where('content_html', 'ILIKE', searchPattern).execute();

      // Extract data from database response format
      const contentData = contentResults?.data || (Array.isArray(contentResults) ? contentResults : []);
      const htmlData = htmlResults?.data || (Array.isArray(htmlResults) ? htmlResults : []);

      // Combine and deduplicate
      const resultsMap = new Map();
      const allResults = [...contentData, ...htmlData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          // Enrich message with channel info
          const channel = channelMap.get(item.channel_id);
          const enrichedItem = {
            ...item,
            channel_name: channel?.name || 'Chat',
            channel_type: channel?.type || 'channel',
            is_private_channel: channel?.is_private || false,
          };
          resultsMap.set(item.id, enrichedItem);
        }
      });

      return Array.from(resultsMap.values());
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  private async searchTasks(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Get projects where user is a member or owner
      const userProjectMembershipsResult = await this.db.table('project_members')
        .select('project_id')
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const membershipData = userProjectMembershipsResult?.data || (Array.isArray(userProjectMembershipsResult) ? userProjectMembershipsResult : []);
      const memberProjectIds = membershipData.map((m: any) => m.project_id);

      // Get projects where user is owner
      const ownedProjectsResult = await this.db.table('projects')
        .select('id')
        .where('workspace_id', '=', workspaceId)
        .where('owner_id', '=', userId)
        .execute();

      const ownedProjectsData = ownedProjectsResult?.data || (Array.isArray(ownedProjectsResult) ? ownedProjectsResult : []);
      const ownedProjectIds = ownedProjectsData.map((p: any) => p.id);

      // Combine both (projects user owns + projects user is member of)
      const allUserProjectIds = [...new Set([...ownedProjectIds, ...memberProjectIds])];

      if (allUserProjectIds.length === 0) return [];

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('tasks')
          .select('*')
          .whereIn('project_id', allUserProjectIds);

        if (filters.author) {
          q = q.where('assigned_to', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('created_at', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('created_at', '<=', filters.date_to);
        }
        if (filters.project_id) {
          q = q.where('project_id', '=', filters.project_id);
        }
        return q;
      };

      // Search in title
      const titleResults = await buildBaseQuery().where('title', 'ILIKE', searchPattern).execute();

      // Search in description
      const descResults = await buildBaseQuery().where('description', 'ILIKE', searchPattern).execute();

      // Extract data from database response format
      const titleData = titleResults?.data || (Array.isArray(titleResults) ? titleResults : []);
      const descData = descResults?.data || (Array.isArray(descResults) ? descResults : []);

      // Combine and deduplicate
      const resultsMap = new Map();
      const allResults = [...titleData, ...descData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          resultsMap.set(item.id, item);
        }
      });

      return Array.from(resultsMap.values());
    } catch (error) {
      console.error('Error searching tasks:', error);
      return [];
    }
  }

  private async searchProjects(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Get projects where user is a member or owner
      const userProjectMembershipsResult = await this.db.table('project_members')
        .select('project_id')
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      const membershipData = userProjectMembershipsResult?.data || (Array.isArray(userProjectMembershipsResult) ? userProjectMembershipsResult : []);
      const memberProjectIds = membershipData.map((m: any) => m.project_id);

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('projects')
          .select('*')
          .where('workspace_id', '=', workspaceId);

        // IMPORTANT: Only return projects where user is owner OR member
        // Note: Will filter in code after query

        if (filters.author) {
          q = q.where('owner_id', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('created_at', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('created_at', '<=', filters.date_to);
        }
        return q;
      };

      // Search in name
      const nameResults = await buildBaseQuery().where('name', 'ILIKE', searchPattern).execute();

      // Search in description
      const descResults = await buildBaseQuery().where('description', 'ILIKE', searchPattern).execute();

      // Extract data from database response format
      const nameData = nameResults?.data || (Array.isArray(nameResults) ? nameResults : []);
      const descData = descResults?.data || (Array.isArray(descResults) ? descResults : []);

      // Combine and deduplicate
      const resultsMap = new Map();
      const allResults = [...nameData, ...descData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          resultsMap.set(item.id, item);
        }
      });

      // Filter: Only return projects where user is owner OR member
      const filteredResults = Array.from(resultsMap.values()).filter(project =>
        project.owner_id === userId || memberProjectIds.includes(project.id)
      );

      return filteredResults;
    } catch (error) {
      console.error('Error searching projects:', error);
      return [];
    }
  }

  private async searchEvents(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Get events where user is an attendee
      const attendeeEventsResult = await this.db.table('event_attendees')
        .select('event_id')
        .where('user_id', '=', userId)
        .execute();

      const attendeeData = attendeeEventsResult?.data || (Array.isArray(attendeeEventsResult) ? attendeeEventsResult : []);
      const attendeeEventIds = attendeeData.map((a: any) => a.event_id);

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('calendar_events')
          .select('*')
          .where('workspace_id', '=', workspaceId);

        // IMPORTANT: Only show events where user is organizer OR attendee
        // Note: Will filter in code after query

        if (filters.author) {
          q = q.where('organizer_id', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('start_time', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('start_time', '<=', filters.date_to);
        }
        return q;
      };

      // Search in title
      const titleResults = await buildBaseQuery().where('title', 'ILIKE', searchPattern).execute();

      // Search in description
      const descResults = await buildBaseQuery().where('description', 'ILIKE', searchPattern).execute();

      // Search in location
      const locationResults = await buildBaseQuery().where('location', 'ILIKE', searchPattern).execute();

      // Extract data from database response format
      const titleData = titleResults?.data || (Array.isArray(titleResults) ? titleResults : []);
      const descData = descResults?.data || (Array.isArray(descResults) ? descResults : []);
      const locationData = locationResults?.data || (Array.isArray(locationResults) ? locationResults : []);

      // Combine and deduplicate
      const resultsMap = new Map();
      const allResults = [...titleData, ...descData, ...locationData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          resultsMap.set(item.id, item);
        }
      });

      // Filter: Only return events where user is organizer OR attendee
      const filteredResults = Array.from(resultsMap.values()).filter(event =>
        event.organizer_id === userId || attendeeEventIds.includes(event.id)
      );

      return filteredResults;
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  }

  private async searchVideos(workspaceId: string, query: string, filters: SearchFilters, userId: string) {
    try {
      const searchPattern = `%${query}%`;

      // Get video calls where user is a participant
      const participantCallsResult = await this.db.table('video_call_participants')
        .select('video_call_id')
        .where('user_id', '=', userId)
        .execute();

      const participantData = participantCallsResult?.data || (Array.isArray(participantCallsResult) ? participantCallsResult : []);
      const participantCallIds = participantData.map((p: any) => p.video_call_id);

      // Helper to build base query
      const buildBaseQuery = () => {
        let q = this.db.table('video_calls')
          .select('*')
          .where('workspace_id', '=', workspaceId);

        // IMPORTANT: Only show video calls where user is host OR participant
        // Note: Will filter in code after query

        if (filters.author) {
          q = q.where('host_user_id', '=', filters.author);
        }
        if (filters.date_from) {
          q = q.where('scheduled_start_time', '>=', filters.date_from);
        }
        if (filters.date_to) {
          q = q.where('scheduled_start_time', '<=', filters.date_to);
        }
        return q;
      };

      // Search in title
      const titleResults = await buildBaseQuery().where('title', 'ILIKE', searchPattern).execute();

      // Search in description
      const descResults = await buildBaseQuery().where('description', 'ILIKE', searchPattern).execute();

      // Extract data from database response format
      const titleData = titleResults?.data || (Array.isArray(titleResults) ? titleResults : []);
      const descData = descResults?.data || (Array.isArray(descResults) ? descResults : []);

      // Combine and deduplicate
      const resultsMap = new Map();
      const allResults = [...titleData, ...descData];

      allResults.forEach(item => {
        if (!resultsMap.has(item.id)) {
          resultsMap.set(item.id, item);
        }
      });

      // Filter: Only return video calls where user is host OR participant
      const filteredResults = Array.from(resultsMap.values()).filter(videoCall =>
        videoCall.host_user_id === userId || participantCallIds.includes(videoCall.id)
      );

      return filteredResults;
    } catch (error) {
      console.error('Error searching videos:', error);
      return [];
    }
  }

  private calculateRelevanceScore(item: any, query: string, contentType: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    let hasTextMatch = false;

    // Exact title/name match gets highest score
    const title = item.title || item.name || '';
    if (title.toLowerCase() === queryLower) {
      score += 200;
      hasTextMatch = true;
    } else if (title.toLowerCase().startsWith(queryLower)) {
      score += 150;
      hasTextMatch = true;
    } else if (title.toLowerCase().includes(queryLower)) {
      score += 100;
      hasTextMatch = true;
    }

    // Content matches get medium score
    if (item.content && item.content.toLowerCase().includes(queryLower)) {
      score += 50;
      hasTextMatch = true;
    }
    if (item.description && item.description.toLowerCase().includes(queryLower)) {
      score += 50;
      hasTextMatch = true;
    }
    if (item.content_text && item.content_text.toLowerCase().includes(queryLower)) {
      score += 50;
      hasTextMatch = true;
    }
    if (item.extracted_text && item.extracted_text.toLowerCase().includes(queryLower)) {
      score += 40;
      hasTextMatch = true;
    }

    // Tag matches get lower score
    if (item.tags && Array.isArray(item.tags) && item.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
      score += 25;
      hasTextMatch = true;
    }

    // Location match for events
    if (item.location && item.location.toLowerCase().includes(queryLower)) {
      score += 30;
      hasTextMatch = true;
    }

    // IMPORTANT: Only apply boost factors if there's an actual text match
    // This prevents returning unrelated results just because they're recent or favorited
    if (!hasTextMatch) {
      return 0; // No text match = no relevance
    }

    // Boost recent content (only applied if there's a text match)
    const timestamp = item.updated_at || item.created_at;
    if (timestamp) {
      const daysSinceUpdate = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) score += 30;
      else if (daysSinceUpdate < 30) score += 15;
      else if (daysSinceUpdate < 90) score += 5;
    }

    // Boost starred/favorited items (only applied if there's a text match)
    if (item.starred || item.is_favorite) {
      score += 20;
    }

    // Content type priority (only applied if there's a text match)
    const typePriority: { [key: string]: number } = {
      'projects': 10,
      'tasks': 10,
      'notes': 8,
      'files': 8,
      'folders': 5,
      'messages': 6,
      'events': 7,
      'videos': 8
    };
    score += typePriority[contentType] || 0;

    return score;
  }

  async getSearchSuggestions(workspaceId: string, query: string, userId: string) {
    // Simple implementation - in practice you'd want more sophisticated suggestions
    const suggestions = [];

    if (query.length < 2) return suggestions;

    // Get recent searches, popular terms, etc.
    // For now, return some basic suggestions based on content
    const searchResults = await this.universalSearch(
      workspaceId,
      { query, limit: 5 } as SearchQueryDto,
      userId
    );

    // Extract suggestions from results
    searchResults.data.forEach(item => {
      if (item.title && !suggestions.includes(item.title)) {
        suggestions.push(item.title);
      }
    });

    return suggestions.slice(0, 5);
  }

  // ==================== RECENT SEARCH HISTORY METHODS ====================

  /**
   * Save search query to history
   */
  private async saveSearchHistory(
    workspaceId: string,
    userId: string,
    query: string,
    resultCount: number,
    contentTypes: string[],
    filters: SearchFilters
  ): Promise<void> {
    try {
      // Check if the same query was searched recently (within last 5 minutes)
      const recentSearch = await this.db.table('search_history')
        .select('id', 'created_at')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('query', '=', query)
        .orderBy('created_at', 'DESC')
        .limit(1)
        .execute();

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      // Extract data from database response format { data: [...], count: n }
      const recentSearchData = recentSearch?.data || (Array.isArray(recentSearch) ? recentSearch : [recentSearch]);
      const recentSearchResult = recentSearchData[0];

      // Don't save duplicate if searched within 5 minutes
      if (recentSearchResult && new Date(recentSearchResult.created_at) > fiveMinutesAgo) {
        return;
      }

      // Insert new search history
      await this.db.table('search_history')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          query,
          result_count: resultCount,
          content_types: contentTypes,
          filters: filters || {}
        })
        .execute();

      // Keep only last 50 searches per user in workspace (cleanup old searches)
      const allSearches = await this.db.table('search_history')
        .select('id')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .orderBy('created_at', 'DESC')
        .execute();

      // Extract data from database response format { data: [...], count: n }
      const searches = allSearches?.data || (Array.isArray(allSearches) ? allSearches : [allSearches]);

      if (searches.length > 50) {
        const idsToDelete = searches.slice(50).map(s => s.id);
        await this.db.table('search_history')
          .delete()
          .whereIn('id', idsToDelete)
          .execute();
      }
    } catch (error) {
      // Don't fail the search if history save fails
      console.error('Error saving search history:', error);
    }
  }

  /**
   * Get recent searches for a user
   */
  async getRecentSearches(workspaceId: string, userId: string, limit: number = 10) {
    try {
      const result = await this.db.table('search_history')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .orderBy('created_at', 'DESC')
        .limit(limit)
        .execute();

      // Extract data from database response format { data: [...], count: n }
      const searches = result?.data || (Array.isArray(result) ? result : [result]);
      const uniqueSearches = [];
      const seenQueries = new Set();

      for (const search of searches) {
        if (!seenQueries.has(search.query)) {
          seenQueries.add(search.query);
          uniqueSearches.push({
            id: search.id,
            query: search.query,
            result_count: search.result_count,
            content_types: search.content_types || [],
            filters: search.filters || {},
            created_at: search.created_at
          });
        }
      }

      return {
        data: uniqueSearches,
        total: uniqueSearches.length
      };
    } catch (error) {
      console.error('Error fetching recent searches:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * Clear search history for a user
   */
  async clearSearchHistory(workspaceId: string, userId: string, query?: string) {
    try {
      let deleteQuery = this.db.table('search_history')
        .delete()
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId);

      // If specific query provided, delete only that query
      if (query) {
        deleteQuery = deleteQuery.where('query', '=', query);
      }

      await deleteQuery.execute();

      return {
        success: true,
        message: query
          ? `Search history for "${query}" cleared successfully`
          : 'All search history cleared successfully'
      };
    } catch (error) {
      console.error('Error clearing search history:', error);
      throw new Error('Failed to clear search history');
    }
  }

  /**
   * Get popular searches across workspace (for suggestions)
   */
  async getPopularSearches(workspaceId: string, limit: number = 10) {
    try {
      // Get all searches, group by query, and count
      const result = await this.db.table('search_history')
        .select('query')
        .where('workspace_id', '=', workspaceId)
        .where('created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .execute();

      // Extract data from database response format { data: [...], count: n }
      const searches = result?.data || (Array.isArray(result) ? result : [result]);

      // Count occurrences
      const queryCount = new Map<string, number>();
      searches.forEach(search => {
        const count = queryCount.get(search.query) || 0;
        queryCount.set(search.query, count + 1);
      });

      // Sort by count and return top results
      const popular = Array.from(queryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));

      return {
        data: popular,
        total: popular.length
      };
    } catch (error) {
      console.error('Error fetching popular searches:', error);
      return { data: [], total: 0 };
    }
  }

  // ==================== SAVED SEARCHES METHODS ====================

  /**
   * Create a new saved search
   */
  async createSavedSearch(workspaceId: string, userId: string, data: any) {
    try {
      // Debug: Log the raw data received
      console.log('[CreateSavedSearch] RAW data received:', JSON.stringify(data).substring(0, 1000));
      console.log('[CreateSavedSearch] Received resultsSnapshot type:', typeof data.resultsSnapshot);
      console.log('[CreateSavedSearch] Received resultsSnapshot length:', data.resultsSnapshot?.length);

      if (data.resultsSnapshot && data.resultsSnapshot.length > 0) {
        console.log('[CreateSavedSearch] First result object:', JSON.stringify(data.resultsSnapshot[0]));
        console.log('[CreateSavedSearch] First result type:', typeof data.resultsSnapshot[0]);
        console.log('[CreateSavedSearch] First result keys:', Object.keys(data.resultsSnapshot[0] || {}));
      }

      // Try direct insertion with raw data
      const savedSearch = await this.db.table('saved_searches')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          name: data.name,
          query: data.query,
          type: data.type,
          mode: data.mode,
          filters: data.filters || {},
          results_snapshot: data.resultsSnapshot || [],
          result_count: data.resultsSnapshot?.length || 0,
          tags: data.tags || [],
          is_notification_enabled: data.isNotificationEnabled || false,
          shared_with: []
        })
        .execute();

      // Debug: Check what was actually saved
      console.log('[CreateSavedSearch] Insert result:', JSON.stringify(savedSearch));

      return {
        success: true,
        message: 'Search saved successfully',
        data: savedSearch
      };
    } catch (error) {
      console.error('Error creating saved search:', error);
      throw new Error('Failed to save search');
    }
  }

  /**
   * Get all saved searches for a user
   */
  async getSavedSearches(workspaceId: string, userId: string) {
    try {
      const result = await this.db.table('saved_searches')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .orderBy('created_at', 'DESC')
        .execute();

      // Extract data from database response format { data: [...], count: n }
      const searches = result?.data || (Array.isArray(result) ? result : [result]);

      return {
        data: searches,
        total: searches.length
      };
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      return { data: [], total: 0 };
    }
  }

  /**
   * Get a specific saved search by ID
   */
  async getSavedSearchById(workspaceId: string, userId: string, searchId: string) {
    try {
      const result = await this.db.table('saved_searches')
        .select('*')
        .where('id', '=', searchId)
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      // Extract data from database response format
      const searches = result?.data || (Array.isArray(result) ? result : [result]);
      const savedSearch = searches[0];

      if (!savedSearch) {
        throw new Error('Saved search not found');
      }

      return savedSearch;
    } catch (error) {
      console.error('Error fetching saved search:', error);
      throw new Error('Failed to fetch saved search');
    }
  }

  /**
   * Update a saved search
   */
  async updateSavedSearch(workspaceId: string, userId: string, searchId: string, updates: any) {
    try {
      // Verify ownership
      await this.getSavedSearchById(workspaceId, userId, searchId);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.query !== undefined) updateData.query = updates.query;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.mode !== undefined) updateData.mode = updates.mode;
      if (updates.filters !== undefined) updateData.filters = updates.filters;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.isNotificationEnabled !== undefined) updateData.is_notification_enabled = updates.isNotificationEnabled;

      await this.db.table('saved_searches')
        .update(updateData)
        .where('id', '=', searchId)
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      return {
        success: true,
        message: 'Saved search updated successfully'
      };
    } catch (error) {
      console.error('Error updating saved search:', error);
      throw new Error('Failed to update saved search');
    }
  }

  /**
   * Delete a saved search
   */
  async deleteSavedSearch(workspaceId: string, userId: string, searchId: string) {
    try {
      // Verify ownership
      await this.getSavedSearchById(workspaceId, userId, searchId);

      await this.db.table('saved_searches')
        .delete()
        .where('id', '=', searchId)
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      return {
        success: true,
        message: 'Saved search deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting saved search:', error);
      throw new Error('Failed to delete saved search');
    }
  }

  /**
   * Share a saved search with other users
   */
  async shareSavedSearch(workspaceId: string, userId: string, searchId: string, userIds: string[]) {
    try {
      // Verify ownership
      const savedSearch = await this.getSavedSearchById(workspaceId, userId, searchId);

      // Get current shared_with list
      const currentSharedWith = savedSearch.shared_with || [];

      // Merge with new user IDs (remove duplicates)
      const updatedSharedWith = Array.from(new Set([...currentSharedWith, ...userIds]));

      await this.db.table('saved_searches')
        .update({
          shared_with: updatedSharedWith,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', searchId)
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      return {
        success: true,
        message: 'Saved search shared successfully',
        shared_with: updatedSharedWith
      };
    } catch (error) {
      console.error('Error sharing saved search:', error);
      throw new Error('Failed to share saved search');
    }
  }

  /**
   * Get saved searches shared with the current user
   */
  async getSharedSavedSearches(workspaceId: string, userId: string) {
    try {
      // Note: database may not support JSON array contains queries directly
      // We'll fetch all saved searches and filter in code
      const result = await this.db.table('saved_searches')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .orderBy('created_at', 'DESC')
        .execute();

      // Extract data from database response format
      const allSearches = result?.data || (Array.isArray(result) ? result : [result]);

      // Filter searches where current user is in shared_with array
      const sharedSearches = allSearches.filter((search: any) => {
        const sharedWith = search.shared_with || [];
        return sharedWith.includes(userId) && search.user_id !== userId;
      });

      return {
        data: sharedSearches,
        total: sharedSearches.length
      };
    } catch (error) {
      console.error('Error fetching shared saved searches:', error);
      return { data: [], total: 0 };
    }
  }
}