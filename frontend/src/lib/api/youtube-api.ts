import { api } from '@/lib/fetch';

export interface YoutubeConnection {
  connected: boolean;
  email?: string;
  name?: string;
  channelId?: string;
  channelTitle?: string;
  connectedAt?: string;
}

export interface YoutubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: any;
  };
  contentDetails?: {
    itemCount: number;
  };
}

export interface YoutubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: any;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

class YoutubeApi {
  /**
   * Get YouTube OAuth authorization URL
   */
  async getAuthUrl(workspaceId: string, returnUrl?: string): Promise<{ authUrl: string }> {
    const params = new URLSearchParams({ workspaceId });
    if (returnUrl) params.append('returnUrl', returnUrl);

    const response = await api.get<{ data: { authUrl: string } }>(`/integrations/youtube/auth-url?${params}`);
    return response.data;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<{ message: string; returnUrl: string }> {
    const response = await api.post<{ data: any }>('/integrations/youtube/callback', { code, state });
    return response.data;
  }

  /**
   * Get YouTube connection status
   */
  async getStatus(workspaceId: string): Promise<YoutubeConnection> {
    const response = await api.get<{ data: YoutubeConnection }>(`/integrations/youtube/status?workspaceId=${workspaceId}`);
    return response.data;
  }

  /**
   * Disconnect YouTube account
   */
  async disconnect(workspaceId: string): Promise<void> {
    await api.post('/integrations/youtube/disconnect', { workspaceId });
  }

  /**
   * Get user's playlists
   */
  async getPlaylists(workspaceId: string, limit: number = 25): Promise<{ items: YoutubePlaylist[] }> {
    const response = await api.get<{ data: any }>(`/integrations/youtube/playlists?workspaceId=${workspaceId}&limit=${limit}`);
    return response.data;
  }

  /**
   * Get a playlist by ID
   */
  async getPlaylist(workspaceId: string, playlistId: string): Promise<YoutubePlaylist> {
    const response = await api.get<{ data: any }>(`/integrations/youtube/playlists/${playlistId}?workspaceId=${workspaceId}`);
    return response.data;
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(workspaceId: string, title: string, description?: string, privacyStatus: 'public' | 'private' | 'unlisted' = 'private'): Promise<YoutubePlaylist> {
    const response = await api.post<{ data: any }>('/integrations/youtube/playlists', {
      workspaceId,
      title,
      description,
      privacyStatus,
    });
    return response.data;
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(workspaceId: string, playlistId: string): Promise<void> {
    await api.delete(`/integrations/youtube/playlists/${playlistId}?workspaceId=${workspaceId}`);
  }

  /**
   * Get a video by ID
   */
  async getVideo(workspaceId: string, videoId: string): Promise<YoutubeVideo> {
    const response = await api.get<{ data: any }>(`/integrations/youtube/videos/${videoId}?workspaceId=${workspaceId}`);
    return response.data;
  }

  /**
   * Search videos
   */
  async searchVideos(workspaceId: string, query: string, options?: { channelId?: string; limit?: number; order?: string }): Promise<{ items: YoutubeVideo[] }> {
    const params = new URLSearchParams({
      workspaceId,
      q: query,
      limit: (options?.limit || 25).toString(),
    });

    if (options?.channelId) params.append('channelId', options.channelId);
    if (options?.order) params.append('order', options.order);

    const response = await api.get<{ data: any }>(`/integrations/youtube/videos/search?${params}`);
    return response.data;
  }

  /**
   * Get my YouTube channel info
   */
  async getMyChannel(workspaceId: string): Promise<any> {
    const response = await api.get<{ data: any }>(`/integrations/youtube/channel/me?workspaceId=${workspaceId}`);
    return response.data;
  }

  /**
   * Add video to playlist
   */
  async addToPlaylist(workspaceId: string, playlistId: string, videoId: string, position?: number): Promise<any> {
    const response = await api.post<{ data: any }>(`/integrations/youtube/playlists/${playlistId}/items`, {
      workspaceId,
      videoId,
      position,
    });
    return response.data;
  }

  /**
   * Remove video from playlist
   */
  async removeFromPlaylist(workspaceId: string, playlistItemId: string): Promise<void> {
    await api.delete(`/integrations/youtube/playlists/items/${playlistItemId}?workspaceId=${workspaceId}`);
  }

  /**
   * Rate a video (like/dislike/none)
   */
  async rateVideo(workspaceId: string, videoId: string, rating: 'like' | 'dislike' | 'none'): Promise<void> {
    await api.post(`/integrations/youtube/videos/${videoId}/rate`, {
      workspaceId,
      rating,
    });
  }

  /**
   * Get playlist items
   */
  async getPlaylistItems(workspaceId: string, playlistId: string, limit: number = 25): Promise<{ items: any[] }> {
    const response = await api.get<{ data: any }>(`/integrations/youtube/playlists/${playlistId}/items?workspaceId=${workspaceId}&limit=${limit}`);
    return response.data;
  }
}

export const youtubeApi = new YoutubeApi();
export default youtubeApi;
