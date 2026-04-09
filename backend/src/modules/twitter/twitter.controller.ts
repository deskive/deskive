import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  Res,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TwitterService } from './twitter.service';
import { TwitterOAuthService } from './twitter-oauth.service';
import {
  TwitterOAuthCallbackDto,
  TwitterConnectionDto,
  TimelineQueryDto,
  TimelineResponseDto,
  CreateTweetDto,
  CreateTweetResponseDto,
  SearchTweetsQueryDto,
  FollowResponseDto,
  SendDirectMessageDto,
} from './dto/twitter.dto';
import { Response } from 'express';

@ApiTags('Twitter')
@Controller('workspaces/:workspaceId/twitter')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class TwitterController {
  private readonly logger = new Logger(TwitterController.name);

  constructor(
    private readonly twitterService: TwitterService,
    private readonly twitterOAuthService: TwitterOAuthService,
  ) {}

  // ==========================================================================
  // OAuth & Connection
  // ==========================================================================

  @Get('auth/url')
  @ApiOperation({ summary: 'Get Twitter OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Returns the authorization URL' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'returnUrl', required: false, description: 'URL to redirect after OAuth' })
  async getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ): Promise<{ authorizationUrl: string; state: string }> {
    const { url, state } = this.twitterOAuthService.getAuthorizationUrl(workspaceId, userId, returnUrl);

    return {
      authorizationUrl: url,
      state,
    };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get current Twitter connection' })
  @ApiResponse({ status: 200, description: 'Returns the connection details', type: TwitterConnectionDto })
  @ApiResponse({ status: 404, description: 'No connection found' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: TwitterConnectionDto | null }> {
    const connection = await this.twitterService.getConnection(workspaceId, userId);
    return { data: connection };
  }

  @Delete('disconnect')
  @ApiOperation({ summary: 'Disconnect Twitter' })
  @ApiResponse({ status: 200, description: 'Successfully disconnected' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @HttpCode(HttpStatus.OK)
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.twitterService.disconnect(workspaceId, userId);
    return { message: 'Successfully disconnected from Twitter' };
  }

  // ==========================================================================
  // Timeline
  // ==========================================================================

  @Get('timeline/home')
  @ApiOperation({ summary: 'Get home timeline' })
  @ApiResponse({ status: 200, description: 'Returns home timeline tweets', type: TimelineResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async getHomeTimeline(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: TimelineQueryDto,
  ): Promise<{ data: TimelineResponseDto }> {
    const result = await this.twitterService.getHomeTimeline(workspaceId, userId, query);
    return { data: result };
  }

  @Get('users/:twitterUserId/tweets')
  @ApiOperation({ summary: 'Get user tweets' })
  @ApiResponse({ status: 200, description: 'Returns user tweets', type: TimelineResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'twitterUserId', description: 'Twitter User ID' })
  async getUserTweets(
    @Param('workspaceId') workspaceId: string,
    @Param('twitterUserId') twitterUserId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: TimelineQueryDto,
  ): Promise<{ data: TimelineResponseDto }> {
    const result = await this.twitterService.getUserTweets(workspaceId, userId, twitterUserId, query);
    return { data: result };
  }

  // ==========================================================================
  // Tweets
  // ==========================================================================

  @Get('tweets/:tweetId')
  @ApiOperation({ summary: 'Get a single tweet' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'tweetId', description: 'Tweet ID' })
  async getTweet(
    @Param('workspaceId') workspaceId: string,
    @Param('tweetId') tweetId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const tweet = await this.twitterService.getTweet(workspaceId, userId, tweetId);
    return { data: tweet };
  }

  @Post('tweets')
  @ApiOperation({ summary: 'Create a new tweet' })
  @ApiResponse({ status: 201, description: 'Tweet created', type: CreateTweetResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async createTweet(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTweetDto,
  ): Promise<{ data: CreateTweetResponseDto }> {
    const result = await this.twitterService.createTweet(workspaceId, userId, dto);
    return { data: result };
  }

  @Delete('tweets/:tweetId')
  @ApiOperation({ summary: 'Delete a tweet' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'tweetId', description: 'Tweet ID' })
  async deleteTweet(
    @Param('workspaceId') workspaceId: string,
    @Param('tweetId') tweetId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { deleted: boolean } }> {
    const result = await this.twitterService.deleteTweet(workspaceId, userId, tweetId);
    return { data: result };
  }

  // ==========================================================================
  // Likes
  // ==========================================================================

  @Post('tweets/:tweetId/like')
  @ApiOperation({ summary: 'Like a tweet' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'tweetId', description: 'Tweet ID' })
  async likeTweet(
    @Param('workspaceId') workspaceId: string,
    @Param('tweetId') tweetId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { liked: boolean } }> {
    const result = await this.twitterService.likeTweet(workspaceId, userId, tweetId);
    return { data: result };
  }

  @Delete('tweets/:tweetId/like')
  @ApiOperation({ summary: 'Unlike a tweet' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'tweetId', description: 'Tweet ID' })
  async unlikeTweet(
    @Param('workspaceId') workspaceId: string,
    @Param('tweetId') tweetId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { liked: boolean } }> {
    const result = await this.twitterService.unlikeTweet(workspaceId, userId, tweetId);
    return { data: result };
  }

  @Get('users/:twitterUserId/liked-tweets')
  @ApiOperation({ summary: 'Get user liked tweets' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'twitterUserId', description: 'Twitter User ID' })
  @ApiQuery({ name: 'maxResults', required: false })
  @ApiQuery({ name: 'paginationToken', required: false })
  async getLikedTweets(
    @Param('workspaceId') workspaceId: string,
    @Param('twitterUserId') twitterUserId: string,
    @CurrentUser('sub') userId: string,
    @Query('maxResults') maxResults?: number,
    @Query('paginationToken') paginationToken?: string,
  ): Promise<{ data: TimelineResponseDto }> {
    const result = await this.twitterService.getLikedTweets(
      workspaceId,
      userId,
      twitterUserId,
      maxResults,
      paginationToken,
    );
    return { data: result };
  }

  // ==========================================================================
  // Retweets
  // ==========================================================================

  @Post('tweets/:tweetId/retweet')
  @ApiOperation({ summary: 'Retweet a tweet' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'tweetId', description: 'Tweet ID' })
  async retweet(
    @Param('workspaceId') workspaceId: string,
    @Param('tweetId') tweetId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { retweeted: boolean } }> {
    const result = await this.twitterService.retweet(workspaceId, userId, tweetId);
    return { data: result };
  }

  @Delete('tweets/:tweetId/retweet')
  @ApiOperation({ summary: 'Undo retweet' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'tweetId', description: 'Tweet ID' })
  async undoRetweet(
    @Param('workspaceId') workspaceId: string,
    @Param('tweetId') tweetId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { retweeted: boolean } }> {
    const result = await this.twitterService.undoRetweet(workspaceId, userId, tweetId);
    return { data: result };
  }

  // ==========================================================================
  // Users
  // ==========================================================================

  @Get('users/by/username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'username', description: 'Twitter username' })
  async getUserByUsername(
    @Param('workspaceId') workspaceId: string,
    @Param('username') username: string,
    @CurrentUser('sub') userId: string,
  ) {
    const user = await this.twitterService.getUserByUsername(workspaceId, userId, username);
    return { data: user };
  }

  @Get('users/:twitterUserId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'twitterUserId', description: 'Twitter User ID' })
  async getUserById(
    @Param('workspaceId') workspaceId: string,
    @Param('twitterUserId') twitterUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const user = await this.twitterService.getUserById(workspaceId, userId, twitterUserId);
    return { data: user };
  }

  @Get('users/:twitterUserId/followers')
  @ApiOperation({ summary: 'Get user followers' })
  @ApiResponse({ status: 200, description: 'Returns followers', type: FollowResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'twitterUserId', description: 'Twitter User ID' })
  @ApiQuery({ name: 'maxResults', required: false })
  @ApiQuery({ name: 'paginationToken', required: false })
  async getFollowers(
    @Param('workspaceId') workspaceId: string,
    @Param('twitterUserId') twitterUserId: string,
    @CurrentUser('sub') userId: string,
    @Query('maxResults') maxResults?: number,
    @Query('paginationToken') paginationToken?: string,
  ): Promise<{ data: FollowResponseDto }> {
    const result = await this.twitterService.getFollowers(
      workspaceId,
      userId,
      twitterUserId,
      maxResults,
      paginationToken,
    );
    return { data: result };
  }

  @Get('users/:twitterUserId/following')
  @ApiOperation({ summary: 'Get user following' })
  @ApiResponse({ status: 200, description: 'Returns following users', type: FollowResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'twitterUserId', description: 'Twitter User ID' })
  @ApiQuery({ name: 'maxResults', required: false })
  @ApiQuery({ name: 'paginationToken', required: false })
  async getFollowing(
    @Param('workspaceId') workspaceId: string,
    @Param('twitterUserId') twitterUserId: string,
    @CurrentUser('sub') userId: string,
    @Query('maxResults') maxResults?: number,
    @Query('paginationToken') paginationToken?: string,
  ): Promise<{ data: FollowResponseDto }> {
    const result = await this.twitterService.getFollowing(
      workspaceId,
      userId,
      twitterUserId,
      maxResults,
      paginationToken,
    );
    return { data: result };
  }

  @Post('users/:targetUserId/follow')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'targetUserId', description: 'Target Twitter User ID' })
  async followUser(
    @Param('workspaceId') workspaceId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { following: boolean; pendingFollow: boolean } }> {
    const result = await this.twitterService.followUser(workspaceId, userId, targetUserId);
    return { data: result };
  }

  @Delete('users/:targetUserId/follow')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'targetUserId', description: 'Target Twitter User ID' })
  async unfollowUser(
    @Param('workspaceId') workspaceId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { following: boolean } }> {
    const result = await this.twitterService.unfollowUser(workspaceId, userId, targetUserId);
    return { data: result };
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  @Get('search/tweets')
  @ApiOperation({ summary: 'Search tweets' })
  @ApiResponse({ status: 200, description: 'Returns search results', type: TimelineResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async searchTweets(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: SearchTweetsQueryDto,
  ): Promise<{ data: TimelineResponseDto }> {
    const result = await this.twitterService.searchTweets(workspaceId, userId, query);
    return { data: result };
  }

  // ==========================================================================
  // Direct Messages
  // ==========================================================================

  @Get('dm/conversations')
  @ApiOperation({ summary: 'Get DM conversations' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'maxResults', required: false })
  @ApiQuery({ name: 'paginationToken', required: false })
  async getDMConversations(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('maxResults') maxResults?: number,
    @Query('paginationToken') paginationToken?: string,
  ) {
    const result = await this.twitterService.getDMConversations(
      workspaceId,
      userId,
      maxResults,
      paginationToken,
    );
    return { data: result };
  }

  @Post('dm/messages')
  @ApiOperation({ summary: 'Send a direct message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async sendDirectMessage(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendDirectMessageDto,
  ): Promise<{ data: { eventId: string } }> {
    const result = await this.twitterService.sendDirectMessage(workspaceId, userId, dto);
    return { data: result };
  }
}

// ==========================================================================
// OAuth Callback Controller (Public - No Auth Required)
// ==========================================================================

@ApiTags('Twitter')
@Controller('integrations/twitter')
export class TwitterCallbackController {
  private readonly logger = new Logger(TwitterCallbackController.name);

  constructor(private readonly twitterService: TwitterService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Handle Twitter OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to return URL or default page' })
  async handleCallback(
    @Query() query: TwitterOAuthCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Check for OAuth errors
      if (query.error) {
        this.logger.error(`Twitter OAuth error: ${query.error} - ${query.error_description}`);
        res.redirect('/apps?twitter=error&message=' + encodeURIComponent(query.error_description || query.error));
        return;
      }

      if (!query.code || !query.state) {
        res.redirect('/apps?twitter=error&message=' + encodeURIComponent('Missing authorization code or state'));
        return;
      }

      const { connection, returnUrl } = await this.twitterService.handleOAuthCallback(
        query.code,
        query.state,
      );

      this.logger.log(`Twitter connected successfully for user ${connection.userId}`);

      // Redirect to return URL or default page
      const redirectUrl = returnUrl || '/apps?twitter=connected';
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Twitter OAuth callback error:', error);
      res.redirect('/apps?twitter=error&message=' + encodeURIComponent(error.message));
    }
  }
}
