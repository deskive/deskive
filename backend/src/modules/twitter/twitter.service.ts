import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import { TwitterOAuthService } from './twitter-oauth.service';
import {
  TwitterConnectionDto,
  TweetDto,
  TwitterUserDto,
  CreateTweetDto,
  TimelineQueryDto,
  SearchTweetsQueryDto,
  DirectMessageDto,
  SendDirectMessageDto,
} from './dto/twitter.dto';

@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly twitterApiUrl = 'https://api.twitter.com/2';

  // Default fields to request
  private readonly tweetFields =
    'id,text,author_id,created_at,public_metrics,conversation_id,in_reply_to_user_id,referenced_tweets,attachments';
  private readonly userFields =
    'id,name,username,profile_image_url,verified,public_metrics,description,location,url,created_at,protected';
  private readonly mediaFields =
    'media_key,type,url,preview_image_url,width,height,alt_text,duration_ms';
  private readonly expansions = 'author_id,attachments.media_keys,referenced_tweets.id';

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly twitterOAuthService: TwitterOAuthService,
  ) {}

  // ==========================================================================
  // OAuth & Connection Management
  // ==========================================================================

  /**
   * Handle OAuth callback and store connection
   */
  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ connection: TwitterConnectionDto; returnUrl?: string }> {
    // Decode state to get workspace and user info
    const { workspaceId, userId, returnUrl } = this.twitterOAuthService.decodeState(state);

    // Exchange code for tokens
    const tokenResponse = await this.twitterOAuthService.exchangeCodeForTokens(code, state);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Get user info
    const userInfo = await this.twitterOAuthService.getUserInfo(tokenResponse.access_token);

    // Check for existing connection
    const existingConnection = await this.db.findOne('twitter_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_type: tokenResponse.token_type || 'Bearer',
      scope: tokenResponse.scope,
      expires_at: expiresAt.toISOString(),
      twitter_user_id: userInfo.id,
      twitter_username: userInfo.username,
      twitter_name: userInfo.name,
      twitter_picture: userInfo.profile_image_url,
      twitter_verified: userInfo.verified || false,
      followers_count: userInfo.public_metrics?.followers_count || 0,
      following_count: userInfo.public_metrics?.following_count || 0,
      tweet_count: userInfo.public_metrics?.tweet_count || 0,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      // Update existing connection
      await this.db.update('twitter_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new connection
      connection = await this.db.insert('twitter_connections', {
        ...connectionData,
        created_at: new Date().toISOString(),
      });
    }

    return {
      connection: this.mapToConnectionDto(connection),
      returnUrl,
    };
  }

  /**
   * Get current Twitter connection for user in workspace
   */
  async getConnection(workspaceId: string, userId: string): Promise<TwitterConnectionDto | null> {
    const connection = await this.db.findOne('twitter_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.mapToConnectionDto(connection);
  }

  /**
   * Disconnect Twitter
   */
  async disconnect(workspaceId: string, userId: string): Promise<void> {
    const connection = await this.db.findOne('twitter_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('No Twitter connection found');
    }

    // Revoke token
    try {
      await this.twitterOAuthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    // Soft delete the connection
    await this.db.update('twitter_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Tweets
  // ==========================================================================

  /**
   * Get home timeline
   */
  async getHomeTimeline(
    workspaceId: string,
    userId: string,
    query: TimelineQueryDto,
  ): Promise<{ tweets: TweetDto[]; nextToken?: string; resultCount: number }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const params: any = {
      'tweet.fields': this.tweetFields,
      'user.fields': this.userFields,
      'media.fields': this.mediaFields,
      expansions: this.expansions,
      max_results: query.maxResults || 25,
    };

    if (query.paginationToken) params.pagination_token = query.paginationToken;

    const excludes: string[] = [];
    if (query.excludeReplies) excludes.push('replies');
    if (query.excludeRetweets) excludes.push('retweets');
    if (excludes.length > 0) params.exclude = excludes.join(',');

    const response = await this.twitterApi(
      accessToken,
      `users/${connection.twitter_user_id}/timelines/reverse_chronological`,
      params,
    );

    return {
      tweets: this.mapTweets(response.data || [], response.includes),
      nextToken: response.meta?.next_token,
      resultCount: response.meta?.result_count || 0,
    };
  }

  /**
   * Get user's tweets
   */
  async getUserTweets(
    workspaceId: string,
    userId: string,
    twitterUserId: string,
    query: TimelineQueryDto,
  ): Promise<{ tweets: TweetDto[]; nextToken?: string; resultCount: number }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const params: any = {
      'tweet.fields': this.tweetFields,
      'user.fields': this.userFields,
      'media.fields': this.mediaFields,
      expansions: this.expansions,
      max_results: query.maxResults || 25,
    };

    if (query.paginationToken) params.pagination_token = query.paginationToken;
    if (query.startTime) params.start_time = query.startTime;
    if (query.endTime) params.end_time = query.endTime;

    const excludes: string[] = [];
    if (query.excludeReplies) excludes.push('replies');
    if (query.excludeRetweets) excludes.push('retweets');
    if (excludes.length > 0) params.exclude = excludes.join(',');

    const response = await this.twitterApi(accessToken, `users/${twitterUserId}/tweets`, params);

    return {
      tweets: this.mapTweets(response.data || [], response.includes),
      nextToken: response.meta?.next_token,
      resultCount: response.meta?.result_count || 0,
    };
  }

  /**
   * Get a single tweet
   */
  async getTweet(workspaceId: string, userId: string, tweetId: string): Promise<TweetDto> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const response = await this.twitterApi(accessToken, `tweets/${tweetId}`, {
      'tweet.fields': this.tweetFields,
      'user.fields': this.userFields,
      'media.fields': this.mediaFields,
      expansions: this.expansions,
    });

    const tweets = this.mapTweets([response.data], response.includes);
    return tweets[0];
  }

  /**
   * Create a new tweet
   */
  async createTweet(
    workspaceId: string,
    userId: string,
    dto: CreateTweetDto,
  ): Promise<{ id: string; text: string }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const payload: any = {
      text: dto.text,
    };

    if (dto.replyToTweetId) {
      payload.reply = { in_reply_to_tweet_id: dto.replyToTweetId };
    }

    if (dto.quoteTweetId) {
      payload.quote_tweet_id = dto.quoteTweetId;
    }

    if (dto.mediaIds?.length) {
      payload.media = { media_ids: dto.mediaIds };
    }

    if (dto.pollOptions?.length >= 2) {
      payload.poll = {
        options: dto.pollOptions,
        duration_minutes: dto.pollDurationMinutes || 1440, // Default 24 hours
      };
    }

    const response = await this.twitterApiPost(accessToken, 'tweets', payload);

    return {
      id: response.data.id,
      text: response.data.text,
    };
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(
    workspaceId: string,
    userId: string,
    tweetId: string,
  ): Promise<{ deleted: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const response = await this.twitterApiDelete(accessToken, `tweets/${tweetId}`);

    return { deleted: response.data?.deleted || false };
  }

  // ==========================================================================
  // Likes
  // ==========================================================================

  /**
   * Like a tweet
   */
  async likeTweet(
    workspaceId: string,
    userId: string,
    tweetId: string,
  ): Promise<{ liked: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const response = await this.twitterApiPost(
      accessToken,
      `users/${connection.twitter_user_id}/likes`,
      { tweet_id: tweetId },
    );

    return { liked: response.data?.liked || false };
  }

  /**
   * Unlike a tweet
   */
  async unlikeTweet(
    workspaceId: string,
    userId: string,
    tweetId: string,
  ): Promise<{ liked: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const response = await this.twitterApiDelete(
      accessToken,
      `users/${connection.twitter_user_id}/likes/${tweetId}`,
    );

    return { liked: response.data?.liked || false };
  }

  /**
   * Get user's liked tweets
   */
  async getLikedTweets(
    workspaceId: string,
    userId: string,
    twitterUserId: string,
    maxResults = 25,
    paginationToken?: string,
  ): Promise<{ tweets: TweetDto[]; nextToken?: string; resultCount: number }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const params: any = {
      'tweet.fields': this.tweetFields,
      'user.fields': this.userFields,
      expansions: 'author_id',
      max_results: maxResults,
    };

    if (paginationToken) params.pagination_token = paginationToken;

    const response = await this.twitterApi(
      accessToken,
      `users/${twitterUserId}/liked_tweets`,
      params,
    );

    return {
      tweets: this.mapTweets(response.data || [], response.includes),
      nextToken: response.meta?.next_token,
      resultCount: response.meta?.result_count || 0,
    };
  }

  // ==========================================================================
  // Retweets
  // ==========================================================================

  /**
   * Retweet a tweet
   */
  async retweet(
    workspaceId: string,
    userId: string,
    tweetId: string,
  ): Promise<{ retweeted: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const response = await this.twitterApiPost(
      accessToken,
      `users/${connection.twitter_user_id}/retweets`,
      { tweet_id: tweetId },
    );

    return { retweeted: response.data?.retweeted || false };
  }

  /**
   * Undo retweet
   */
  async undoRetweet(
    workspaceId: string,
    userId: string,
    tweetId: string,
  ): Promise<{ retweeted: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const response = await this.twitterApiDelete(
      accessToken,
      `users/${connection.twitter_user_id}/retweets/${tweetId}`,
    );

    return { retweeted: response.data?.retweeted || false };
  }

  // ==========================================================================
  // Users & Following
  // ==========================================================================

  /**
   * Get user by username
   */
  async getUserByUsername(
    workspaceId: string,
    userId: string,
    username: string,
  ): Promise<TwitterUserDto> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const response = await this.twitterApi(accessToken, `users/by/username/${username}`, {
      'user.fields': this.userFields,
    });

    return this.mapUser(response.data);
  }

  /**
   * Get user by ID
   */
  async getUserById(
    workspaceId: string,
    userId: string,
    twitterUserId: string,
  ): Promise<TwitterUserDto> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const response = await this.twitterApi(accessToken, `users/${twitterUserId}`, {
      'user.fields': this.userFields,
    });

    return this.mapUser(response.data);
  }

  /**
   * Get followers
   */
  async getFollowers(
    workspaceId: string,
    userId: string,
    twitterUserId: string,
    maxResults = 100,
    paginationToken?: string,
  ): Promise<{ users: TwitterUserDto[]; nextToken?: string; resultCount: number }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const params: any = {
      'user.fields': this.userFields,
      max_results: maxResults,
    };

    if (paginationToken) params.pagination_token = paginationToken;

    const response = await this.twitterApi(accessToken, `users/${twitterUserId}/followers`, params);

    return {
      users: (response.data || []).map((user: any) => this.mapUser(user)),
      nextToken: response.meta?.next_token,
      resultCount: response.meta?.result_count || 0,
    };
  }

  /**
   * Get following
   */
  async getFollowing(
    workspaceId: string,
    userId: string,
    twitterUserId: string,
    maxResults = 100,
    paginationToken?: string,
  ): Promise<{ users: TwitterUserDto[]; nextToken?: string; resultCount: number }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const params: any = {
      'user.fields': this.userFields,
      max_results: maxResults,
    };

    if (paginationToken) params.pagination_token = paginationToken;

    const response = await this.twitterApi(accessToken, `users/${twitterUserId}/following`, params);

    return {
      users: (response.data || []).map((user: any) => this.mapUser(user)),
      nextToken: response.meta?.next_token,
      resultCount: response.meta?.result_count || 0,
    };
  }

  /**
   * Follow a user
   */
  async followUser(
    workspaceId: string,
    userId: string,
    targetUserId: string,
  ): Promise<{ following: boolean; pendingFollow: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const response = await this.twitterApiPost(
      accessToken,
      `users/${connection.twitter_user_id}/following`,
      { target_user_id: targetUserId },
    );

    return {
      following: response.data?.following || false,
      pendingFollow: response.data?.pending_follow || false,
    };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(
    workspaceId: string,
    userId: string,
    targetUserId: string,
  ): Promise<{ following: boolean }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);
    const connection = await this.getConnectionRecord(workspaceId, userId);

    const response = await this.twitterApiDelete(
      accessToken,
      `users/${connection.twitter_user_id}/following/${targetUserId}`,
    );

    return { following: response.data?.following || false };
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Search tweets
   */
  async searchTweets(
    workspaceId: string,
    userId: string,
    query: SearchTweetsQueryDto,
  ): Promise<{ tweets: TweetDto[]; nextToken?: string; resultCount: number }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const params: any = {
      query: query.query,
      'tweet.fields': this.tweetFields,
      'user.fields': this.userFields,
      'media.fields': this.mediaFields,
      expansions: this.expansions,
      max_results: query.maxResults || 25,
    };

    if (query.nextToken) params.next_token = query.nextToken;
    if (query.startTime) params.start_time = query.startTime;
    if (query.endTime) params.end_time = query.endTime;
    if (query.sortOrder) params.sort_order = query.sortOrder;

    const response = await this.twitterApi(accessToken, 'tweets/search/recent', params);

    return {
      tweets: this.mapTweets(response.data || [], response.includes),
      nextToken: response.meta?.next_token,
      resultCount: response.meta?.result_count || 0,
    };
  }

  // ==========================================================================
  // Direct Messages
  // ==========================================================================

  /**
   * Get DM conversations
   */
  async getDMConversations(
    workspaceId: string,
    userId: string,
    maxResults = 20,
    paginationToken?: string,
  ): Promise<{ conversations: any[]; nextToken?: string }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const params: any = {
      'dm_event.fields': 'id,text,created_at,sender_id,dm_conversation_id,attachments',
      max_results: maxResults,
    };

    if (paginationToken) params.pagination_token = paginationToken;

    const response = await this.twitterApi(accessToken, 'dm_events', params);

    return {
      conversations: response.data || [],
      nextToken: response.meta?.next_token,
    };
  }

  /**
   * Send a direct message
   */
  async sendDirectMessage(
    workspaceId: string,
    userId: string,
    dto: SendDirectMessageDto,
  ): Promise<{ eventId: string }> {
    const accessToken = await this.getValidAccessToken(workspaceId, userId);

    const payload: any = {
      text: dto.text,
    };

    if (dto.mediaId) {
      payload.attachments = [{ media_id: dto.mediaId }];
    }

    const response = await this.twitterApiPost(
      accessToken,
      `dm_conversations/with/${dto.participantId}/messages`,
      payload,
    );

    return { eventId: response.data?.dm_event_id || '' };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getConnectionRecord(workspaceId: string, userId: string) {
    return this.db.findOne('twitter_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });
  }

  private async getValidAccessToken(workspaceId: string, userId: string): Promise<string> {
    const connection = await this.getConnectionRecord(workspaceId, userId);
    if (!connection) {
      throw new NotFoundException(
        'No Twitter connection found. Please connect your Twitter account first.',
      );
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < fiveMinutes && connection.refresh_token) {
      // Refresh the token
      try {
        const newTokens = await this.twitterOAuthService.refreshAccessToken(
          connection.refresh_token,
        );
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

        await this.db.update('twitter_connections', connection.id, {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token || connection.refresh_token,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        });

        return newTokens.access_token;
      } catch (error) {
        this.logger.error('Failed to refresh Twitter token:', error);
        throw new BadRequestException('Twitter token expired. Please reconnect your account.');
      }
    }

    return connection.access_token;
  }

  private async twitterApi(accessToken: string, endpoint: string, params: any = {}): Promise<any> {
    try {
      const response = await axios.get(`${this.twitterApiUrl}/${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Twitter API error (GET ${endpoint}):`, error?.response?.data || error);
      const errorDetail =
        error?.response?.data?.detail ||
        error?.response?.data?.errors?.[0]?.message ||
        'Unknown error';
      throw new BadRequestException(`Twitter API error: ${errorDetail}`);
    }
  }

  private async twitterApiPost(accessToken: string, endpoint: string, data: any): Promise<any> {
    try {
      const response = await axios.post(`${this.twitterApiUrl}/${endpoint}`, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Twitter API error (POST ${endpoint}):`, error?.response?.data || error);
      const errorDetail =
        error?.response?.data?.detail ||
        error?.response?.data?.errors?.[0]?.message ||
        'Unknown error';
      throw new BadRequestException(`Twitter API error: ${errorDetail}`);
    }
  }

  private async twitterApiDelete(accessToken: string, endpoint: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.twitterApiUrl}/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Twitter API error (DELETE ${endpoint}):`, error?.response?.data || error);
      const errorDetail =
        error?.response?.data?.detail ||
        error?.response?.data?.errors?.[0]?.message ||
        'Unknown error';
      throw new BadRequestException(`Twitter API error: ${errorDetail}`);
    }
  }

  private mapToConnectionDto(record: any): TwitterConnectionDto {
    return {
      id: record.id,
      workspaceId: record.workspace_id,
      userId: record.user_id,
      twitterUserId: record.twitter_user_id,
      twitterUsername: record.twitter_username,
      twitterName: record.twitter_name,
      twitterPicture: record.twitter_picture,
      twitterVerified: record.twitter_verified,
      followersCount: record.followers_count,
      followingCount: record.following_count,
      tweetCount: record.tweet_count,
      isActive: record.is_active,
      lastSyncedAt: record.last_synced_at ? new Date(record.last_synced_at) : undefined,
      createdAt: new Date(record.created_at),
    };
  }

  private mapTweets(tweets: any[], includes?: any): TweetDto[] {
    const users = new Map<string, any>();
    const media = new Map<string, any>();

    if (includes?.users) {
      includes.users.forEach((user: any) => users.set(user.id, user));
    }
    if (includes?.media) {
      includes.media.forEach((m: any) => media.set(m.media_key, m));
    }

    return tweets.map((tweet) => {
      const author = users.get(tweet.author_id);
      const tweetMedia = tweet.attachments?.media_keys
        ?.map((key: string) => {
          const m = media.get(key);
          return m
            ? {
                mediaKey: m.media_key,
                type: m.type,
                url: m.url,
                previewImageUrl: m.preview_image_url,
                width: m.width,
                height: m.height,
                altText: m.alt_text,
                durationMs: m.duration_ms,
              }
            : null;
        })
        .filter(Boolean);

      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: author?.username,
        authorName: author?.name,
        authorProfileImage: author?.profile_image_url,
        createdAt: tweet.created_at,
        publicMetrics: tweet.public_metrics
          ? {
              retweetCount: tweet.public_metrics.retweet_count,
              replyCount: tweet.public_metrics.reply_count,
              likeCount: tweet.public_metrics.like_count,
              quoteCount: tweet.public_metrics.quote_count,
              bookmarkCount: tweet.public_metrics.bookmark_count,
              impressionCount: tweet.public_metrics.impression_count,
            }
          : undefined,
        media: tweetMedia,
        referencedTweets: tweet.referenced_tweets,
        conversationId: tweet.conversation_id,
        inReplyToUserId: tweet.in_reply_to_user_id,
      };
    });
  }

  private mapUser(user: any): TwitterUserDto {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      description: user.description,
      profileImageUrl: user.profile_image_url,
      location: user.location,
      url: user.url,
      verified: user.verified,
      protected: user.protected,
      publicMetrics: user.public_metrics
        ? {
            followersCount: user.public_metrics.followers_count,
            followingCount: user.public_metrics.following_count,
            tweetCount: user.public_metrics.tweet_count,
            listedCount: user.public_metrics.listed_count,
          }
        : undefined,
      createdAt: user.created_at,
    };
  }
}
