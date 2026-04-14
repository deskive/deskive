import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { YoutubeService } from './youtube.service';
import { YoutubeOAuthService } from './youtube-oauth.service';
import { DatabaseService } from '../../database/database.service';
import {
  GetPlaylistDto,
  CreatePlaylistDto,
  GetVideoDto,
  SearchVideosDto,
  AddPlaylistItemDto,
  RateVideoDto,
} from './dto/youtube.dto';

@ApiTags('YouTube Integration')
@Controller('integrations/youtube')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class YoutubeController {
  constructor(
    private youtubeService: YoutubeService,
    private youtubeOAuthService: YoutubeOAuthService,
    private readonly db: DatabaseService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get YouTube OAuth authorization URL' })
  async getAuthUrl(
    @Query('workspaceId') workspaceId: string,
    @Query('returnUrl') returnUrl: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const authUrl = this.youtubeOAuthService.getAuthUrl(userId, workspaceId, returnUrl);

    return {
      success: true,
      data: { authUrl },
    };
  }

  @Post('callback')
  @ApiOperation({ summary: 'Handle YouTube OAuth callback' })
  async handleCallback(@Body() body: { code: string; state: string }) {
    const { code, state } = body;

    // Decode state
    const stateData = this.youtubeOAuthService.decodeState(state);

    // Exchange code for tokens
    const tokens = await this.youtubeOAuthService.exchangeCodeForTokens(code);

    // Get user info
    const userInfo = await this.youtubeOAuthService.getUserInfo(tokens.accessToken);

    // Store connection in database
    const existingConnection = await this.db.findOne('youtube_connections', {
      user_id: stateData.userId,
      workspace_id: stateData.workspaceId,
    });

    if (existingConnection) {
      // Update existing connection
      await this.db.update(
        'youtube_connections',
        { id: existingConnection.id },
        {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken || existingConnection.refresh_token,
          expires_at: tokens.expiresAt.toISOString(),
          google_user_id: userInfo.id,
          google_email: userInfo.email,
          google_name: userInfo.name,
          google_picture: userInfo.picture,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      );
    } else {
      // Create new connection
      await this.db.insert('youtube_connections', {
        user_id: stateData.userId,
        workspace_id: stateData.workspaceId,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt.toISOString(),
        google_user_id: userInfo.id,
        google_email: userInfo.email,
        google_name: userInfo.name,
        google_picture: userInfo.picture,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: {
        message: 'YouTube connected successfully',
        returnUrl: stateData.returnUrl,
        userInfo: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
        },
      },
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check YouTube connection status' })
  async getStatus(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;

    const connection = await this.db.findOne('youtube_connections', {
      user_id: userId,
      workspace_id: workspaceId,
    });

    return {
      success: true,
      data: {
        connected: !!connection && connection.is_active,
        email: connection?.google_email,
        name: connection?.google_name,
        connectedAt: connection?.created_at,
      },
    };
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect YouTube account' })
  async disconnect(@Body('workspaceId') workspaceId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;

    const connection = await this.db.findOne('youtube_connections', {
      user_id: userId,
      workspace_id: workspaceId,
    });

    if (connection) {
      // Revoke token
      if (connection.access_token) {
        await this.youtubeOAuthService.revokeToken(connection.access_token);
      }

      // Soft delete the connection
      await this.db.update('youtube_connections', connection.id, {
        is_active: false,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: { message: 'YouTube disconnected successfully' },
    };
  }

  @Get('playlists')
  @ApiOperation({ summary: 'Get user playlists' })
  async getPlaylists(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit: number = 25,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.youtubeService.getPlaylists(userId, workspaceId, limit);

    return { success: true, data };
  }

  @Get('playlists/:playlistId')
  @ApiOperation({ summary: 'Get playlist by ID' })
  async getPlaylist(
    @Param('playlistId') playlistId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('part') part: string = 'snippet,contentDetails',
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const partArray = part.split(',');
    const data = await this.youtubeService.getPlaylist(userId, workspaceId, playlistId, partArray);

    return { success: true, data };
  }

  @Post('playlists')
  @ApiOperation({ summary: 'Create a new playlist' })
  async createPlaylist(
    @Body() createPlaylistDto: CreatePlaylistDto & { workspaceId: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const { workspaceId, ...playlistData } = createPlaylistDto;

    const data = await this.youtubeService.createPlaylist(
      userId,
      workspaceId,
      playlistData.title,
      playlistData,
    );

    return { success: true, data };
  }

  @Delete('playlists/:playlistId')
  @ApiOperation({ summary: 'Delete a playlist' })
  async deletePlaylist(
    @Param('playlistId') playlistId: string,
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.youtubeService.deletePlaylist(userId, workspaceId, playlistId);

    return { success: true, data: { message: 'Playlist deleted successfully' } };
  }

  @Get('videos/:videoId')
  @ApiOperation({ summary: 'Get video by ID' })
  async getVideo(
    @Param('videoId') videoId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('part') part: string = 'snippet,statistics',
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const partArray = part.split(',');
    const data = await this.youtubeService.getVideo(userId, workspaceId, videoId, partArray);

    return { success: true, data };
  }

  @Get('videos/search')
  @ApiOperation({ summary: 'Search videos' })
  async searchVideos(
    @Query() searchDto: SearchVideosDto & { workspaceId: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const { workspaceId, q, ...options } = searchDto;

    const data = await this.youtubeService.searchVideos(userId, workspaceId, q || '', options);

    return { success: true, data };
  }

  @Get('channel/me')
  @ApiOperation({ summary: 'Get my YouTube channel info' })
  async getMyChannel(@Query('workspaceId') workspaceId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.youtubeService.getMyChannel(userId, workspaceId);

    return { success: true, data };
  }

  @Post('playlists/:playlistId/items')
  @ApiOperation({ summary: 'Add video to playlist' })
  async addToPlaylist(
    @Param('playlistId') playlistId: string,
    @Body() addItemDto: AddPlaylistItemDto & { workspaceId: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const { workspaceId, videoId, position } = addItemDto;

    const data = await this.youtubeService.addToPlaylist(
      userId,
      workspaceId,
      playlistId,
      videoId,
      position,
    );

    return { success: true, data };
  }

  @Delete('playlists/items/:playlistItemId')
  @ApiOperation({ summary: 'Remove video from playlist' })
  async removeFromPlaylist(
    @Param('playlistItemId') playlistItemId: string,
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.youtubeService.removeFromPlaylist(userId, workspaceId, playlistItemId);

    return { success: true, data: { message: 'Video removed from playlist' } };
  }

  @Post('videos/:videoId/rate')
  @ApiOperation({ summary: 'Rate a video (like/dislike)' })
  async rateVideo(
    @Param('videoId') videoId: string,
    @Body() rateDto: RateVideoDto & { workspaceId: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const { workspaceId, rating } = rateDto;

    const data = await this.youtubeService.rateVideo(userId, workspaceId, videoId, rating);

    return { success: true, data: { message: `Video ${rating}d successfully` } };
  }

  @Get('playlists/:playlistId/items')
  @ApiOperation({ summary: 'Get playlist items' })
  async getPlaylistItems(
    @Param('playlistId') playlistId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit: number = 25,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const data = await this.youtubeService.getPlaylistItems(userId, workspaceId, playlistId, limit);

    return { success: true, data };
  }
}
