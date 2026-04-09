import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChannelDto, SendMessageDto, UpdateMessageDto, CreateConversationDto, UpdateChannelDto, VotePollDto, ScheduleMessageDto, UpdateScheduledMessageDto, QueryScheduledMessagesDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { BotExecutionService } from '../bots/services/bot-execution.service';
import { BotInstallationsService } from '../bots/services/bot-installations.service';
import { BotsService } from '../bots/services/bots.service';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
@UseGuards(AuthGuard, WorkspaceGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => BotExecutionService))
    private readonly botExecutionService: BotExecutionService,
    @Inject(forwardRef(() => BotInstallationsService))
    private readonly botInstallationsService: BotInstallationsService,
    @Inject(forwardRef(() => BotsService))
    private readonly botsService: BotsService,
  ) {}

  // Channel endpoints
  @Post('channels')
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  async createChannel(
    @Param('workspaceId') workspaceId: string,
    @Body() createChannelDto: CreateChannelDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.createChannel(workspaceId, createChannelDto, userId);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get all channels in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of channels user has access to' })
  async getChannels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const channels = await this.chatService.getChannels(workspaceId, userId);
    return { data: channels };
  }

  @Get('channels/search-private')
  @ApiOperation({ summary: 'Search private channels by name' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'name', description: 'Channel name to search for', required: true })
  @ApiResponse({ status: 200, description: 'List of private channels matching search query' })
  async searchPrivateChannels(
    @Param('workspaceId') workspaceId: string,
    @Query('name') name: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.searchPrivateChannels(workspaceId, name, userId);
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get channel details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel details' })
  async getChannel(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getChannel(channelId, userId);
  }

  @Put('channels/:channelId')
  @ApiOperation({ summary: 'Update channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  async updateChannel(
    @Param('channelId') channelId: string,
    @Body() updateChannelDto: UpdateChannelDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.updateChannel(channelId, updateChannelDto, userId);
  }

  @Delete('channels/:channelId')
  @ApiOperation({ summary: 'Delete channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  async deleteChannel(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.deleteChannel(channelId, userId);
  }

  @Post('channels/:channelId/join')
  @ApiOperation({ summary: 'Join a channel (public or private)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 201, description: 'Successfully joined channel' })
  @ApiResponse({ status: 403, description: 'Not a workspace member' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async joinChannel(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.joinChannel(channelId, userId);
  }

  @Post('channels/:channelId/leave')
  @ApiOperation({ summary: 'Leave a channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Successfully left channel' })
  async leaveChannel(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.leaveChannel(channelId, userId);
  }

  @Get('channels/:channelId/members')
  @ApiOperation({ summary: 'Get channel members' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'List of channel members' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async getChannelMembers(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getChannelMembers(channelId, userId);
  }

  @Post('channels/:channelId/members')
  @ApiOperation({ summary: 'Add member(s) to channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 201, description: 'Member(s) added successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to add members' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async addChannelMembers(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Body() body: { userId?: string; userIds?: string[]; role?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.addChannelMembers(workspaceId, channelId, body, userId);
  }

  @Delete('channels/:channelId/members/:memberUserId')
  @ApiOperation({ summary: 'Remove member from channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiParam({ name: 'memberUserId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to remove members' })
  @ApiResponse({ status: 404, description: 'Channel or member not found' })
  async removeChannelMember(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.removeChannelMember(workspaceId, channelId, memberUserId, userId);
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'Get channel messages' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to fetch' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'List of channel messages' })
  async getChannelMessages(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    return this.chatService.getChannelMessages(
      channelId,
      userId,
      parseInt(limit),
      parseInt(offset)
    );
  }

  @Post('channels/:channelId/messages')
  @ApiOperation({ summary: 'Send message to channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendChannelMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    const message = await this.chatService.sendMessage(
      { ...sendMessageDto, channel_id: channelId },
      userId
    );

    // Trigger bot execution asynchronously (don't block response)
    this.botExecutionService.evaluateAndExecute({
      messageId: message.id,
      messageContent: sendMessageDto.content,
      messageContentHtml: sendMessageDto.content_html,
      channelId,
      workspaceId,
      userId,
    }).catch(err => {
      console.error('[ChatController] Bot execution error:', err.message);
    });

    return message;
  }

  @Post('channels/:channelId/read')
  @ApiOperation({ summary: 'Mark channel as read' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Channel marked as read successfully' })
  async markChannelAsRead(
    @Param('channelId') channelId: string,
    @Body() body: { lastReadMessageId?: string },
    @CurrentUser('sub') userId: string,
  ) {
    await this.chatService.markChannelAsRead(channelId, body.lastReadMessageId, userId);
    return { success: true };
  }

  @Get('channels/:channelId/unread-count')
  @ApiOperation({ summary: 'Get unread message count for channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getChannelUnreadCount(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const count = await this.chatService.getChannelUnreadCount(channelId, userId);
    return { count };
  }

  @Get('channels/:channelId/bots')
  @ApiOperation({ summary: 'Get bots installed in a channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiResponse({ status: 200, description: 'List of bots installed in the channel' })
  async getChannelBots(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
  ) {
    // Get installations for this channel
    const installations = await this.botInstallationsService.getInstallationsForChannel(channelId);

    // Get full bot details for each installation
    const bots = await Promise.all(
      installations.map(async (installation) => {
        try {
          const bot = await this.botsService.findOne(installation.botId, workspaceId);
          return {
            ...bot,
            installation: {
              id: installation.id,
              isActive: installation.isActive,
              settingsOverride: installation.settingsOverride,
              installedAt: installation.installedAt,
            },
          };
        } catch (error) {
          // Bot may have been deleted, skip it
          return null;
        }
      })
    );

    // Filter out null values (deleted bots)
    return { data: bots.filter(bot => bot !== null) };
  }

  // Conversation endpoints
  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @Param('workspaceId') workspaceId: string,
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.createConversation(workspaceId, createConversationDto, userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const conversations = await this.chatService.getConversations(workspaceId, userId);
    return { data: conversations };
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Delete a conversation (archive it)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant in this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.deleteConversation(conversationId, userId);
  }

  @Post('conversations/:conversationId/star')
  @ApiOperation({ summary: 'Star a conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Conversation starred successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant in this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async starConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.starConversation(conversationId, userId);
  }

  @Delete('conversations/:conversationId/star')
  @ApiOperation({ summary: 'Unstar a conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation unstarred successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant in this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async unstarConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.unstarConversation(conversationId, userId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to fetch' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'List of conversation messages' })
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    return this.chatService.getConversationMessages(
      conversationId,
      userId,
      parseInt(limit),
      parseInt(offset)
    );
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send message to conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendConversationMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    const message = await this.chatService.sendMessage(
      { ...sendMessageDto, conversation_id: conversationId },
      userId
    );

    // Trigger bot execution asynchronously (don't block response)
    this.botExecutionService.evaluateAndExecute({
      messageId: message.id,
      messageContent: sendMessageDto.content,
      messageContentHtml: sendMessageDto.content_html,
      conversationId,
      workspaceId,
      userId,
    }).catch(err => {
      console.error('[ChatController] Bot execution error:', err.message);
    });

    return message;
  }

  @Post('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read successfully' })
  async markConversationAsRead(
    @Param('conversationId') conversationId: string,
    @Body() body: { lastReadMessageId?: string },
    @CurrentUser('sub') userId: string,
  ) {
    await this.chatService.markConversationAsRead(conversationId, body.lastReadMessageId, userId);
    return { success: true };
  }

  @Get('conversations/:conversationId/unread-count')
  @ApiOperation({ summary: 'Get unread message count for conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getConversationUnreadCount(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const count = await this.chatService.getConversationUnreadCount(conversationId, userId);
    return { count };
  }

  @Get('conversations/:conversationId/members')
  @ApiOperation({ summary: 'Get conversation members' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'List of conversation members' })
  async getConversationMembers(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getConversationMembers(conversationId, userId);
  }

  @Get('conversations/:conversationId/bots')
  @ApiOperation({ summary: 'Get bots installed in a conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'List of bots installed in the conversation' })
  async getConversationBots(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    // Get installations for this conversation
    const installations = await this.botInstallationsService.getInstallationsForConversation(conversationId);

    // Get full bot details for each installation
    const bots = await Promise.all(
      installations.map(async (installation) => {
        try {
          const bot = await this.botsService.findOne(installation.botId, workspaceId);
          return {
            ...bot,
            installation: {
              id: installation.id,
              isActive: installation.isActive,
              settingsOverride: installation.settingsOverride,
              installedAt: installation.installedAt,
            },
          };
        } catch (error) {
          // Bot may have been deleted, skip it
          return null;
        }
      })
    );

    // Filter out null values (deleted bots)
    return { data: bots.filter(bot => bot !== null) };
  }

  // Message operations
  @Patch('messages/:messageId')
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.updateMessage(messageId, updateMessageDto, userId);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.deleteMessage(messageId, userId);
  }

  @Post('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Add reaction to message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'emoji', description: 'Emoji reaction' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  async addReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.addReaction(messageId, emoji, userId);
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'emoji', description: 'Emoji reaction' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  async removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.removeReaction(messageId, emoji, userId);
  }

  // Bookmark endpoints
  @Post('messages/:messageId/bookmark')
  @ApiOperation({ summary: 'Bookmark a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 201, description: 'Message bookmarked successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async bookmarkMessage(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.bookmarkMessage(messageId, userId);
  }

  @Delete('messages/:messageId/bookmark')
  @ApiOperation({ summary: 'Remove bookmark from message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Bookmark removed successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async removeBookmark(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.removeBookmark(messageId, userId);
  }

  @Get('conversations/:conversationId/bookmarks')
  @ApiOperation({ summary: 'Get all bookmarked messages in a conversation or channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID or Channel ID' })
  @ApiResponse({
    status: 200,
    description: 'List of all bookmarked messages',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' }
      }
    }
  })
  async getBookmarkedMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getBookmarkedMessages(conversationId, userId);
  }

  @Get('channels/:channelId/bookmarks')
  @ApiOperation({ summary: 'Get all bookmarked messages in a channel' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of bookmarked messages with pagination',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  async getChannelBookmarkedMessages(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.chatService.getChannelBookmarkedMessages(
      channelId,
      userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  // Pin message endpoints
  @Post('conversations/:conversationId/messages/:messageId/pin')
  @ApiOperation({ summary: 'Pin a message in a conversation (unpins any previously pinned message)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID to pin' })
  @ApiResponse({ status: 201, description: 'Message pinned successfully' })
  @ApiResponse({ status: 404, description: 'Message or conversation not found' })
  @ApiResponse({ status: 403, description: 'Not a member of this conversation' })
  async pinMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.pinMessage(conversationId, messageId, userId);
  }

  @Delete('conversations/:conversationId/messages/:messageId/pin')
  @ApiOperation({ summary: 'Unpin a message from a conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID to unpin' })
  @ApiResponse({ status: 200, description: 'Message unpinned successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async unpinMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.unpinMessage(conversationId, messageId, userId);
  }

  @Get('conversations/:conversationId/pinned')
  @ApiOperation({ summary: 'Get pinned message in a conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Pinned message (or null if none)' })
  async getPinnedMessage(
    @Param('conversationId') conversationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getPinnedMessage(conversationId, userId);
  }

  // Read receipts endpoints
  @Get('messages/:messageId/read-receipts')
  @ApiOperation({ summary: 'Get read receipts for a message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'List of read receipts' })
  async getMessageReadReceipts(
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const receipts = await this.chatService.getMessageReadReceipts(messageId, userId);
    return { data: receipts };
  }

  // Poll endpoints
  @Post('messages/:messageId/polls/:pollId/vote')
  @ApiOperation({ summary: 'Vote on a poll' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID containing the poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 201, description: 'Vote recorded successfully' })
  @ApiResponse({ status: 400, description: 'Already voted or poll is closed' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async votePoll(
    @Param('messageId') messageId: string,
    @Param('pollId') pollId: string,
    @Body() votePollDto: VotePollDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.votePoll(messageId, pollId, votePollDto.optionId, userId);
  }

  @Post('messages/:messageId/polls/:pollId/close')
  @ApiOperation({ summary: 'Close a poll (creator only)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID containing the poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll closed successfully' })
  @ApiResponse({ status: 403, description: 'Only poll creator can close the poll' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async closePoll(
    @Param('messageId') messageId: string,
    @Param('pollId') pollId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.closePoll(messageId, pollId, userId);
  }

  @Get('messages/:messageId/polls/:pollId')
  @ApiOperation({ summary: 'Get poll with user vote status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID containing the poll' })
  @ApiParam({ name: 'pollId', description: 'Poll ID' })
  @ApiResponse({ status: 200, description: 'Poll data with user vote status' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  async getPoll(
    @Param('messageId') messageId: string,
    @Param('pollId') pollId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getPoll(messageId, pollId, userId);
  }

  // Scheduled message endpoints
  @Post('scheduled-messages')
  @ApiOperation({ summary: 'Schedule a message to be sent later' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Message scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid scheduled time' })
  async scheduleMessage(
    @Param('workspaceId') workspaceId: string,
    @Body() scheduleMessageDto: ScheduleMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.scheduleMessage(workspaceId, scheduleMessageDto, userId);
  }

  @Get('scheduled-messages')
  @ApiOperation({ summary: 'Get user scheduled messages' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (pending, sent, cancelled, failed)' })
  @ApiQuery({ name: 'channelId', required: false, description: 'Filter by channel ID' })
  @ApiQuery({ name: 'conversationId', required: false, description: 'Filter by conversation ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to fetch' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'List of scheduled messages' })
  async getScheduledMessages(
    @Param('workspaceId') workspaceId: string,
    @Query() query: QueryScheduledMessagesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getScheduledMessages(workspaceId, userId, query);
  }

  @Get('scheduled-messages/:scheduledMessageId')
  @ApiOperation({ summary: 'Get a scheduled message by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'scheduledMessageId', description: 'Scheduled message ID' })
  @ApiResponse({ status: 200, description: 'Scheduled message details' })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async getScheduledMessage(
    @Param('scheduledMessageId') scheduledMessageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.getScheduledMessage(scheduledMessageId, userId);
  }

  @Put('scheduled-messages/:scheduledMessageId')
  @ApiOperation({ summary: 'Update a scheduled message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'scheduledMessageId', description: 'Scheduled message ID' })
  @ApiResponse({ status: 200, description: 'Scheduled message updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-pending message or invalid scheduled time' })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async updateScheduledMessage(
    @Param('scheduledMessageId') scheduledMessageId: string,
    @Body() updateDto: UpdateScheduledMessageDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.updateScheduledMessage(scheduledMessageId, updateDto, userId);
  }

  @Delete('scheduled-messages/:scheduledMessageId')
  @ApiOperation({ summary: 'Cancel a scheduled message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'scheduledMessageId', description: 'Scheduled message ID' })
  @ApiResponse({ status: 200, description: 'Scheduled message cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-pending message' })
  @ApiResponse({ status: 404, description: 'Scheduled message not found' })
  async cancelScheduledMessage(
    @Param('scheduledMessageId') scheduledMessageId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.chatService.cancelScheduledMessage(scheduledMessageId, userId);
  }
}