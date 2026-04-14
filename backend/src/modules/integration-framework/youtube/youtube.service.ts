import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { YoutubeOAuthService, GoogleOAuthTokens } from './youtube-oauth.service';
import axios from 'axios';

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

  constructor(
    private readonly db: DatabaseService,
    private youtubeOAuthService: YoutubeOAuthService,
  ) {}

  /**
   * Get user's YouTube connection info from database
   */
  async getConnectionInfo(userId: string, workspaceId: string) {
    const result = await this.db.findOne('youtube_connections', {
      user_id: userId,
      workspace_id: workspaceId,
    });

    if (!result) {
      throw new NotFoundException(
        'YouTube not connected. Please connect your YouTube account first.',
      );
    }

    // Check if token needs refresh
    const expiresAt = new Date(result.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow && result.refresh_token) {
      this.logger.log('YouTube token expired or expiring soon, refreshing...');
      const tokens = await this.youtubeOAuthService.refreshAccessToken(result.refresh_token);

      // Update tokens in database
      await this.db.update(
        'youtube_connections',
        { id: result.id },
        {
          access_token: tokens.accessToken,
          expires_at: tokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
      );

      result.access_token = tokens.accessToken;
      result.expires_at = tokens.expiresAt.toISOString();
    }

    return result;
  }

  /**
   * Make authenticated request to YouTube API
   */
  private async makeYoutubeRequest(
    method: string,
    endpoint: string,
    userId: string,
    workspaceId: string,
    data?: any,
    params?: any,
  ) {
    const connection = await this.getConnectionInfo(userId, workspaceId);

    const url = `${this.YOUTUBE_API_BASE}${endpoint}`;

    try {
      const response = await axios({
        method,
        url,
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        params,
        data,
      });

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `YouTube API error: ${error.response?.data?.error?.message || error.message}`,
      );
      throw new BadRequestException(
        error.response?.data?.error?.message || 'YouTube API request failed',
      );
    }
  }

  /**
   * Get a playlist by ID
   */
  async getPlaylist(
    userId: string,
    workspaceId: string,
    playlistId: string,
    part: string[] = ['snippet', 'contentDetails'],
  ) {
    const params = {
      part: part.join(','),
      id: playlistId,
    };

    return this.makeYoutubeRequest('GET', '/playlists', userId, workspaceId, null, params);
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(userId: string, workspaceId: string, title: string, options?: any) {
    const body = {
      snippet: {
        title,
        description: options?.description || '',
      },
      status: {
        privacyStatus: options?.privacyStatus || 'private',
      },
    };

    if (options?.tags) {
      body.snippet['tags'] = options.tags.split(',').map((t: string) => t.trim());
    }

    const params = {
      part: 'snippet,status',
    };

    return this.makeYoutubeRequest('POST', '/playlists', userId, workspaceId, body, params);
  }

  /**
   * Get user's playlists
   */
  async getPlaylists(userId: string, workspaceId: string, limit: number = 25) {
    const params = {
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: Math.min(limit, 50),
    };

    return this.makeYoutubeRequest('GET', '/playlists', userId, workspaceId, null, params);
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(userId: string, workspaceId: string, playlistId: string) {
    const params = {
      id: playlistId,
    };

    return this.makeYoutubeRequest('DELETE', '/playlists', userId, workspaceId, null, params);
  }

  /**
   * Get a video by ID
   */
  async getVideo(
    userId: string,
    workspaceId: string,
    videoId: string,
    part: string[] = ['snippet', 'statistics'],
  ) {
    const params = {
      part: part.join(','),
      id: videoId,
    };

    return this.makeYoutubeRequest('GET', '/videos', userId, workspaceId, null, params);
  }

  /**
   * Search videos
   */
  async searchVideos(userId: string, workspaceId: string, query: string, options?: any) {
    const params: any = {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: Math.min(options?.limit || 25, 50),
    };

    if (options?.channelId) {
      params.channelId = options.channelId;
    }
    if (options?.order) {
      params.order = options.order;
    }

    return this.makeYoutubeRequest('GET', '/search', userId, workspaceId, null, params);
  }

  /**
   * Get user's channel info
   */
  async getMyChannel(userId: string, workspaceId: string) {
    const params = {
      part: 'snippet,statistics,contentDetails',
      mine: true,
    };

    return this.makeYoutubeRequest('GET', '/channels', userId, workspaceId, null, params);
  }

  /**
   * Add video to playlist
   */
  async addToPlaylist(
    userId: string,
    workspaceId: string,
    playlistId: string,
    videoId: string,
    position?: number,
  ) {
    const body: any = {
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    };

    if (position !== undefined) {
      body.snippet.position = position;
    }

    const params = {
      part: 'snippet',
    };

    return this.makeYoutubeRequest('POST', '/playlistItems', userId, workspaceId, body, params);
  }

  /**
   * Remove video from playlist
   */
  async removeFromPlaylist(userId: string, workspaceId: string, playlistItemId: string) {
    const params = {
      id: playlistItemId,
    };

    return this.makeYoutubeRequest('DELETE', '/playlistItems', userId, workspaceId, null, params);
  }

  /**
   * Rate a video
   */
  async rateVideo(
    userId: string,
    workspaceId: string,
    videoId: string,
    rating: 'like' | 'dislike' | 'none',
  ) {
    const params = {
      id: videoId,
      rating,
    };

    return this.makeYoutubeRequest('POST', '/videos/rate', userId, workspaceId, null, params);
  }

  /**
   * Get playlist items
   */
  async getPlaylistItems(
    userId: string,
    workspaceId: string,
    playlistId: string,
    limit: number = 25,
  ) {
    const params = {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: Math.min(limit, 50),
    };

    return this.makeYoutubeRequest('GET', '/playlistItems', userId, workspaceId, null, params);
  }
}
