import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
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
import { SlackService } from './slack.service';
import { SlackOAuthService } from './slack-oauth.service';
import {
  SlackOAuthCallbackDto,
  SlackConnectionDto,
  ListChannelsResponseDto,
  ListMessagesQueryDto,
  ListMessagesResponseDto,
  SlackSendMessageDto,
  SendMessageResponseDto,
  ListUsersResponseDto,
  ListFilesQueryDto,
  ListFilesResponseDto,
  SearchQueryDto,
  SearchResultDto,
  AddReactionDto,
} from './dto/slack.dto';
import { Response } from 'express';

@ApiTags('Slack')
@Controller('workspaces/:workspaceId/slack')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class SlackController {
  private readonly logger = new Logger(SlackController.name);

  constructor(
    private readonly slackService: SlackService,
    private readonly slackOAuthService: SlackOAuthService,
  ) {}

  // ==========================================================================
  // OAuth & Connection
  // ==========================================================================

  @Get('auth/url')
  @ApiOperation({ summary: 'Get Slack OAuth authorization URL' })
  @ApiResponse({ status: 200, description: 'Returns the authorization URL' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'returnUrl', required: false, description: 'URL to redirect after OAuth' })
  async getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ): Promise<{ authorizationUrl: string; state: string }> {
    const authUrl = this.slackOAuthService.getAuthorizationUrl(workspaceId, userId, returnUrl);
    const state = this.slackOAuthService.generateState(workspaceId, userId, returnUrl);

    return {
      authorizationUrl: authUrl,
      state,
    };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get current Slack connection' })
  @ApiResponse({ status: 200, description: 'Returns the connection details', type: SlackConnectionDto })
  @ApiResponse({ status: 404, description: 'No connection found' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: SlackConnectionDto | null }> {
    const connection = await this.slackService.getConnection(workspaceId, userId);
    return { data: connection };
  }

  @Delete('disconnect')
  @ApiOperation({ summary: 'Disconnect Slack' })
  @ApiResponse({ status: 200, description: 'Successfully disconnected' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @HttpCode(HttpStatus.OK)
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.slackService.disconnect(workspaceId, userId);
    return { message: 'Successfully disconnected from Slack' };
  }

  // ==========================================================================
  // Channels
  // ==========================================================================

  @Get('channels')
  @ApiOperation({ summary: 'List Slack channels' })
  @ApiResponse({ status: 200, description: 'Returns list of channels', type: ListChannelsResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listChannels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<{ data: ListChannelsResponseDto }> {
    const result = await this.slackService.listChannels(workspaceId, userId, cursor, limit);
    return { data: result };
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get channel info' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  async getChannel(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const channel = await this.slackService.getChannel(workspaceId, userId, channelId);
    return { data: channel };
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  @Get('messages')
  @ApiOperation({ summary: 'List messages in a channel' })
  @ApiResponse({ status: 200, description: 'Returns list of messages', type: ListMessagesResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async listMessages(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<{ data: ListMessagesResponseDto }> {
    const result = await this.slackService.listMessages(workspaceId, userId, query);
    return { data: result };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent', type: SendMessageResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async sendMessage(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SlackSendMessageDto,
  ): Promise<{ data: SendMessageResponseDto }> {
    const result = await this.slackService.sendMessage(workspaceId, userId, dto);
    return { data: result };
  }

  @Patch('messages/:channelId/:ts')
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiParam({ name: 'ts', description: 'Message timestamp' })
  async updateMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('ts') ts: string,
    @CurrentUser('sub') userId: string,
    @Body('text') text: string,
  ): Promise<{ data: { ok: boolean } }> {
    const result = await this.slackService.updateMessage(workspaceId, userId, channelId, ts, text);
    return { data: result };
  }

  @Delete('messages/:channelId/:ts')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiParam({ name: 'ts', description: 'Message timestamp' })
  async deleteMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('ts') ts: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ data: { ok: boolean } }> {
    const result = await this.slackService.deleteMessage(workspaceId, userId, channelId, ts);
    return { data: result };
  }

  // ==========================================================================
  // Reactions
  // ==========================================================================

  @Post('reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async addReaction(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AddReactionDto,
  ): Promise<{ data: { ok: boolean } }> {
    const result = await this.slackService.addReaction(
      workspaceId,
      userId,
      dto.channel,
      dto.timestamp,
      dto.name,
    );
    return { data: result };
  }

  @Delete('reactions')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async removeReaction(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AddReactionDto,
  ): Promise<{ data: { ok: boolean } }> {
    const result = await this.slackService.removeReaction(
      workspaceId,
      userId,
      dto.channel,
      dto.timestamp,
      dto.name,
    );
    return { data: result };
  }

  // ==========================================================================
  // Users
  // ==========================================================================

  @Get('users')
  @ApiOperation({ summary: 'List Slack workspace users' })
  @ApiResponse({ status: 200, description: 'Returns list of users', type: ListUsersResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listUsers(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<{ data: ListUsersResponseDto }> {
    const result = await this.slackService.listUsers(workspaceId, userId, cursor, limit);
    return { data: result };
  }

  @Get('users/:slackUserId')
  @ApiOperation({ summary: 'Get user info' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'slackUserId', description: 'Slack User ID' })
  async getUser(
    @Param('workspaceId') workspaceId: string,
    @Param('slackUserId') slackUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const user = await this.slackService.getUser(workspaceId, userId, slackUserId);
    return { data: user };
  }

  // ==========================================================================
  // Files
  // ==========================================================================

  @Get('files')
  @ApiOperation({ summary: 'List files' })
  @ApiResponse({ status: 200, description: 'Returns list of files', type: ListFilesResponseDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async listFiles(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListFilesQueryDto,
  ): Promise<{ data: ListFilesResponseDto }> {
    const result = await this.slackService.listFiles(workspaceId, userId, query);
    return { data: result };
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get file info' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  async getFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const file = await this.slackService.getFile(workspaceId, userId, fileId);
    return { data: file };
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  @Get('search')
  @ApiOperation({ summary: 'Search messages and files' })
  @ApiResponse({ status: 200, description: 'Returns search results', type: SearchResultDto })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async search(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: SearchQueryDto,
  ): Promise<{ data: SearchResultDto }> {
    const result = await this.slackService.search(workspaceId, userId, query);
    return { data: result };
  }
}

// ==========================================================================
// OAuth Callback Controller (Public - No Auth Required)
// ==========================================================================

@ApiTags('Slack')
@Controller('integrations/slack')
export class SlackCallbackController {
  private readonly logger = new Logger(SlackCallbackController.name);

  constructor(private readonly slackService: SlackService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Handle Slack OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to return URL or default page' })
  async handleCallback(
    @Query() query: SlackOAuthCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { connection, returnUrl } = await this.slackService.handleOAuthCallback(
        query.code,
        query.state || '',
      );

      this.logger.log(`Slack connected successfully for user ${connection.userId}`);

      // Redirect to return URL or default page
      const redirectUrl = returnUrl || '/apps?slack=connected';
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Slack OAuth callback error:', error);
      res.redirect('/apps?slack=error&message=' + encodeURIComponent(error.message));
    }
  }
}
