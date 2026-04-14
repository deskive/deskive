import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateChannelDto,
  SendMessageDto,
  UpdateMessageDto,
  CreateConversationDto,
  UpdateChannelDto,
} from './dto';
import { AppGateway } from '../../common/gateways/app.gateway';
import { ChatGateway } from './gateways/chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';
import { BotMessageHandlerService } from '../bots/services/bot-message-handler.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly db: DatabaseService,
    private appGateway: AppGateway,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => BotMessageHandlerService))
    private botMessageHandler: BotMessageHandlerService,
  ) {}

  /**
   * Strip HTML from message content and convert mention spans to readable @username format
   * Used for notification previews
   */
  private stripHtmlForNotification(html: string): string {
    if (!html) return '';

    // Convert mention spans to @username format
    // <span class="mention-highlight" data-mention="username">@username</span> -> @username
    let text = html.replace(/<span[^>]*data-mention="([^"]*)"[^>]*>@[^<]*<\/span>/gi, '@$1');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Collapse multiple spaces and trim
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  // Channel operations
  async createChannel(workspaceId: string, createChannelDto: CreateChannelDto, userId: string) {
    // Check if user is workspace owner or admin
    const membershipResult = await this.db.findMany('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipResult.data) ? membershipResult.data : [];
    if (membershipData.length === 0) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const membership = membershipData[0];
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new ForbiddenException('Only workspace owners and admins can create channels');
    }

    // Check if channel name already exists in workspace
    const existingChannelsResult = await this.db.findMany('channels', {
      workspace_id: workspaceId,
      name: createChannelDto.name,
      is_archived: false,
    });

    const existingChannelsData = Array.isArray(existingChannelsResult.data)
      ? existingChannelsResult.data
      : [];
    if (existingChannelsData.length > 0) {
      throw new BadRequestException('Channel name already exists in this workspace');
    }

    // Create channel (exclude member_ids from database insert)
    const { member_ids, ...channelFields } = createChannelDto;
    const channelData = {
      ...channelFields,
      workspace_id: workspaceId,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const channel = await this.db.insert('channels', channelData);

    // Collect member IDs for notifications (exclude creator)
    const memberIdsForNotification: string[] = [];

    // If channel is public, add all workspace members
    if (!createChannelDto.is_private) {
      // Get all workspace members
      const workspaceMembersResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
      });

      const workspaceMembers = Array.isArray(workspaceMembersResult.data)
        ? workspaceMembersResult.data
        : [];

      // Add all workspace members to the channel
      for (const member of workspaceMembers) {
        await this.db.insert('channel_members', {
          channel_id: channel.id,
          user_id: member.user_id,
          role: member.user_id === userId ? 'admin' : 'member',
          joined_at: new Date().toISOString(),
        });

        // Add to notification list (exclude creator)
        if (member.user_id !== userId) {
          memberIdsForNotification.push(member.user_id);
        }
      }
    } else {
      // For private channels, add the creator as admin
      await this.db.insert('channel_members', {
        channel_id: channel.id,
        user_id: userId,
        role: 'admin',
        joined_at: new Date().toISOString(),
      });

      // Add selected members if member_ids are provided
      if (createChannelDto.member_ids && createChannelDto.member_ids.length > 0) {
        for (const memberId of createChannelDto.member_ids) {
          // Skip if the member is the creator (already added as admin)
          if (memberId === userId) {
            continue;
          }

          // Verify that the user is a workspace member before adding
          const workspaceMemberResult = await this.db.findMany('workspace_members', {
            workspace_id: workspaceId,
            user_id: memberId,
          });

          const workspaceMemberData = Array.isArray(workspaceMemberResult.data)
            ? workspaceMemberResult.data
            : [];

          if (workspaceMemberData.length > 0) {
            await this.db.insert('channel_members', {
              channel_id: channel.id,
              user_id: memberId,
              role: 'member',
              joined_at: new Date().toISOString(),
            });

            // Add to notification list
            memberIdsForNotification.push(memberId);
          }
        }
      }
    }

    // Send notifications to all members except the creator
    if (memberIdsForNotification.length > 0) {
      const notificationTitle = createChannelDto.is_private
        ? `Added to private channel #${channel.name}`
        : `New channel created: #${channel.name}`;

      const notificationMessage = createChannelDto.is_private
        ? `You have been added to the private channel #${channel.name}`
        : `A new public channel #${channel.name} has been created in the workspace`;

      try {
        // Send notification to all members at once
        await this.notificationsService.sendNotification({
          user_ids: memberIdsForNotification,
          type: NotificationType.CHANNEL_CREATED,
          title: notificationTitle,
          message: notificationMessage,
          action_url: `/workspaces/${workspaceId}/chat?channel=${channel.id}`,
          data: {
            workspace_id: workspaceId,
            channel_id: channel.id,
            channel_name: channel.name,
            channel_type: channel.type,
            is_private: channel.is_private,
            created_by: userId,
          },
          send_push: true,
          send_email: false,
        });
      } catch (error) {
        console.error(`Failed to send channel creation notifications:`, error);
        // Continue even if notifications fail - channel is already created
      }
    }

    return channel;
  }

  async getChannels(workspaceId: string, userId: string) {
    // Get user's channel memberships first
    const membershipResult = await this.db.findMany('channel_members', {
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipResult.data) ? membershipResult.data : [];
    const memberChannelIds = membershipData.map((m) => m.channel_id);

    // If user has no memberships, return empty array
    if (memberChannelIds.length === 0) {
      return [];
    }

    // Get all channels in the workspace (both public and private)
    const allChannelsResult = await this.db.findMany('channels', {
      workspace_id: workspaceId,
      is_archived: false,
    });

    const allChannelsData = Array.isArray(allChannelsResult.data) ? allChannelsResult.data : [];

    // Filter to only channels where user is a member
    const allChannels = allChannelsData.filter((channel) => memberChannelIds.includes(channel.id));

    // Add member count to each channel
    const channelsWithMemberCount = await Promise.all(
      allChannels.map(async (channel) => {
        // Get member count for this channel
        const membersResult = await this.db.findMany('channel_members', {
          channel_id: channel.id,
        });
        const members = Array.isArray(membersResult.data) ? membersResult.data : [];

        return {
          ...channel,
          member_count: members.length,
        };
      }),
    );

    return channelsWithMemberCount;
  }

  async searchChannels(workspaceId: string, query: string, userId: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Get all non-archived channels in the workspace
    const allChannelsResult = await this.db.findMany('channels', {
      workspace_id: workspaceId,
      is_archived: false,
    });

    const allChannels = Array.isArray(allChannelsResult.data) ? allChannelsResult.data : [];

    // Filter channels by search query (case-insensitive)
    const searchTerm = query.toLowerCase().trim();
    const matchingChannels = allChannels.filter((channel) => {
      const nameMatch = channel.name.toLowerCase().includes(searchTerm);
      const descriptionMatch = channel.description?.toLowerCase().includes(searchTerm);
      return nameMatch || descriptionMatch;
    });

    // Get user's channel memberships to mark which channels they're already in
    const membershipResult = await this.db.findMany('channel_members', {
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipResult.data) ? membershipResult.data : [];
    const memberChannelIds = membershipData.map((m) => m.channel_id);

    // Add is_member flag to each channel
    return matchingChannels.map((channel) => ({
      ...channel,
      is_member: memberChannelIds.includes(channel.id),
    }));
  }

  async searchPrivateChannels(workspaceId: string, name: string, userId: string) {
    if (!name || name.trim().length === 0) {
      return [];
    }

    // Get all private channels in the workspace
    const privateChannelsResult = await this.db.findMany('channels', {
      workspace_id: workspaceId,
      is_archived: false,
      is_private: true,
    });

    const privateChannels = Array.isArray(privateChannelsResult.data)
      ? privateChannelsResult.data
      : [];

    // Filter by name (case-insensitive)
    const searchTerm = name.toLowerCase().trim();
    const matchingChannels = privateChannels.filter((channel) =>
      channel.name.toLowerCase().includes(searchTerm),
    );

    // Get user's channel memberships to mark which channels they're already in
    const membershipResult = await this.db.findMany('channel_members', {
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipResult.data) ? membershipResult.data : [];
    const memberChannelIds = membershipData.map((m) => m.channel_id);

    // Add is_member flag and member_count to each channel
    const channelsWithDetails = await Promise.all(
      matchingChannels.map(async (channel) => {
        // Get member count for this channel
        const membersResult = await this.db.findMany('channel_members', {
          channel_id: channel.id,
        });
        const members = Array.isArray(membersResult.data) ? membersResult.data : [];

        return {
          ...channel,
          is_member: memberChannelIds.includes(channel.id),
          member_count: members.length,
        };
      }),
    );

    return channelsWithDetails;
  }

  async getChannel(channelId: string, userId: string) {
    // Check if user has access to channel
    await this.checkChannelAccess(channelId, userId);

    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });

    const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
    if (channelData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    return channelData[0];
  }

  async updateChannel(channelId: string, updateChannelDto: UpdateChannelDto, userId: string) {
    // Check if channel exists and user has access
    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });

    const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
    if (channelData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    const channel = channelData[0];

    // Check if user is channel admin or workspace owner
    const membershipQueryResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (
      membershipData.length === 0 ||
      (membershipData[0].role !== 'admin' && membershipData[0].role !== 'owner')
    ) {
      throw new ForbiddenException('Only channel admins can update the channel');
    }

    // Check if new name conflicts with existing channels (if name is being changed)
    if (updateChannelDto.name && updateChannelDto.name !== channel.name) {
      const existingChannelsResult = await this.db.findMany('channels', {
        workspace_id: channel.workspace_id,
        name: updateChannelDto.name,
        is_archived: false,
      });

      const existingChannelsData = Array.isArray(existingChannelsResult.data)
        ? existingChannelsResult.data
        : [];
      if (existingChannelsData.length > 0 && existingChannelsData[0].id !== channelId) {
        throw new BadRequestException('Channel name already exists in this workspace');
      }
    }

    // Prepare update data (exclude member_ids from channel update)
    const { member_ids, ...channelUpdateData } = updateChannelDto;

    const updateData = {
      ...channelUpdateData,
      updated_at: new Date().toISOString(),
    };

    // Check if channel is transitioning from private to public
    const isTransitioningToPublic = channel.is_private && updateChannelDto.is_private === false;

    // Update channel
    const updatedChannel = await this.db.update('channels', channelId, updateData);

    // Handle member management based on channel privacy changes
    if (isTransitioningToPublic) {
      // Channel is being made public - add all workspace members who aren't already members
      console.log(
        '🔓 [Chat Service] Channel transitioning from private to public, adding all workspace members',
      );

      // Get all workspace members
      const workspaceMembersResult = await this.db.findMany('workspace_members', {
        workspace_id: channel.workspace_id,
      });
      const workspaceMembers = Array.isArray(workspaceMembersResult.data)
        ? workspaceMembersResult.data
        : [];

      // Get current channel members
      const currentMembersResult = await this.db.findMany('channel_members', {
        channel_id: channelId,
      });
      const currentMembers = Array.isArray(currentMembersResult.data)
        ? currentMembersResult.data
        : [];
      const currentMemberIds = currentMembers.map((m) => m.user_id);

      // Add all workspace members who aren't already channel members
      for (const workspaceMember of workspaceMembers) {
        if (!currentMemberIds.includes(workspaceMember.user_id)) {
          await this.db.insert('channel_members', {
            channel_id: channelId,
            user_id: workspaceMember.user_id,
            role: 'member',
            joined_at: new Date().toISOString(),
          });
          console.log(
            `✅ [Chat Service] Added workspace member ${workspaceMember.user_id} to channel`,
          );
        }
      }
    } else if (member_ids !== undefined && updateChannelDto.is_private) {
      // Update channel members if member_ids is provided and channel is/remains private
      // Get current channel members (excluding the owner/admin making the update)
      const currentMembersResult = await this.db.findMany('channel_members', {
        channel_id: channelId,
      });

      const currentMembers = Array.isArray(currentMembersResult.data)
        ? currentMembersResult.data
        : [];

      // Get all current member IDs except the admin making the update
      const currentMemberIds = currentMembers
        .filter((m) => m.user_id !== userId)
        .map((m) => m.user_id);

      // Ensure the admin/owner is always included in the member list
      const newMemberIds = [...new Set([userId, ...member_ids])];

      // Find members to add (in new list but not in current)
      const membersToAdd = newMemberIds.filter(
        (id) => !currentMemberIds.includes(id) && id !== userId,
      );

      // Find members to remove (in current list but not in new list, and not the admin)
      const membersToRemove = currentMemberIds.filter((id) => !newMemberIds.includes(id));

      // Add new members
      for (const memberId of membersToAdd) {
        await this.db.insert('channel_members', {
          channel_id: channelId,
          user_id: memberId,
          role: 'member',
          joined_at: new Date().toISOString(),
        });
      }

      // Remove members no longer in the list
      for (const memberId of membersToRemove) {
        const memberToRemove = currentMembers.find((m) => m.user_id === memberId);
        if (memberToRemove) {
          // Use query builder since ID is UUID, not integer
          await this.db
            .table('channel_members')
            .delete()
            .where('id', '=', memberToRemove.id)
            .execute();
        }
      }
    }

    return updatedChannel;
  }

  async deleteChannel(channelId: string, userId: string) {
    // Check if channel exists
    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });

    const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
    if (channelData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    const channel = channelData[0];

    // Check if user is workspace owner
    const workspaceQueryResult = await this.db.findMany('workspaces', {
      id: channel.workspace_id,
    });

    const workspaceData = Array.isArray(workspaceQueryResult.data) ? workspaceQueryResult.data : [];
    if (workspaceData.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const workspace = workspaceData[0];

    // Only workspace owner can delete channels
    if (workspace.owner_id !== userId) {
      throw new ForbiddenException('Only workspace owner can delete channels');
    }

    // Archive the channel instead of hard delete to preserve messages
    const updatedChannel = await this.db.update('channels', channelId, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });

    // Emit WebSocket event to notify all workspace members
    console.log(
      `[ChatService] Emitting channel:deleted event for channel ${channelId} in workspace ${workspace.id}`,
    );
    this.appGateway.emitToRoom(`workspace:${workspace.id}`, 'channel:deleted', {
      channelId: channelId,
      workspaceId: workspace.id,
      channelName: channel.name,
    });

    return updatedChannel;
  }

  async getChannelMessages(
    channelId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Check if user has access to channel
    await this.checkChannelAccess(channelId, userId);

    console.log('[ChatService] getChannelMessages called:', { channelId, userId, limit, offset });

    // Query messages and filter out deleted ones
    const messagesQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('channel_id', '=', channelId)
      .execute();

    console.log('[ChatService] Messages query result:', {
      hasData: !!messagesQueryResult.data,
      dataLength: Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data.length : 0,
    });

    // Filter out deleted messages manually (is_deleted might be true, false, or null)
    const messagesData = Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data : [];
    const nonDeletedMessages = messagesData.filter((msg) => msg.is_deleted !== true);
    const sortedMessages = nonDeletedMessages
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    console.log('[ChatService] Messages count:', {
      total: messagesData.length,
      nonDeleted: nonDeletedMessages.length,
      afterPagination: sortedMessages.length,
    });

    // Fetch user info for each message and parse JSON fields
    const messagesWithUsers = await Promise.all(
      sortedMessages.map(async (message) => {
        let user = null;

        // Handle bot messages specially - format is "bot" or "bot:{botId}"
        if (message.user_id === 'bot' || message.user_id?.startsWith('bot:')) {
          // Try to look up bot details if we have a bot ID
          const botId = message.user_id?.startsWith('bot:') ? message.user_id.split(':')[1] : null;

          if (botId) {
            try {
              const botResult = await this.db.findMany('bots', { id: botId });
              const bots = Array.isArray(botResult.data) ? botResult.data : [];
              if (bots.length > 0) {
                const bot = bots[0];
                user = {
                  id: message.user_id,
                  name: bot.display_name || bot.name || 'Bot',
                  email: '',
                  avatarUrl: bot.avatar_url || null,
                  isBot: true,
                };
              }
            } catch (error) {
              console.warn('[ChatService] Could not fetch bot info:', error.message);
            }
          }

          // Fallback if bot lookup failed
          if (!user) {
            user = {
              id: message.user_id,
              name: 'Bot',
              email: '',
              avatarUrl: null,
              isBot: true,
            };
          }
        } else {
          try {
            const userInfo: any = await this.db.getUserById(message.user_id);
            if (userInfo) {
              // Extract metadata for additional profile fields (same pattern as auth service)
              const metadata = userInfo.metadata || {};

              user = {
                id: userInfo.id,
                // Priority: metadata.name -> fullName -> name -> email prefix
                name:
                  metadata.name ||
                  (userInfo as any).fullName ||
                  userInfo.name ||
                  userInfo.email?.split('@')[0] ||
                  'User',
                email: userInfo.email,
                avatarUrl: metadata.avatarUrl || userInfo.avatar_url || userInfo.avatarUrl || null,
              };
            }
          } catch (error) {
            console.warn(
              '[ChatService] Could not fetch user info for message:',
              message.id,
              error.message,
            );
            user = {
              id: message.user_id,
              name: 'User',
              email: '',
              avatarUrl: null,
            };
          }
        }

        // Get read receipt count for this message
        let readByCount = 0;
        try {
          const receiptsResult = await this.db.findMany('message_read_receipts', {
            message_id: message.id,
          });
          const receipts = Array.isArray(receiptsResult.data) ? receiptsResult.data : [];
          readByCount = receipts.length;
        } catch (error) {
          console.warn('[ChatService] Could not fetch read receipt count for message:', message.id);
        }

        // Fetch reactions from message_reactions table
        const reactions = await this.getMessageReactions(message.id);

        // Parse linked_content
        const parsedLinkedContent =
          typeof message.linked_content === 'string'
            ? JSON.parse(message.linked_content)
            : message.linked_content || [];

        // Enrich polls with user vote status
        const enrichedLinkedContent = await this.enrichLinkedContentWithUserVotes(
          parsedLinkedContent,
          message.id,
          userId,
        );

        return {
          ...message,
          user,
          read_by_count: readByCount,
          attachments:
            typeof message.attachments === 'string'
              ? JSON.parse(message.attachments)
              : message.attachments || [],
          mentions:
            typeof message.mentions === 'string'
              ? JSON.parse(message.mentions)
              : message.mentions || [],
          linked_content: enrichedLinkedContent,
          reactions,
        };
      }),
    );

    console.log('[ChatService] Returning messages with user info:', messagesWithUsers.length);
    return messagesWithUsers;
  }

  // Conversation operations
  async createConversation(
    workspaceId: string,
    createConversationDto: CreateConversationDto,
    userId: string,
  ) {
    // Validate participants array length (DTO validation should catch this, but double-check)
    if (createConversationDto.participants.length !== 1) {
      throw new BadRequestException('Direct conversations must have exactly one other participant');
    }

    const otherParticipantId = createConversationDto.participants[0];

    // Ensure user is not trying to create a conversation with themselves
    if (otherParticipantId === userId) {
      throw new BadRequestException('Cannot create a conversation with yourself');
    }

    // Verify the other participant is either a workspace member OR a bot
    const workspaceMember = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: otherParticipantId,
    });

    // If not a workspace member, check if it's a bot
    if (!workspaceMember) {
      const bot = await this.db.findOne('bots', {
        id: otherParticipantId,
        workspace_id: workspaceId,
        status: 'active',
      });

      if (!bot) {
        throw new NotFoundException(
          'The specified user is not a member of this workspace and is not an active bot',
        );
      }
    }

    // Get all participants including the current user (exactly 2 people)
    const allParticipants = [userId, otherParticipantId].sort();

    // Check if a conversation with these exact participants already exists in this workspace
    const existingConversationsResult = await this.db.findMany('conversations', {
      workspace_id: workspaceId,
    });

    const existingConversationsData = Array.isArray(existingConversationsResult.data)
      ? existingConversationsResult.data
      : [];

    // Check each conversation to see if it has the same participants
    for (const existingConv of existingConversationsData) {
      let existingParticipants: string[];

      try {
        existingParticipants =
          typeof existingConv.participants === 'string'
            ? JSON.parse(existingConv.participants)
            : existingConv.participants;
      } catch {
        continue; // Skip if participants can't be parsed
      }

      // Sort and compare participants
      const sortedExisting = [...existingParticipants].sort();

      // If the participants match exactly, return the existing conversation instead of creating a new one
      if (JSON.stringify(sortedExisting) === JSON.stringify(allParticipants)) {
        console.log('Conversation with these participants already exists:', existingConv.id);
        return existingConv;
      }
    }

    // No existing conversation found, create a new one
    const conversationData = {
      ...createConversationDto,
      workspace_id: workspaceId,
      created_by: userId,
      participants: JSON.stringify(allParticipants),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const conversation = await this.db.insert('conversations', conversationData);

    // Add all participants as conversation members (exactly 2 people)
    for (const participantId of allParticipants) {
      await this.db.insert('conversation_members', {
        conversation_id: conversation.id,
        user_id: participantId,
        joined_at: new Date().toISOString(),
      });
    }

    return conversation;
  }

  async getConversations(workspaceId: string, userId: string) {
    // Get all conversations where user is a member
    const membershipQueryResult = await this.db.findMany(
      'conversation_members',
      {
        user_id: userId,
      },
      { limit: 1000 },
    ); // Increase limit to ensure we get all memberships

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      return [];
    }

    // Create a map of conversation_id to membership data (for starred info)
    const membershipMap = new Map<string, { isStarred: boolean; starredAt: string | null }>();
    membershipData.forEach((m) => {
      membershipMap.set(m.conversation_id, {
        isStarred: m.is_starred === true,
        starredAt: m.starred_at || null,
      });
    });

    const conversationIds = membershipData.map((m) => m.conversation_id);

    // Fetch each conversation individually to avoid pagination issues
    const conversationPromises = conversationIds.map(async (convId) => {
      try {
        const conversation = await this.db.findOne('conversations', {
          id: convId,
          workspace_id: workspaceId,
        });
        return conversation;
      } catch (error) {
        console.error(`Failed to fetch conversation ${convId}:`, error);
        return null;
      }
    });

    const conversationsResults = await Promise.all(conversationPromises);

    // Filter out null results, archived conversations, and add membership data
    const conversations = conversationsResults
      .filter((c) => c !== null && c.is_archived !== true)
      .map((c) => {
        const membership = membershipMap.get(c.id);
        return {
          ...c,
          isStarred: membership?.isStarred || false,
          starredAt: membership?.starredAt || null,
        };
      })
      // Sort: starred first (by starred_at desc), then by updated_at desc
      .sort((a, b) => {
        // Starred conversations come first
        if (a.isStarred && !b.isStarred) return -1;
        if (!a.isStarred && b.isStarred) return 1;
        // Within same starred status, sort by most recent activity
        if (a.isStarred && b.isStarred) {
          // Both starred - sort by starred_at desc
          const aTime = a.starredAt ? new Date(a.starredAt).getTime() : 0;
          const bTime = b.starredAt ? new Date(b.starredAt).getTime() : 0;
          return bTime - aTime;
        }
        // Neither starred - sort by updated_at desc
        const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bUpdated - aUpdated;
      });

    return conversations;
  }

  async deleteConversation(conversationId: string, userId: string) {
    // Check if conversation exists
    const conversationQueryResult = await this.db.findMany('conversations', {
      id: conversationId,
    });

    const conversationData = Array.isArray(conversationQueryResult.data)
      ? conversationQueryResult.data
      : [];
    if (conversationData.length === 0) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant in this conversation
    const membershipQueryResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Instead of hard deleting, we archive the conversation
    // This preserves the conversation history but removes it from the user's list
    return await this.db.update('conversations', conversationId, {
      is_archived: true,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Star a conversation for the current user
   */
  async starConversation(conversationId: string, userId: string) {
    // Check if conversation exists
    const conversationQueryResult = await this.db.findMany('conversations', {
      id: conversationId,
    });

    const conversationData = Array.isArray(conversationQueryResult.data)
      ? conversationQueryResult.data
      : [];
    if (conversationData.length === 0) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant in this conversation
    const membershipQueryResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const membership = membershipData[0];

    // Update the membership to star the conversation
    await this.db
      .table('conversation_members')
      .update({
        is_starred: true,
        starred_at: new Date().toISOString(),
      })
      .where('id', '=', membership.id)
      .execute();

    console.log('⭐ Conversation starred:', { conversationId, userId });

    return {
      message: 'Conversation starred successfully',
      data: {
        conversationId,
        isStarred: true,
        starredAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Unstar a conversation for the current user
   */
  async unstarConversation(conversationId: string, userId: string) {
    // Check if conversation exists
    const conversationQueryResult = await this.db.findMany('conversations', {
      id: conversationId,
    });

    const conversationData = Array.isArray(conversationQueryResult.data)
      ? conversationQueryResult.data
      : [];
    if (conversationData.length === 0) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant in this conversation
    const membershipQueryResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const membership = membershipData[0];

    // Update the membership to unstar the conversation
    await this.db
      .table('conversation_members')
      .update({
        is_starred: false,
        starred_at: null,
      })
      .where('id', '=', membership.id)
      .execute();

    console.log('⭐ Conversation unstarred:', { conversationId, userId });

    return {
      message: 'Conversation unstarred successfully',
      data: {
        conversationId,
        isStarred: false,
        starredAt: null,
      },
    };
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Check if user has access to conversation
    await this.checkConversationAccess(conversationId, userId);

    console.log('[ChatService] getConversationMessages called:', {
      conversationId,
      userId,
      limit,
      offset,
    });

    // Query messages and filter out deleted ones
    const messagesQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .execute();

    console.log('[ChatService] Conversation messages query result:', {
      hasData: !!messagesQueryResult.data,
      dataLength: Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data.length : 0,
    });

    // Filter out deleted messages manually (is_deleted might be true, false, or null)
    const messagesData = Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data : [];
    const nonDeletedMessages = messagesData.filter((msg) => msg.is_deleted !== true);
    const sortedMessages = nonDeletedMessages
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    console.log('[ChatService] Messages count:', {
      total: messagesData.length,
      nonDeleted: nonDeletedMessages.length,
      afterPagination: sortedMessages.length,
    });

    // Fetch user info for each message and parse JSON fields
    const messagesWithUsers = await Promise.all(
      sortedMessages.map(async (message) => {
        let user = null;

        // Handle bot messages specially - format is "bot" or "bot:{botId}"
        if (message.user_id === 'bot' || message.user_id?.startsWith('bot:')) {
          // Try to look up bot details if we have a bot ID
          const botId = message.user_id?.startsWith('bot:') ? message.user_id.split(':')[1] : null;

          if (botId) {
            try {
              const botResult = await this.db.findMany('bots', { id: botId });
              const bots = Array.isArray(botResult.data) ? botResult.data : [];
              if (bots.length > 0) {
                const bot = bots[0];
                user = {
                  id: message.user_id,
                  name: bot.display_name || bot.name || 'Bot',
                  email: '',
                  avatarUrl: bot.avatar_url || null,
                  isBot: true,
                };
              }
            } catch (error) {
              console.warn('[ChatService] Could not fetch bot info:', error.message);
            }
          }

          // Fallback if bot lookup failed
          if (!user) {
            user = {
              id: message.user_id,
              name: 'Bot',
              email: '',
              avatarUrl: null,
              isBot: true,
            };
          }
        } else {
          try {
            const userInfo: any = await this.db.getUserById(message.user_id);
            if (userInfo) {
              // Extract metadata for additional profile fields (same pattern as auth service)
              const metadata = userInfo.metadata || {};

              user = {
                id: userInfo.id,
                // Priority: metadata.name -> fullName -> name -> email prefix
                name:
                  metadata.name ||
                  (userInfo as any).fullName ||
                  userInfo.name ||
                  userInfo.email?.split('@')[0] ||
                  'User',
                email: userInfo.email,
                avatarUrl: metadata.avatarUrl || userInfo.avatar_url || userInfo.avatarUrl || null,
              };
            }
          } catch (error) {
            console.warn(
              '[ChatService] Could not fetch user info for message:',
              message.id,
              error.message,
            );
            user = {
              id: message.user_id,
              name: 'User',
              email: '',
              avatarUrl: null,
            };
          }
        }

        // Get read receipt count for this message
        let readByCount = 0;
        try {
          const receiptsResult = await this.db.findMany('message_read_receipts', {
            message_id: message.id,
          });
          const receipts = Array.isArray(receiptsResult.data) ? receiptsResult.data : [];
          readByCount = receipts.length;
        } catch (error) {
          console.warn('[ChatService] Could not fetch read receipt count for message:', message.id);
        }

        // Fetch reactions from message_reactions table
        const reactions = await this.getMessageReactions(message.id);

        // Parse linked_content
        const parsedLinkedContent =
          typeof message.linked_content === 'string'
            ? JSON.parse(message.linked_content)
            : message.linked_content || [];

        // Enrich polls with user vote status
        const enrichedLinkedContent = await this.enrichLinkedContentWithUserVotes(
          parsedLinkedContent,
          message.id,
          userId,
        );

        return {
          ...message,
          user,
          read_by_count: readByCount,
          attachments:
            typeof message.attachments === 'string'
              ? JSON.parse(message.attachments)
              : message.attachments || [],
          mentions:
            typeof message.mentions === 'string'
              ? JSON.parse(message.mentions)
              : message.mentions || [],
          linked_content: enrichedLinkedContent,
          reactions,
        };
      }),
    );

    console.log(
      '[ChatService] Returning conversation messages with user info:',
      messagesWithUsers.length,
    );
    return messagesWithUsers;
  }

  async getConversationMembers(conversationId: string, userId: string) {
    // Check if user has access to conversation
    await this.checkConversationAccess(conversationId, userId);

    console.log('[ChatService] getConversationMembers called:', { conversationId, userId });

    // Get conversation members from conversation_members table
    const membersResult = await this.db
      .table('conversation_members')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .execute();

    console.log('[ChatService] Conversation members query result:', {
      hasData: !!membersResult.data,
      dataLength: Array.isArray(membersResult.data) ? membersResult.data.length : 0,
    });

    const membersData = Array.isArray(membersResult.data) ? membersResult.data : [];

    // Fetch user info for each member (similar to channel members pattern)
    const membersWithUsers = await Promise.all(
      membersData.map(async (member) => {
        let user = null;
        try {
          // First check if this is a bot
          const botResult = await this.db.findOne('bots', { id: member.user_id });
          if (botResult) {
            // It's a bot
            user = {
              id: botResult.id,
              name: botResult.display_name || botResult.name || 'Bot',
              email: `${botResult.name}@bot.deskive.ai`,
              avatarUrl: botResult.avatar_url || null,
              status: 'online', // Bots are always "online"
              isBot: true,
            };
          } else {
            // It's a regular user
            const userInfo: any = await this.db.getUserById(member.user_id);
            if (userInfo) {
              const metadata = userInfo.metadata || {};
              user = {
                id: userInfo.id,
                name:
                  metadata.name ||
                  (userInfo as any).fullName ||
                  userInfo.name ||
                  userInfo.email?.split('@')[0] ||
                  'User',
                email: userInfo.email,
                avatarUrl: metadata.avatarUrl || userInfo.avatar_url || userInfo.avatarUrl || null,
                status: 'offline', // Default status, can be enhanced with presence service
              };
            }
          }
        } catch (error) {
          console.warn(
            '[ChatService] Could not fetch user info for conversation member:',
            member.user_id,
            error.message,
          );
          user = {
            id: member.user_id,
            name: 'User',
            email: '',
            avatarUrl: null,
            status: 'offline',
          };
        }

        return {
          id: member.id,
          conversationId: member.conversation_id,
          userId: member.user_id,
          role: member.role || 'member', // Default role
          joinedAt: member.joined_at || member.created_at,
          user,
        };
      }),
    );

    console.log(
      '[ChatService] Returning conversation members with user info:',
      membersWithUsers.length,
    );
    return membersWithUsers;
  }

  // Message operations
  async sendMessage(
    messageData: SendMessageDto & { channel_id?: string; conversation_id?: string },
    userId: string,
  ) {
    console.log('[ChatService] ⚠️ sendMessage CALLED - STACK TRACE:');
    console.trace('[ChatService] sendMessage caller');
    console.log('[ChatService] sendMessage called with data:', {
      content: messageData.content,
      hasAttachments: !!messageData.attachments,
      attachmentsCount: messageData.attachments?.length || 0,
      attachments: messageData.attachments,
      channel_id: messageData.channel_id,
      conversation_id: messageData.conversation_id,
    });

    if (!messageData.channel_id && !messageData.conversation_id) {
      throw new BadRequestException('Either channel_id or conversation_id must be provided');
    }

    // Check access
    if (messageData.channel_id) {
      await this.checkChannelAccess(messageData.channel_id, userId);
    } else if (messageData.conversation_id) {
      await this.checkConversationAccess(messageData.conversation_id, userId);
    }

    const messagePayload = {
      ...messageData,
      user_id: userId,
      attachments: JSON.stringify(messageData.attachments || []),
      mentions: JSON.stringify(messageData.mentions || []),
      linked_content: JSON.stringify(messageData.linked_content || []),
      reactions: JSON.stringify({}),
      // Handle E2EE fields
      encryption_metadata: messageData.encryption_metadata
        ? JSON.stringify(messageData.encryption_metadata)
        : null,
      encrypted_content: messageData.encrypted_content || null,
      is_encrypted: messageData.is_encrypted || false,
      content: messageData.content || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[ChatService] Message payload to insert:', {
      ...messagePayload,
      attachments: messagePayload.attachments, // Show stringified version
    });

    const message = await this.db.insert('messages', messagePayload);
    console.log('[ChatService] Message inserted:', message);

    // Fetch user info from auth service (no users table)
    let user = null;
    try {
      console.log('[ChatService] Fetching user info for:', userId);
      const userInfo: any = await this.db.getUserById(userId);
      console.log('[ChatService] User info fetched:', userInfo);

      if (userInfo) {
        // Extract metadata for additional profile fields (same pattern as auth service)
        const metadata = userInfo.metadata || {};

        user = {
          id: userInfo.id,
          // Priority: metadata.name -> fullName -> name -> email prefix
          name:
            metadata.name ||
            userInfo.fullName ||
            userInfo.name ||
            userInfo.email?.split('@')[0] ||
            'User',
          email: userInfo.email,
          avatarUrl: userInfo.avatar_url || userInfo.avatarUrl || null,
        };
        console.log('[ChatService] User object created:', user);
      }
    } catch (error) {
      console.warn('[ChatService] Could not fetch user info from database:', error.message);
      // Fallback to basic info
      user = {
        id: userId,
        name: 'User',
        email: '',
        avatarUrl: null,
      };
    }

    // Parse JSON fields back to objects for the response - with error handling
    let parsedMessage;
    try {
      parsedMessage = {
        ...message,
        user,
        attachments:
          typeof message.attachments === 'string'
            ? JSON.parse(message.attachments)
            : Array.isArray(message.attachments)
              ? message.attachments
              : [],
        mentions:
          typeof message.mentions === 'string'
            ? JSON.parse(message.mentions)
            : Array.isArray(message.mentions)
              ? message.mentions
              : [],
        linked_content:
          typeof message.linked_content === 'string'
            ? JSON.parse(message.linked_content)
            : Array.isArray(message.linked_content)
              ? message.linked_content
              : [],
        reactions:
          typeof message.reactions === 'string'
            ? JSON.parse(message.reactions)
            : typeof message.reactions === 'object'
              ? message.reactions
              : {},
        // Parse E2EE metadata if stored as string
        encryption_metadata:
          typeof message.encryption_metadata === 'string'
            ? JSON.parse(message.encryption_metadata)
            : message.encryption_metadata,
      };
      console.log(
        '[ChatService] ✅ Successfully parsed message fields with user info:',
        user ? `User: ${user.name}` : 'No user info',
      );
      console.log('[ChatService] Parsed attachments:', parsedMessage.attachments);
    } catch (error) {
      console.error('[ChatService] ❌ Error parsing message fields:', error);
      // Fallback to original message if parsing fails
      parsedMessage = {
        ...message,
        user: null,
        attachments: [],
        mentions: [],
        linked_content: [],
        reactions: {},
      };
    }

    console.log('[ChatService] Message inserted successfully:', message.id);
    console.log('[ChatService] Message has conversation_id:', messageData.conversation_id);
    console.log('[ChatService] Message has channel_id:', messageData.channel_id);
    console.log('[ChatService] AppGateway available:', !!this.appGateway);

    // Update parent message reply count if this is a reply
    if (messageData.parent_id) {
      const parentMessageResult = await this.db.findMany('messages', {
        id: messageData.parent_id,
      });

      const parentMessageData = Array.isArray(parentMessageResult.data)
        ? parentMessageResult.data
        : [];
      if (parentMessageData.length > 0) {
        await this.db.update('messages', messageData.parent_id, {
          reply_count: (parentMessageData[0].reply_count || 0) + 1,
        });
      }
    }

    // Emit real-time event to conversation/channel members with parsed message
    try {
      if (messageData.conversation_id) {
        // Emit to conversation room (frontend joins this room when viewing conversation)
        console.log(
          `[ChatService] 📡 Attempting to emit to conversation:${messageData.conversation_id}`,
        );
        this.appGateway.emitToRoom(`conversation:${messageData.conversation_id}`, 'message:new', {
          message: parsedMessage,
          conversation_id: messageData.conversation_id,
        });
        this.chatGateway.notifyConversation(messageData.conversation_id, 'new_message', message);
        console.log(
          `[ChatService] ✅ Emitted message:new to room conversation:${messageData.conversation_id}`,
        );

        // ALSO emit to each participant's workspace+user room for cross-page notifications
        try {
          // Step 1: Get conversation to find workspace_id
          const conversationResult = await this.db.findMany('conversations', {
            id: messageData.conversation_id,
          });
          const conversations = Array.isArray(conversationResult.data)
            ? conversationResult.data
            : [];

          if (conversations.length === 0) {
            console.warn('[ChatService] ⚠️ Conversation not found for workspace notification');
            return;
          }

          const workspaceId = conversations[0].workspace_id;

          // Step 2: Get all participants' user_ids from conversation_members
          const membersResult = await this.db.findMany('conversation_members', {
            conversation_id: messageData.conversation_id,
          });
          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const participantIds = members.map((m) => m.user_id);

          // Step 3: Emit to each participant's workspace+user room
          if (workspaceId && participantIds.length > 0) {
            console.log(
              `[ChatService] 📡 Emitting to ${participantIds.length} participants in workspace ${workspaceId}`,
            );
            this.appGateway.emitToWorkspaceUsers(
              workspaceId,
              participantIds,
              'message:new:workspace',
              {
                message: parsedMessage,
                conversation_id: messageData.conversation_id,
                type: 'conversation',
              },
            );
            console.log(
              `[ChatService] ✅ Workspace notifications sent to: ${participantIds.join(', ')}`,
            );

            // Process bot message handler for DMs asynchronously
            if (this.botMessageHandler) {
              console.log(
                `[ChatService] 🤖 Calling bot message handler for conversation ${messageData.conversation_id}`,
              );
              this.botMessageHandler
                .processMessage(
                  workspaceId,
                  messageData.conversation_id,
                  message.id,
                  userId,
                  messageData.content || '',
                )
                .catch((err) => console.error('[ChatService] Bot message handler error:', err));
            }

            // Step 4: Save database notifications for all participants (except sender)
            try {
              console.log(
                '[ChatService] 💾 Starting to save database notifications for conversation...',
              );
              // Get sender's user info for notification using DatabaseService
              console.log('[ChatService] 💾 Fetching sender user info for userId:', userId);
              const senderUser = await this.db.getUserById(userId);
              console.log('[ChatService] 💾 Sender user result:', JSON.stringify(senderUser));

              const metadata = senderUser?.metadata || {};
              const senderName =
                metadata.name ||
                (senderUser as any)?.fullName ||
                senderUser?.name ||
                senderUser?.email?.split('@')[0] ||
                'Someone';
              console.log('[ChatService] 💾 Sender name:', senderName);

              // Create message preview (max 100 chars) - strip HTML and convert mentions
              const cleanContent = this.stripHtmlForNotification(messageData.content);
              const messagePreview =
                cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent;

              // Get users currently viewing this conversation (to exclude them from notifications)
              const usersInRoom = await this.appGateway.getUsersInRoom(
                `conversation:${messageData.conversation_id}`,
              );
              console.log('[ChatService] 💾 Users currently in conversation room:', usersInRoom);

              // Send notification to all participants except the sender and users currently viewing the conversation
              for (const participantId of participantIds) {
                if (participantId !== userId && !usersInRoom.includes(participantId)) {
                  await this.notificationsService.sendNotification({
                    user_id: participantId,
                    type: NotificationType.MESSAGES,
                    title: `New message from ${senderName}`,
                    message: messagePreview,
                    action_url: `/workspaces/${workspaceId}/chat/${messageData.conversation_id}`,
                    priority: 'normal' as any,
                    send_push: true, // Enable push notifications (FCM for mobile)
                    data: {
                      category: 'messages',
                      entity_type: 'message',
                      entity_id: message.id,
                      actor_id: userId,
                      workspace_id: workspaceId,
                      isDirect: true,
                      isDirectMessage: true,
                      conversation_id: messageData.conversation_id,
                      msg_type: 'conversation', // Renamed from message_type (FCM reserved key)
                      sender_name: senderName, // Add sender name for Flutter app
                    },
                  });
                }
              }
              console.log(
                `[ChatService] ✅ Database notifications saved for ${participantIds.length - 1} participants`,
              );
            } catch (notificationError) {
              console.error(
                '[ChatService] ❌ Error saving database notifications:',
                notificationError.message,
              );
            }
          }
        } catch (workspaceError) {
          console.error(
            '[ChatService] ❌ Error emitting workspace notifications:',
            workspaceError.message,
          );
        }
      } else if (messageData.channel_id) {
        // Emit to channel room (frontend joins this room when viewing channel)
        console.log(`[ChatService] 📡 Attempting to emit to channel:${messageData.channel_id}`);
        this.appGateway.emitToRoom(`channel:${messageData.channel_id}`, 'message:new', {
          message: parsedMessage,
          channel_id: messageData.channel_id,
        });
        this.chatGateway.notifyChannel(messageData.channel_id, 'new_message', message);
        console.log(
          `[ChatService] ✅ Emitted message:new to room channel:${messageData.channel_id}`,
        );

        // ALSO emit to each channel member's workspace+user room for cross-page notifications
        try {
          // Step 1: Get channel to find workspace_id
          console.log(`[ChatService] 🔍 Fetching channel details for: ${messageData.channel_id}`);
          const channelResult = await this.db.findMany('channels', {
            id: messageData.channel_id,
          });
          const channels = Array.isArray(channelResult.data) ? channelResult.data : [];
          console.log(`[ChatService] 🔍 Channel query result:`, {
            found: channels.length,
            channels: channels.map((c) => ({ id: c.id, workspace_id: c.workspace_id })),
          });

          if (channels.length === 0) {
            console.warn('[ChatService] ⚠️ Channel not found for workspace notification');
            return;
          }

          const workspaceId = channels[0].workspace_id;

          // Step 2: Get all members' user_ids from channel_members
          console.log(`[ChatService] 🔍 Fetching channel members for: ${messageData.channel_id}`);
          const membersResult = await this.db.findMany('channel_members', {
            channel_id: messageData.channel_id,
          });
          console.log(`[ChatService] 🔍 Raw members result:`, {
            hasData: !!membersResult.data,
            isArray: Array.isArray(membersResult.data),
            dataLength: membersResult.data?.length,
            rawData: membersResult,
          });

          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const memberIds = members.map((m) => m.user_id);

          console.log(`[ChatService] 🔍 Processed members:`, {
            memberCount: members.length,
            memberIds: memberIds,
            members: members.map((m) => ({ id: m.id, user_id: m.user_id })),
          });

          // Step 3: Emit to each member's workspace+user room
          if (workspaceId && memberIds.length > 0) {
            console.log(
              `[ChatService] 📡 Emitting to ${memberIds.length} members in workspace ${workspaceId}`,
            );
            this.appGateway.emitToWorkspaceUsers(workspaceId, memberIds, 'message:new:workspace', {
              message: parsedMessage,
              channel_id: messageData.channel_id,
              type: 'channel',
            });
            console.log(
              `[ChatService] ✅ Workspace notifications sent to: ${memberIds.join(', ')}`,
            );

            // Step 4: Save database notifications for all channel members (except sender)
            try {
              console.log(
                '[ChatService] 💾 Starting to save database notifications for channel...',
              );
              // Get sender's user info for notification using DatabaseService
              console.log('[ChatService] 💾 Fetching sender user info for userId:', userId);
              const senderUser = await this.db.getUserById(userId);
              console.log('[ChatService] 💾 Sender user result:', JSON.stringify(senderUser));

              const metadata = senderUser?.metadata || {};
              const senderName =
                metadata.name ||
                (senderUser as any)?.fullName ||
                senderUser?.name ||
                senderUser?.email?.split('@')[0] ||
                'Someone';
              console.log('[ChatService] 💾 Sender name:', senderName);

              // Get channel name for notification
              const channelName = channels[0].name || 'Unknown Channel';

              // Create message preview (max 100 chars) - strip HTML and convert mentions
              const cleanContent = this.stripHtmlForNotification(messageData.content);
              const messagePreview =
                cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent;

              // Get users currently viewing this channel (to exclude them from notifications)
              const usersInRoom = await this.appGateway.getUsersInRoom(
                `channel:${messageData.channel_id}`,
              );
              console.log('[ChatService] 💾 Users currently in channel room:', usersInRoom);

              // Send notification to all channel members except the sender and users currently viewing the channel
              for (const memberId of memberIds) {
                if (memberId !== userId && !usersInRoom.includes(memberId)) {
                  await this.notificationsService.sendNotification({
                    user_id: memberId,
                    type: NotificationType.MESSAGES,
                    title: `New message in #${channelName}`,
                    message: `${senderName}: ${messagePreview}`,
                    action_url: `/workspaces/${workspaceId}/chat/${messageData.channel_id}`,
                    priority: 'normal' as any,
                    send_push: true, // Enable push notifications (FCM for mobile)
                    data: {
                      category: 'messages',
                      entity_type: 'message',
                      entity_id: message.id,
                      actor_id: userId,
                      workspace_id: workspaceId,
                      isDirect: false,
                      isDirectMessage: false,
                      channel_id: messageData.channel_id,
                      channel_name: channelName,
                      msg_type: 'channel', // Renamed from message_type (FCM reserved key)
                      sender_name: senderName, // Add sender name for Flutter app
                    },
                  });
                }
              }
              console.log(
                `[ChatService] ✅ Database notifications saved for ${memberIds.length - 1} channel members`,
              );
            } catch (notificationError) {
              console.error(
                '[ChatService] ❌ Error saving database notifications:',
                notificationError.message,
              );
            }
          } else {
            console.warn(`[ChatService] ⚠️ Cannot emit workspace notification:`, {
              hasWorkspaceId: !!workspaceId,
              memberCount: memberIds.length,
            });
          }
        } catch (workspaceError) {
          console.error(
            '[ChatService] ❌ Error emitting workspace notifications:',
            workspaceError.message,
          );
          console.error('[ChatService] ❌ Full error:', workspaceError);
        }
      }
    } catch (error) {
      console.error('[ChatService] ❌ Error emitting WebSocket event:', error);
    }

    // =============================================
    // MENTION NOTIFICATIONS (force_send bypasses user preferences)
    // =============================================
    try {
      const mentions = messageData.mentions || [];
      if (mentions.length > 0) {
        console.log('[ChatService] 📢 Processing mention notifications for:', mentions);

        // Get workspace_id for action URL
        let workspaceId: string | null = null;
        let chatId: string | null = null;
        let chatType: 'channel' | 'conversation' = 'channel';
        let channelName: string | null = null;

        if (messageData.channel_id) {
          const channelResult = await this.db.findMany('channels', { id: messageData.channel_id });
          const channels = Array.isArray(channelResult.data) ? channelResult.data : [];
          if (channels.length > 0) {
            workspaceId = channels[0].workspace_id;
            channelName = channels[0].name;
          }
          chatId = messageData.channel_id;
          chatType = 'channel';
        } else if (messageData.conversation_id) {
          const conversationResult = await this.db.findMany('conversations', {
            id: messageData.conversation_id,
          });
          const conversations = Array.isArray(conversationResult.data)
            ? conversationResult.data
            : [];
          if (conversations.length > 0) {
            workspaceId = conversations[0].workspace_id;
          }
          chatId = messageData.conversation_id;
          chatType = 'conversation';
        }

        if (workspaceId && chatId) {
          // Get sender's user info
          const senderUser = await this.db.getUserById(userId);
          const metadata = senderUser?.metadata || {};
          const senderName =
            metadata.name ||
            (senderUser as any)?.fullName ||
            senderUser?.name ||
            senderUser?.email?.split('@')[0] ||
            'Someone';

          // Create message preview - strip HTML and convert mentions
          const cleanContent = this.stripHtmlForNotification(messageData.content);
          const messagePreview =
            cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent;

          // Handle @channel mention - notify all channel members
          if (mentions.includes('channel') && messageData.channel_id) {
            console.log(
              '[ChatService] 📢 @channel mention detected - notifying all channel members',
            );
            const membersResult = await this.db.findMany('channel_members', {
              channel_id: messageData.channel_id,
            });
            const members = Array.isArray(membersResult.data) ? membersResult.data : [];

            for (const member of members) {
              // Skip the sender
              if (member.user_id === userId) continue;

              await this.notificationsService.sendNotification({
                user_id: member.user_id,
                type: NotificationType.MESSAGES,
                title: `@channel in #${channelName}`,
                message: `${senderName}: ${messagePreview}`,
                action_url: `/workspaces/${workspaceId}/chat/${chatId}`,
                priority: 'high' as any,
                send_push: true,
                force_send: true, // Bypass user preferences for mentions
                data: {
                  category: 'mention',
                  entity_type: 'message',
                  entity_id: message.id,
                  actor_id: userId,
                  workspace_id: workspaceId,
                  channel_id: chatId,
                  channel_name: channelName,
                  msg_type: 'channel_mention',
                  sender_name: senderName,
                  is_mention: true,
                },
              });
            }
            console.log(
              `[ChatService] ✅ @channel mention notifications sent to ${members.length - 1} members`,
            );
          }

          // Handle individual user mentions
          const userMentions = mentions.filter((m) => m !== 'channel');
          for (const mentionedUserId of userMentions) {
            // Skip the sender (can't mention yourself)
            if (mentionedUserId === userId) continue;

            const notificationTitle =
              chatType === 'channel'
                ? `${senderName} mentioned you in #${channelName}`
                : `${senderName} mentioned you`;

            await this.notificationsService.sendNotification({
              user_id: mentionedUserId,
              type: NotificationType.MESSAGES,
              title: notificationTitle,
              message: messagePreview,
              action_url: `/workspaces/${workspaceId}/chat/${chatId}`,
              priority: 'high' as any,
              send_push: true,
              force_send: true, // Bypass user preferences for mentions
              data: {
                category: 'mention',
                entity_type: 'message',
                entity_id: message.id,
                actor_id: userId,
                workspace_id: workspaceId,
                ...(chatType === 'channel'
                  ? { channel_id: chatId, channel_name: channelName }
                  : { conversation_id: chatId }),
                msg_type: chatType === 'channel' ? 'channel_mention' : 'dm_mention',
                sender_name: senderName,
                is_mention: true,
              },
            });
            console.log(`[ChatService] ✅ Mention notification sent to user ${mentionedUserId}`);
          }
        }
      }
    } catch (mentionError) {
      console.error('[ChatService] ❌ Error sending mention notifications:', mentionError.message);
    }

    return parsedMessage;
  }

  async updateMessage(messageId: string, updateMessageDto: UpdateMessageDto, userId: string) {
    console.log(`[ChatService] updateMessage called:`, {
      messageId,
      userId,
      updateDto: updateMessageDto,
    });

    const messageQueryResult = await this.db.findMany('messages', {
      id: messageId,
    });

    const messageData = Array.isArray(messageQueryResult.data) ? messageQueryResult.data : [];
    console.log(`[ChatService] Found ${messageData.length} messages for ID: ${messageId}`);

    if (messageData.length === 0) {
      throw new NotFoundException('Message not found');
    }

    const message = messageData[0];
    console.log(`[ChatService] Message owner: ${message.user_id}, Requesting user: ${userId}`);

    // Only message author can update
    if (message.user_id !== userId) {
      console.log(
        `[ChatService] User ${userId} is not the author of message ${messageId} (owner: ${message.user_id})`,
      );
      throw new ForbiddenException('You can only edit your own messages');
    }

    const updateData: any = {
      ...updateMessageDto,
      is_edited: true,
      updated_at: new Date().toISOString(),
    };

    if (updateMessageDto.attachments) {
      updateData.attachments = JSON.stringify(updateMessageDto.attachments);
    }

    if (updateMessageDto.mentions) {
      updateData.mentions = JSON.stringify(updateMessageDto.mentions);
    }

    console.log(`[ChatService] Updating message with data:`, updateData);
    const updatedMessage = await this.db.update('messages', messageId, updateData);
    console.log(`[ChatService] Update result:`, updatedMessage);

    // Parse JSON fields back to objects for the response
    const parsedUpdatedMessage = {
      ...updatedMessage,
      attachments:
        typeof updatedMessage.attachments === 'string'
          ? JSON.parse(updatedMessage.attachments)
          : updatedMessage.attachments || [],
      mentions:
        typeof updatedMessage.mentions === 'string'
          ? JSON.parse(updatedMessage.mentions)
          : updatedMessage.mentions || [],
      reactions:
        typeof updatedMessage.reactions === 'string'
          ? JSON.parse(updatedMessage.reactions)
          : updatedMessage.reactions || {},
    };

    // Emit real-time update event with parsed message
    if (message.conversation_id) {
      this.appGateway.emitToRoom(`conversation:${message.conversation_id}`, 'message:updated', {
        message: parsedUpdatedMessage,
        conversation_id: message.conversation_id,
      });
      console.log(
        `[ChatService] Emitted message:updated to room conversation:${message.conversation_id}`,
      );

      // ALSO emit to workspace users for cross-page updates
      try {
        const conversationResult = await this.db.findMany('conversations', {
          id: message.conversation_id,
        });
        const conversations = Array.isArray(conversationResult.data) ? conversationResult.data : [];

        if (conversations.length > 0) {
          const workspaceId = conversations[0].workspace_id;
          const membersResult = await this.db.findMany('conversation_members', {
            conversation_id: message.conversation_id,
          });
          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const participantIds = members.map((m) => m.user_id);

          if (workspaceId && participantIds.length > 0) {
            this.appGateway.emitToWorkspaceUsers(
              workspaceId,
              participantIds,
              'message:updated:workspace',
              {
                message: parsedUpdatedMessage,
                conversation_id: message.conversation_id,
                type: 'conversation',
              },
            );
            console.log(
              `[ChatService] ✅ Workspace update notifications sent to: ${participantIds.join(', ')}`,
            );
          }
        }
      } catch (workspaceError) {
        console.error(
          '[ChatService] ❌ Error emitting workspace update notification:',
          workspaceError.message,
        );
      }
    } else if (message.channel_id) {
      this.appGateway.emitToRoom(`channel:${message.channel_id}`, 'message:updated', {
        message: parsedUpdatedMessage,
        channel_id: message.channel_id,
      });
      console.log(`[ChatService] Emitted message:updated to room channel:${message.channel_id}`);

      // ALSO emit to workspace users for cross-page updates
      try {
        const channelResult = await this.db.findMany('channels', {
          id: message.channel_id,
        });
        const channels = Array.isArray(channelResult.data) ? channelResult.data : [];

        if (channels.length > 0) {
          const workspaceId = channels[0].workspace_id;
          const membersResult = await this.db.findMany('channel_members', {
            channel_id: message.channel_id,
          });
          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const memberIds = members.map((m) => m.user_id);

          if (workspaceId && memberIds.length > 0) {
            this.appGateway.emitToWorkspaceUsers(
              workspaceId,
              memberIds,
              'message:updated:workspace',
              {
                message: parsedUpdatedMessage,
                channel_id: message.channel_id,
                type: 'channel',
              },
            );
            console.log(
              `[ChatService] ✅ Workspace update notifications sent to: ${memberIds.join(', ')}`,
            );
          }
        }
      } catch (workspaceError) {
        console.error(
          '[ChatService] ❌ Error emitting workspace update notification:',
          workspaceError.message,
        );
      }
    }

    return parsedUpdatedMessage;
  }

  async deleteMessage(messageId: string, userId: string) {
    const messageQueryResult = await this.db.findMany('messages', {
      id: messageId,
    });

    const messageData = Array.isArray(messageQueryResult.data) ? messageQueryResult.data : [];
    if (messageData.length === 0) {
      throw new NotFoundException('Message not found');
    }

    const message = messageData[0];

    // Only message author can delete
    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    const deletedMessage = await this.db.update('messages', messageId, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
    });

    // Emit real-time delete event
    if (message.conversation_id) {
      this.appGateway.emitToRoom(`conversation:${message.conversation_id}`, 'message:deleted', {
        messageId,
        conversation_id: message.conversation_id,
      });
      console.log(
        `[ChatService] Emitted message:deleted to room conversation:${message.conversation_id}`,
      );

      // ALSO emit to workspace users for cross-page updates
      try {
        const conversationResult = await this.db.findMany('conversations', {
          id: message.conversation_id,
        });
        const conversations = Array.isArray(conversationResult.data) ? conversationResult.data : [];

        if (conversations.length > 0) {
          const workspaceId = conversations[0].workspace_id;
          const membersResult = await this.db.findMany('conversation_members', {
            conversation_id: message.conversation_id,
          });
          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const participantIds = members.map((m) => m.user_id);

          if (workspaceId && participantIds.length > 0) {
            this.appGateway.emitToWorkspaceUsers(
              workspaceId,
              participantIds,
              'message:deleted:workspace',
              {
                messageId,
                conversation_id: message.conversation_id,
                type: 'conversation',
              },
            );
            console.log(
              `[ChatService] ✅ Workspace delete notifications sent to: ${participantIds.join(', ')}`,
            );
          }
        }
      } catch (workspaceError) {
        console.error(
          '[ChatService] ❌ Error emitting workspace delete notification:',
          workspaceError.message,
        );
      }
    } else if (message.channel_id) {
      this.appGateway.emitToRoom(`channel:${message.channel_id}`, 'message:deleted', {
        messageId,
        channel_id: message.channel_id,
      });
      console.log(`[ChatService] Emitted message:deleted to room channel:${message.channel_id}`);

      // ALSO emit to workspace users for cross-page updates
      try {
        const channelResult = await this.db.findMany('channels', {
          id: message.channel_id,
        });
        const channels = Array.isArray(channelResult.data) ? channelResult.data : [];

        if (channels.length > 0) {
          const workspaceId = channels[0].workspace_id;
          const membersResult = await this.db.findMany('channel_members', {
            channel_id: message.channel_id,
          });
          const members = Array.isArray(membersResult.data) ? membersResult.data : [];
          const memberIds = members.map((m) => m.user_id);

          if (workspaceId && memberIds.length > 0) {
            this.appGateway.emitToWorkspaceUsers(
              workspaceId,
              memberIds,
              'message:deleted:workspace',
              {
                messageId,
                channel_id: message.channel_id,
                type: 'channel',
              },
            );
            console.log(
              `[ChatService] ✅ Workspace delete notifications sent to: ${memberIds.join(', ')}`,
            );
          }
        }
      } catch (workspaceError) {
        console.error(
          '[ChatService] ❌ Error emitting workspace delete notification:',
          workspaceError.message,
        );
      }
    }

    return deletedMessage;
  }

  async addReaction(messageId: string, emoji: string, userId: string) {
    // Check if message exists
    const messageQueryResult = await this.db.findMany('messages', {
      id: messageId,
    });

    const messageData = Array.isArray(messageQueryResult.data) ? messageQueryResult.data : [];
    if (messageData.length === 0) {
      throw new NotFoundException('Message not found');
    }

    // Check if reaction already exists
    const existingReactionQueryResult = await this.db.findMany('message_reactions', {
      message_id: messageId,
      user_id: userId,
      emoji: emoji,
    });

    const existingReactionData = Array.isArray(existingReactionQueryResult.data)
      ? existingReactionQueryResult.data
      : [];
    if (existingReactionData.length > 0) {
      // If reaction exists, remove it (toggle behavior)
      await this.db.delete('message_reactions', existingReactionData[0].id);
      return { removed: true, reaction: existingReactionData[0] };
    }

    // Create reaction
    const newReaction = await this.db.insert('message_reactions', {
      message_id: messageId,
      user_id: userId,
      emoji: emoji,
      created_at: new Date().toISOString(),
    });

    return { added: true, reaction: newReaction };
  }

  async removeReaction(messageId: string, emoji: string, userId: string) {
    const reactionQueryResult = await this.db.findMany('message_reactions', {
      message_id: messageId,
      user_id: userId,
      emoji: emoji,
    });

    const reactionData = Array.isArray(reactionQueryResult.data) ? reactionQueryResult.data : [];
    if (reactionData.length === 0) {
      throw new NotFoundException('Reaction not found');
    }

    return await this.db.delete('message_reactions', reactionData[0].id);
  }

  // Helper methods
  private async checkChannelAccess(channelId: string, userId: string) {
    const membershipQueryResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      // User is not a member of this channel
      // Check if channel exists to provide appropriate error message
      const channelQueryResult = await this.db.findMany('channels', {
        id: channelId,
      });

      const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
      if (channelData.length === 0) {
        throw new NotFoundException('Channel not found');
      }

      // User must be a member to access any channel (public or private)
      // To join a public channel, they need to use the joinChannel endpoint
      throw new ForbiddenException(
        'You are not a member of this channel. Please join the channel first.',
      );
    }
  }

  private async checkConversationAccess(conversationId: string, userId: string) {
    // First check if conversation exists
    const conversationQueryResult = await this.db.findMany('conversations', {
      id: conversationId,
    });

    const conversationData = Array.isArray(conversationQueryResult.data)
      ? conversationQueryResult.data
      : [];
    if (conversationData.length === 0) {
      throw new NotFoundException('Conversation not found');
    }

    // Then check if user is a member
    const membershipQueryResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      throw new ForbiddenException('Access denied to this conversation');
    }
  }

  /**
   * Fetches reactions for a message from the message_reactions table
   * and aggregates them by emoji with count and memberIds
   */
  private async getMessageReactions(messageId: string): Promise<
    Array<{
      id: string;
      value: string;
      count: number;
      memberIds: string[];
    }>
  > {
    try {
      const reactionsResult = await this.db.findMany('message_reactions', {
        message_id: messageId,
      });

      const reactionsData = Array.isArray(reactionsResult.data) ? reactionsResult.data : [];

      // Aggregate reactions by emoji
      const reactionMap = new Map<
        string,
        { id: string; value: string; count: number; memberIds: string[] }
      >();

      for (const reaction of reactionsData) {
        const emoji = reaction.emoji;
        if (reactionMap.has(emoji)) {
          const existing = reactionMap.get(emoji)!;
          existing.count += 1;
          existing.memberIds.push(reaction.user_id);
        } else {
          reactionMap.set(emoji, {
            id: reaction.id,
            value: emoji,
            count: 1,
            memberIds: [reaction.user_id],
          });
        }
      }

      return Array.from(reactionMap.values());
    } catch (error) {
      console.warn(
        '[ChatService] Could not fetch reactions for message:',
        messageId,
        error.message,
      );
      return [];
    }
  }

  /**
   * Enrich linked_content polls with user vote status
   * This ensures that when messages are loaded, the frontend knows if the user has already voted
   */
  private async enrichLinkedContentWithUserVotes(
    linkedContent: any[],
    messageId: string,
    userId: string,
  ): Promise<any[]> {
    if (!linkedContent || linkedContent.length === 0) {
      return linkedContent;
    }

    // Process each linked content item
    const enrichedContent = await Promise.all(
      linkedContent.map(async (item) => {
        // Only process poll items
        if (item.type !== 'poll' || !item.poll) {
          return item;
        }

        try {
          // Check if user has voted on this poll
          const userVote = await this.db.findOne('poll_votes', {
            message_id: messageId,
            poll_id: item.poll.id,
            user_id: userId,
          });

          // Add userVotedOptionId to the poll object
          return {
            ...item,
            poll: {
              ...item.poll,
              userVotedOptionId: userVote?.option_id || null,
            },
          };
        } catch (error) {
          console.warn(
            '[ChatService] Could not fetch user vote for poll:',
            item.poll.id,
            error.message,
          );
          return item;
        }
      }),
    );

    return enrichedContent;
  }

  async joinChannel(channelId: string, userId: string) {
    // Check if channel exists
    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });

    const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
    if (channelData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    const channel = channelData[0];

    // Verify user is a workspace member
    const workspaceMemberQueryResult = await this.db.findMany('workspace_members', {
      workspace_id: channel.workspace_id,
      user_id: userId,
    });

    const workspaceMemberData = Array.isArray(workspaceMemberQueryResult.data)
      ? workspaceMemberQueryResult.data
      : [];
    if (workspaceMemberData.length === 0) {
      throw new ForbiddenException('You must be a workspace member to join this channel');
    }

    // Check if already a member
    const membershipQueryResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length > 0) {
      throw new BadRequestException('Already a member of this channel');
    }

    // Add user to channel (works for both public and private channels)
    return await this.db.insert('channel_members', {
      channel_id: channelId,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });
  }

  async leaveChannel(channelId: string, userId: string) {
    const membershipQueryResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    const membershipData = Array.isArray(membershipQueryResult.data)
      ? membershipQueryResult.data
      : [];
    if (membershipData.length === 0) {
      throw new BadRequestException('You are not a member of this channel');
    }

    // Get channel details for WebSocket event
    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });
    const channelsData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];

    if (channelsData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    const channel = channelsData[0];

    // Get user details for WebSocket event
    const userProfile = await this.db.getUserById(userId);
    const metadata = userProfile?.metadata || {};
    const userName =
      metadata.name ||
      (userProfile as any)?.fullName ||
      userProfile?.name ||
      userProfile?.email?.split('@')[0] ||
      'Unknown User';

    // Delete the membership using table() query builder (since ID is UUID, not integer)
    const result = await this.db
      .table('channel_members')
      .delete()
      .where('id', '=', membershipData[0].id)
      .execute();

    // Emit WebSocket event to notify all workspace members
    this.appGateway.emitToRoom(`workspace:${channel.workspace_id}`, 'member:left', {
      channelId: channelId,
      channelName: channel.name,
      userId: userId,
      userName: userName,
      workspaceId: channel.workspace_id,
    });

    return result;
  }

  /**
   * Get all members of a channel with their user details
   */
  async getChannelMembers(channelId: string, userId: string) {
    // Check if user has access to the channel
    await this.checkChannelAccess(channelId, userId);

    // Get all channel members
    const membersQueryResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
    });

    const membersData = Array.isArray(membersQueryResult.data) ? membersQueryResult.data : [];

    if (membersData.length === 0) {
      return [];
    }

    // Fetch user details for each member using getUserById
    const members = await Promise.all(
      membersData.map(async (member) => {
        try {
          const userProfile = await this.db.getUserById(member.user_id);
          const metadata = userProfile?.metadata || {};
          return {
            user_id: member.user_id,
            name:
              metadata.name ||
              (userProfile as any)?.fullName ||
              userProfile?.name ||
              userProfile?.email?.split('@')[0] ||
              'Unknown User',
            email: userProfile?.email || null,
            avatar: userProfile?.avatar_url || metadata?.avatarUrl || null,
            role: member.role || 'member',
            joined_at: member.created_at,
          };
        } catch (error) {
          console.error('Failed to fetch user for member:', member.user_id, error);
          return {
            user_id: member.user_id,
            name: 'Unknown User',
            email: null,
            avatar: null,
            role: member.role || 'member',
            joined_at: member.created_at,
          };
        }
      }),
    );

    return members;
  }

  /**
   * Add member(s) to a channel
   * Supports adding a single member (userId) or multiple members (userIds)
   */
  async addChannelMembers(
    workspaceId: string,
    channelId: string,
    body: { userId?: string; userIds?: string[]; role?: string },
    requestingUserId: string,
  ) {
    // Verify requesting user is admin/owner of the channel
    const channelMemberResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: requestingUserId,
    });

    const channelMemberData = Array.isArray(channelMemberResult.data)
      ? channelMemberResult.data
      : [];
    const requesterMembership = channelMemberData[0];

    if (!requesterMembership || requesterMembership.role !== 'admin') {
      throw new ForbiddenException('Only channel admins can add members');
    }

    // Get the channel to check if it's private
    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });

    const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
    if (channelData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    const channel = channelData[0];

    // Determine which users to add
    const userIdsToAdd = body.userIds || (body.userId ? [body.userId] : []);

    if (userIdsToAdd.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    const role = body.role || 'member';
    const addedMembers = [];

    for (const userIdToAdd of userIdsToAdd) {
      // Verify user is a workspace member
      const workspaceMemberResult = await this.db.findMany('workspace_members', {
        workspace_id: workspaceId,
        user_id: userIdToAdd,
      });

      const workspaceMemberData = Array.isArray(workspaceMemberResult.data)
        ? workspaceMemberResult.data
        : [];

      if (workspaceMemberData.length === 0) {
        console.warn(`User ${userIdToAdd} is not a workspace member, skipping`);
        continue;
      }

      // Check if user is already a channel member
      const existingMemberResult = await this.db.findMany('channel_members', {
        channel_id: channelId,
        user_id: userIdToAdd,
      });

      const existingMemberData = Array.isArray(existingMemberResult.data)
        ? existingMemberResult.data
        : [];

      if (existingMemberData.length > 0) {
        console.warn(`User ${userIdToAdd} is already a channel member, skipping`);
        continue;
      }

      // Add the member
      await this.db.insert('channel_members', {
        channel_id: channelId,
        user_id: userIdToAdd,
        role: role,
        permissions: [],
        joined_at: new Date().toISOString(),
        added_by: requestingUserId,
        is_active: true,
        last_read_at: null,
        notification_settings: {},
        collaborative_data: {},
      });

      addedMembers.push(userIdToAdd);

      // Send notification to the added user
      try {
        await this.notificationsService.sendNotification({
          user_ids: [userIdToAdd],
          type: NotificationType.CHANNEL_MEMBER_ADDED,
          title: channel.is_private
            ? `Added to private channel #${channel.name}`
            : `Added to channel #${channel.name}`,
          message: `You have been added to the channel #${channel.name}`,
          action_url: `/workspaces/${workspaceId}/chat?channel=${channelId}`,
          data: {
            workspace_id: workspaceId,
            channel_id: channelId,
            channel_name: channel.name,
            added_by: requestingUserId,
          },
          send_push: true,
          send_email: false,
        });
      } catch (error) {
        console.error('Failed to send notification for added member:', error);
      }
    }

    return {
      success: true,
      message: `Added ${addedMembers.length} member(s) to channel`,
      added_count: addedMembers.length,
    };
  }

  /**
   * Remove a member from a channel
   */
  async removeChannelMember(
    workspaceId: string,
    channelId: string,
    memberUserId: string,
    requestingUserId: string,
  ) {
    // Verify requesting user is admin/owner of the channel
    const channelMemberResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: requestingUserId,
    });

    const channelMemberData = Array.isArray(channelMemberResult.data)
      ? channelMemberResult.data
      : [];
    const requesterMembership = channelMemberData[0];

    if (!requesterMembership || requesterMembership.role !== 'admin') {
      throw new ForbiddenException('Only channel admins can remove members');
    }

    // Get the channel
    const channelQueryResult = await this.db.findMany('channels', {
      id: channelId,
    });

    const channelData = Array.isArray(channelQueryResult.data) ? channelQueryResult.data : [];
    if (channelData.length === 0) {
      throw new NotFoundException('Channel not found');
    }

    const channel = channelData[0];

    // Don't allow removing the channel creator/owner
    if (memberUserId === channel.created_by) {
      throw new ForbiddenException('Cannot remove channel creator');
    }

    // Find the member to remove
    const memberToRemoveResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: memberUserId,
    });

    const memberToRemoveData = Array.isArray(memberToRemoveResult.data)
      ? memberToRemoveResult.data
      : [];

    if (memberToRemoveData.length === 0) {
      throw new NotFoundException('User is not a member of this channel');
    }

    const memberToRemove = memberToRemoveData[0];

    // Delete the member using query builder (since ID is UUID, not integer)
    await this.db.table('channel_members').delete().where('id', '=', memberToRemove.id).execute();

    // Send notification to the removed user
    try {
      await this.notificationsService.sendNotification({
        user_ids: [memberUserId],
        type: NotificationType.CHANNEL_MEMBER_REMOVED,
        title: `Removed from channel #${channel.name}`,
        message: `You have been removed from the channel #${channel.name}`,
        action_url: `/workspaces/${workspaceId}/chat`,
        data: {
          workspace_id: workspaceId,
          channel_id: channelId,
          channel_name: channel.name,
          removed_by: requestingUserId,
        },
        send_push: true,
        send_email: false,
      });
    } catch (error) {
      console.error('Failed to send notification for removed member:', error);
    }

    return {
      success: true,
      message: 'Member removed from channel',
    };
  }

  // ==================== BOOKMARK OPERATIONS ====================

  /**
   * Bookmark a message
   */
  async bookmarkMessage(messageId: string, userId: string) {
    // Check if message exists using table query
    const messageQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .limit(1)
      .execute();

    const messages = messageQueryResult.data || messageQueryResult || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new NotFoundException('Message not found');
    }

    const messageResult = messages[0];

    // Update message to set bookmark using table query
    console.log('📝 Updating message bookmark:', {
      messageId,
      setting: {
        is_bookmarked: true,
        bookmarked_at: new Date().toISOString(),
        bookmarked_by: userId,
      },
    });

    const updateResult = await this.db
      .table('messages')
      .update({
        is_bookmarked: true,
        bookmarked_at: new Date().toISOString(),
        bookmarked_by: userId,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .execute();

    console.log('📝 Update result:', updateResult);

    // Fetch updated message
    const updatedMessageResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .limit(1)
      .execute();

    const updatedMessages = updatedMessageResult.data || updatedMessageResult || [];
    const updatedMessage = updatedMessages[0];

    console.log('✅ Message bookmarked:', messageId);
    console.log('✅ Updated message is_bookmarked:', updatedMessage?.is_bookmarked);

    // Emit WebSocket event for real-time update using appGateway (default namespace)
    if (messageResult.conversation_id) {
      const room = `conversation:${messageResult.conversation_id}`;
      this.appGateway.emitToRoom(room, 'message:bookmarked', {
        messageId,
        userId,
        bookmarked: true,
        message: updatedMessage,
      });
      console.log('📡 Emitted message:bookmarked to room:', room);
    } else if (messageResult.channel_id) {
      const room = `channel:${messageResult.channel_id}`;
      this.appGateway.emitToRoom(room, 'message:bookmarked', {
        messageId,
        userId,
        bookmarked: true,
        message: updatedMessage,
      });
      console.log('📡 Emitted message:bookmarked to room:', room);
    }

    return {
      message: 'Message bookmarked successfully',
      data: updatedMessage,
    };
  }

  /**
   * Remove bookmark from a message
   */
  async removeBookmark(messageId: string, userId: string) {
    // Check if message exists using table query
    const messageQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .limit(1)
      .execute();

    const messages = messageQueryResult.data || messageQueryResult || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new NotFoundException('Message not found');
    }

    const messageResult = messages[0];

    // Update message to remove bookmark using table query
    await this.db
      .table('messages')
      .update({
        is_bookmarked: false,
        bookmarked_at: null,
        bookmarked_by: null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .execute();

    // Fetch updated message
    const updatedMessageResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .limit(1)
      .execute();

    const updatedMessages = updatedMessageResult.data || updatedMessageResult || [];
    const updatedMessage = updatedMessages[0];

    console.log('✅ Bookmark removed from message:', messageId);

    // Emit WebSocket event for real-time update using appGateway (default namespace)
    if (messageResult.conversation_id) {
      const room = `conversation:${messageResult.conversation_id}`;
      this.appGateway.emitToRoom(room, 'message:bookmarked', {
        messageId,
        userId,
        bookmarked: false,
        message: updatedMessage,
      });
      console.log('📡 Emitted message:bookmarked (remove) to room:', room);
    } else if (messageResult.channel_id) {
      const room = `channel:${messageResult.channel_id}`;
      this.appGateway.emitToRoom(room, 'message:bookmarked', {
        messageId,
        userId,
        bookmarked: false,
        message: updatedMessage,
      });
      console.log('📡 Emitted message:bookmarked (remove) to room:', room);
    }

    return {
      message: 'Bookmark removed successfully',
      data: updatedMessage,
    };
  }

  /**
   * Get all bookmarked messages in a conversation OR channel (no pagination - returns all)
   * This endpoint works for both - conversationId can be either a conversation or channel ID
   */
  async getBookmarkedMessages(conversationOrChannelId: string, userId: string) {
    // Try to find if it's a conversation member first
    const conversationMemberResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationOrChannelId,
      user_id: userId,
    });

    const conversationMemberData = Array.isArray(conversationMemberResult.data)
      ? conversationMemberResult.data
      : [];

    const isConversationMember = conversationMemberData.length > 0;

    // If not a conversation member, check if it's a channel member
    if (!isConversationMember) {
      const channelMemberResult = await this.db.findMany('channel_members', {
        channel_id: conversationOrChannelId,
        user_id: userId,
      });

      const channelMemberData = Array.isArray(channelMemberResult.data)
        ? channelMemberResult.data
        : [];

      if (channelMemberData.length === 0) {
        throw new ForbiddenException('You are not a member of this conversation or channel');
      }
    }

    // Get ALL bookmarked messages - no pagination
    console.log('📚 Building query for bookmarked messages:', {
      chatId: conversationOrChannelId,
      isConversationMember,
      willQueryField: isConversationMember ? 'conversation_id' : 'channel_id',
    });

    // First, let's check what messages exist for this conversation/channel
    const debugQuery = this.db
      .table('messages')
      .select('id, content, is_bookmarked, is_deleted, conversation_id, channel_id')
      .limit(10);

    if (isConversationMember) {
      debugQuery.where('conversation_id', '=', conversationOrChannelId);
    } else {
      debugQuery.where('channel_id', '=', conversationOrChannelId);
    }

    const debugResult = await debugQuery.execute();
    console.log('📚 DEBUG - All messages in this chat:', {
      chatId: conversationOrChannelId,
      field: isConversationMember ? 'conversation_id' : 'channel_id',
      messagesFound: debugResult.data?.length || 0,
      messages: debugResult.data || debugResult,
    });

    // Get bookmarked messages
    // Note: is_deleted can be null or false, so we need to handle both
    let bookmarkedMessagesResult;

    if (isConversationMember) {
      bookmarkedMessagesResult = await this.db
        .table('messages')
        .select('*')
        .where('conversation_id', '=', conversationOrChannelId)
        .where('is_bookmarked', '=', true)
        .orderBy('bookmarked_at', 'DESC')
        .execute();
    } else {
      bookmarkedMessagesResult = await this.db
        .table('messages')
        .select('*')
        .where('channel_id', '=', conversationOrChannelId)
        .where('is_bookmarked', '=', true)
        .orderBy('bookmarked_at', 'DESC')
        .execute();
    }

    console.log('📚 Bookmarks query executed');

    console.log('📚 Raw query result:', {
      resultType: typeof bookmarkedMessagesResult,
      isArray: Array.isArray(bookmarkedMessagesResult),
      hasData: !!bookmarkedMessagesResult?.data,
      result: bookmarkedMessagesResult,
    });

    const bookmarkedMessages = Array.isArray(bookmarkedMessagesResult)
      ? bookmarkedMessagesResult
      : bookmarkedMessagesResult.data || [];

    // Enrich messages with user data
    const enrichedMessages = await Promise.all(
      bookmarkedMessages.map(async (message) => {
        try {
          const userProfile = await this.db.getUserById(message.user_id);
          return {
            ...message,
            user: {
              id: message.user_id,
              name:
                userProfile?.name ||
                userProfile?.metadata?.name ||
                userProfile?.metadata?.full_name ||
                'Unknown User',
              email: userProfile?.email || null,
              avatarUrl: userProfile?.metadata?.avatarUrl || userProfile?.avatar_url || null,
            },
          };
        } catch (error) {
          console.error('Failed to fetch user for message:', message.id, error);
          return {
            ...message,
            user: {
              id: message.user_id,
              name: 'Unknown User',
              email: null,
              avatarUrl: null,
            },
          };
        }
      }),
    );

    const total = enrichedMessages.length;

    console.log('📚 Fetched ALL bookmarked messages:', {
      chatId: conversationOrChannelId,
      type: isConversationMember ? 'conversation' : 'channel',
      whereCondition: isConversationMember ? 'conversation_id' : 'channel_id',
      total,
      count: enrichedMessages.length,
      enriched: true,
    });

    return {
      data: enrichedMessages,
      total,
    };
  }

  /**
   * Get all bookmarked messages in a channel with pagination
   */
  async getChannelBookmarkedMessages(
    channelId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    // Verify user is part of the channel
    const channelMemberResult = await this.db.findMany('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    const channelMemberData = Array.isArray(channelMemberResult.data)
      ? channelMemberResult.data
      : [];

    if (channelMemberData.length === 0) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get bookmarked messages using database query builder
    const bookmarkedMessagesResult = await this.db
      .table('messages')
      .select('*')
      .where('channel_id', '=', channelId)
      .where('is_bookmarked', '=', true)
      .where('is_deleted', '=', false)
      .orderBy('bookmarked_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .execute();

    const bookmarkedMessages = Array.isArray(bookmarkedMessagesResult)
      ? bookmarkedMessagesResult
      : bookmarkedMessagesResult.data || [];

    // Get total count for pagination
    const totalResult = await this.db
      .table('messages')
      .select('COUNT(*) as count')
      .where('channel_id', '=', channelId)
      .where('is_bookmarked', '=', true)
      .where('is_deleted', '=', false)
      .execute();

    const totalData = Array.isArray(totalResult) ? totalResult : totalResult.data || [];
    const total = totalData && totalData[0] ? parseInt(totalData[0].count) : 0;
    const totalPages = Math.ceil(total / limit);

    console.log('📚 Fetched channel bookmarked messages:', {
      channelId,
      page,
      limit,
      total,
      count: bookmarkedMessages.length,
    });

    return {
      data: bookmarkedMessages,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // ==================== PIN OPERATIONS ====================

  /**
   * Pin a message in a conversation
   * Automatically unpins any previously pinned message in the same conversation
   */
  async pinMessage(conversationId: string, messageId: string, userId: string) {
    // Check if message exists and belongs to the conversation using table query
    const messageQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .where('conversation_id', '=', conversationId)
      .limit(1)
      .execute();

    const messages = messageQueryResult.data || messageQueryResult || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new NotFoundException('Message not found or does not belong to this conversation');
    }

    const messageResult = messages[0];

    // Verify user is part of the conversation
    const conversationMemberResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const conversationMemberData = Array.isArray(conversationMemberResult.data)
      ? conversationMemberResult.data
      : [];

    if (conversationMemberData.length === 0) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    // First, unpin any previously pinned messages in this conversation
    const previouslyPinnedResult = await this.db
      .table('messages')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .where('is_pinned', '=', true)
      .execute();

    const previouslyPinned: any[] = Array.isArray(previouslyPinnedResult)
      ? previouslyPinnedResult
      : previouslyPinnedResult.data || [];

    // Unpin all previously pinned messages using table query
    for (const pinnedMsg of previouslyPinned) {
      await this.db
        .table('messages')
        .update({
          is_pinned: false,
          pinned_at: null,
          pinned_by: null,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', pinnedMsg.id)
        .execute();
      console.log('📌 Unpinned previous message:', pinnedMsg.id);
    }

    // Pin the new message using table query
    await this.db
      .table('messages')
      .update({
        is_pinned: true,
        pinned_at: new Date().toISOString(),
        pinned_by: userId,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .execute();

    // Fetch updated message
    const updatedMessageResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .limit(1)
      .execute();

    const updatedMessages = updatedMessageResult.data || updatedMessageResult || [];
    const updatedMessage = updatedMessages[0];

    console.log('✅ Message pinned:', messageId);

    // Emit WebSocket event for real-time update using appGateway (default namespace)
    const room = `conversation:${conversationId}`;
    this.appGateway.emitToRoom(room, 'message:pinned', {
      messageId,
      userId,
      pinned: true,
      previouslyPinnedMessages: previouslyPinned.map((m) => m.id),
      message: updatedMessage,
    });
    console.log('📡 Emitted message:pinned to room:', room);

    return {
      message: 'Message pinned successfully',
      previouslyPinnedCount: previouslyPinned.length,
      data: updatedMessage,
    };
  }

  /**
   * Unpin a message from a conversation
   */
  async unpinMessage(conversationId: string, messageId: string, userId: string) {
    // Check if message exists and belongs to the conversation using table query
    const messageQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .where('conversation_id', '=', conversationId)
      .limit(1)
      .execute();

    const messages = messageQueryResult.data || messageQueryResult || [];

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new NotFoundException('Message not found or does not belong to this conversation');
    }

    const messageResult = messages[0];

    // Verify user is part of the conversation
    const conversationMemberResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const conversationMemberData = Array.isArray(conversationMemberResult.data)
      ? conversationMemberResult.data
      : [];

    if (conversationMemberData.length === 0) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    // Unpin the message using table query
    await this.db
      .table('messages')
      .update({
        is_pinned: false,
        pinned_at: null,
        pinned_by: null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .execute();

    // Fetch updated message
    const updatedMessageResult = await this.db
      .table('messages')
      .select('*')
      .where('id', '=', messageId)
      .limit(1)
      .execute();

    const updatedMessages = updatedMessageResult.data || updatedMessageResult || [];
    const updatedMessage = updatedMessages[0];

    console.log('✅ Message unpinned:', messageId);

    // Emit WebSocket event for real-time update using appGateway (default namespace)
    const room = `conversation:${conversationId}`;
    this.appGateway.emitToRoom(room, 'message:pinned', {
      messageId,
      userId,
      pinned: false,
      message: updatedMessage,
    });
    console.log('📡 Emitted message:pinned (unpin) to room:', room);

    return {
      message: 'Message unpinned successfully',
      data: updatedMessage,
    };
  }

  /**
   * Get the currently pinned message in a conversation
   */
  async getPinnedMessage(conversationId: string, userId: string) {
    // Verify user is part of the conversation
    const conversationMemberResult = await this.db.findMany('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    const conversationMemberData = Array.isArray(conversationMemberResult.data)
      ? conversationMemberResult.data
      : [];

    if (conversationMemberData.length === 0) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    // Get pinned message
    const pinnedMessageResult = await this.db
      .table('messages')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .where('is_pinned', '=', true)
      .where('is_deleted', '=', false)
      .limit(1)
      .execute();

    // Handle different result formats
    const pinnedMessages = Array.isArray(pinnedMessageResult)
      ? pinnedMessageResult
      : pinnedMessageResult?.data || [];

    const pinnedMessage = pinnedMessages.length > 0 ? pinnedMessages[0] : null;

    console.log('📌 Fetched pinned message for conversation:', conversationId, {
      resultType: typeof pinnedMessageResult,
      isArray: Array.isArray(pinnedMessageResult),
      hasData: !!pinnedMessageResult?.data,
      messagesCount: pinnedMessages.length,
      found: pinnedMessage ? 'yes' : 'no',
    });

    // If no pinned message, return null
    if (!pinnedMessage) {
      return { data: null };
    }

    // Fetch message sender info (who wrote the message)
    const messageSender: any = await this.db.getUserById(pinnedMessage.user_id);

    // Fetch pinned_by user info (who pinned the message)
    const pinnedByUser: any = pinnedMessage.pinned_by
      ? await this.db.getUserById(pinnedMessage.pinned_by)
      : null;

    // Return pinned message with sender and pinned_by info
    return {
      data: {
        ...pinnedMessage,
        sender: messageSender
          ? {
              id: messageSender.id,
              username: messageSender.username || messageSender.email?.split('@')[0] || 'Unknown',
              full_name:
                messageSender.metadata?.name ||
                messageSender.metadata?.full_name ||
                messageSender.name ||
                messageSender.email?.split('@')[0] ||
                'Unknown User',
              avatar_url: messageSender.metadata?.avatarUrl || messageSender.avatar_url || null,
            }
          : null,
        pinned_by_user: pinnedByUser
          ? {
              id: pinnedByUser.id,
              username: pinnedByUser.username || pinnedByUser.email?.split('@')[0] || 'Unknown',
              full_name:
                pinnedByUser.metadata?.name ||
                pinnedByUser.metadata?.full_name ||
                pinnedByUser.name ||
                pinnedByUser.email?.split('@')[0] ||
                'Unknown User',
              avatar_url: pinnedByUser.metadata?.avatarUrl || pinnedByUser.avatar_url || null,
            }
          : null,
      },
    };
  }

  // Read tracking and unread count methods
  async markChannelAsRead(
    channelId: string,
    lastReadMessageId: string | undefined,
    userId: string,
  ): Promise<void> {
    // Verify user is a member of the channel
    const memberResult = await this.db.findOne('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    if (!memberResult) {
      throw new ForbiddenException('Not a member of this channel');
    }

    // Update last_read_at timestamp
    const updateResult = await this.db
      .table('channel_members')
      .update({ last_read_at: new Date().toISOString() })
      .where('channel_id', '=', channelId)
      .where('user_id', '=', userId)
      .execute();

    // Get all messages in the channel (NO is_deleted filter in query!)
    const messagesResult = await this.db
      .table('messages')
      .select('*')
      .where('channel_id', '=', channelId)
      .execute();

    const messagesData = Array.isArray(messagesResult.data) ? messagesResult.data : [];

    // Filter deleted messages manually
    const messages = messagesData.filter((msg) => msg.is_deleted !== true);

    console.log('📖 Creating read receipts for channel:', {
      channelId,
      userId,
      totalMessages: messagesData.length,
      nonDeletedMessages: messages.length,
    });

    // Get existing read receipts for this user in this channel
    const existingReceiptsResult = await this.db
      .table('message_read_receipts')
      .select('message_id')
      .where('user_id', '=', userId)
      .execute();

    const existingReceiptsData = Array.isArray(existingReceiptsResult.data)
      ? existingReceiptsResult.data
      : [];
    const existingMessageIds = new Set(existingReceiptsData.map((r: any) => r.message_id));

    console.log('📖 Existing receipts:', {
      count: existingMessageIds.size,
      messageIds: Array.from(existingMessageIds),
    });

    // Insert read receipts ONLY for messages that don't have receipts yet
    const newlyReadMessageIds: string[] = [];
    for (const message of messages) {
      // Don't create read receipt for own messages
      if (message.user_id === userId) continue;

      // Skip if receipt already exists
      if (existingMessageIds.has(message.id)) {
        console.log(`⏭️ Skipping receipt for message ${message.id} - already exists`);
        continue;
      }

      try {
        await this.db.insert('message_read_receipts', {
          message_id: message.id,
          user_id: userId,
          read_at: new Date().toISOString(),
        });
        // If insert succeeded, this is a newly read message
        newlyReadMessageIds.push(message.id);
        console.log(`✅ Created receipt for message ${message.id}`);
      } catch (error) {
        console.error('Error creating read receipt:', error);
      }
    }

    console.log('✓ Channel marked as read:', {
      channelId,
      userId,
      lastReadMessageId,
      totalMessages: messages.length,
      newlyReadMessages: newlyReadMessageIds.length,
    });

    // Emit WebSocket event so other users know you read the messages
    this.appGateway.emitToRoom(`channel:${channelId}`, 'channel:read', {
      channelId,
      userId,
      readAt: new Date().toISOString(),
      messageId: lastReadMessageId,
    });

    // Emit messages:read event ONLY for newly read messages
    if (newlyReadMessageIds.length > 0) {
      console.log(
        '📡 Emitting messages:read event for',
        newlyReadMessageIds.length,
        'newly read messages',
      );
      this.appGateway.emitToRoom(`channel:${channelId}`, 'messages:read', {
        messageIds: newlyReadMessageIds,
        userId,
        readAt: new Date().toISOString(),
      });
    } else {
      console.log('⏭️ No new messages to emit (all already read)');
    }
  }

  async getChannelUnreadCount(channelId: string, userId: string): Promise<number> {
    // Get user's last read timestamp
    const member = await this.db.findOne('channel_members', {
      channel_id: channelId,
      user_id: userId,
    });

    if (!member) {
      console.log('📊 Channel unread count: User not a member', { channelId, userId });
      return 0; // Not a member, no unread messages
    }

    const lastReadAt = member.last_read_at || null;
    console.log('📊 Checking unread messages since:', {
      channelId,
      userId,
      lastReadAt,
      hasLastRead: !!lastReadAt,
    });

    // Get ALL messages in the channel using the EXACT same query as getChannelMessages
    const messagesQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('channel_id', '=', channelId)
      .execute();

    console.log('📊 Raw query result:', {
      hasData: !!messagesQueryResult.data,
      dataLength: Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data.length : 0,
    });

    const messagesData = Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data : [];

    // Filter out deleted messages manually (is_deleted might be true, false, or null)
    const allMessages = messagesData.filter((msg) => msg.is_deleted !== true);

    console.log('📊 Messages count:', {
      totalRaw: messagesData.length,
      nonDeleted: allMessages.length,
    });

    if (allMessages.length > 0) {
      console.log(
        '📊 Sample messages:',
        allMessages.slice(0, 2).map((m) => ({
          id: m.id,
          created_at: m.created_at,
          user_id: m.user_id,
          is_deleted: m.is_deleted,
          content: m.content?.substring(0, 30),
        })),
      );
    }

    // Filter messages manually
    const unreadMessages = allMessages.filter((msg) => {
      // Don't count own messages
      if (msg.user_id === userId) return false;

      // If never read, all messages are unread
      if (!lastReadAt) return true;

      // Check if message was created after last read
      const messageDate = new Date(msg.created_at);
      const lastReadDate = new Date(lastReadAt);
      return messageDate > lastReadDate;
    });

    // Get the latest message timestamp
    const latestMessage =
      allMessages.length > 0
        ? allMessages.reduce((latest, msg) => {
            return new Date(msg.created_at) > new Date(latest.created_at) ? msg : latest;
          })
        : null;

    console.log('📊 Channel unread count result:', {
      channelId,
      userId,
      totalMessages: allMessages.length,
      unreadCount: unreadMessages.length,
      lastReadAt,
      latestMessageCreatedAt: latestMessage?.created_at || 'none',
      latestMessageUser: latestMessage?.user_id || 'none',
      sampleUnreadMessage: unreadMessages[0]
        ? {
            id: unreadMessages[0].id,
            created_at: unreadMessages[0].created_at,
            user_id: unreadMessages[0].user_id,
            content: unreadMessages[0].content?.substring(0, 50),
          }
        : 'none',
    });

    return unreadMessages.length;
  }

  async markConversationAsRead(
    conversationId: string,
    lastReadMessageId: string | undefined,
    userId: string,
  ): Promise<void> {
    // Verify user is a member of the conversation
    const memberResult = await this.db.findOne('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    if (!memberResult) {
      throw new ForbiddenException('Not a member of this conversation');
    }

    // Get the latest message ID from the database (don't trust frontend temporary IDs)
    const latestMessageResult = await this.db
      .table('messages')
      .select('id')
      .where('conversation_id', '=', conversationId)
      .orderBy('created_at', 'DESC')
      .limit(1)
      .execute();

    const latestMessageData = Array.isArray(latestMessageResult.data)
      ? latestMessageResult.data
      : [];

    const latestMessageId = latestMessageData.length > 0 ? latestMessageData[0].id : null;

    // Update last_read_at timestamp and last_read_message_id with actual DB message ID
    const updateData: any = {
      last_read_at: new Date().toISOString(),
    };

    if (latestMessageId) {
      updateData.last_read_message_id = latestMessageId;
    }

    const updateResult = await this.db
      .table('conversation_members')
      .update(updateData)
      .where('conversation_id', '=', conversationId)
      .where('user_id', '=', userId)
      .execute();

    // Get all messages in the conversation (NO is_deleted filter in query!)
    const messagesResult = await this.db
      .table('messages')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .execute();

    const messagesData = Array.isArray(messagesResult.data) ? messagesResult.data : [];

    // Filter deleted messages manually
    const messages = messagesData.filter((msg) => msg.is_deleted !== true);

    console.log('📖 Creating read receipts for conversation:', {
      conversationId,
      userId,
      totalMessages: messagesData.length,
      nonDeletedMessages: messages.length,
    });

    // Get existing read receipts for this user in this conversation
    const existingReceiptsResult = await this.db
      .table('message_read_receipts')
      .select('message_id')
      .where('user_id', '=', userId)
      .execute();

    const existingReceiptsData = Array.isArray(existingReceiptsResult.data)
      ? existingReceiptsResult.data
      : [];
    const existingMessageIds = new Set(existingReceiptsData.map((r: any) => r.message_id));

    console.log('📖 Existing receipts:', {
      count: existingMessageIds.size,
      messageIds: Array.from(existingMessageIds),
    });

    // Insert read receipts ONLY for messages that don't have receipts yet
    const newlyReadMessageIds: string[] = [];
    for (const message of messages) {
      // Don't create read receipt for own messages
      if (message.user_id === userId) continue;

      // Skip if receipt already exists
      if (existingMessageIds.has(message.id)) {
        console.log(`⏭️ Skipping receipt for message ${message.id} - already exists`);
        continue;
      }

      try {
        await this.db.insert('message_read_receipts', {
          message_id: message.id,
          user_id: userId,
          read_at: new Date().toISOString(),
        });
        // If insert succeeded, this is a newly read message
        newlyReadMessageIds.push(message.id);
        console.log(`✅ Created receipt for message ${message.id}`);
      } catch (error) {
        console.error('Error creating read receipt:', error);
      }
    }

    // Emit WebSocket event
    this.appGateway.emitToRoom(`conversation:${conversationId}`, 'conversation:read', {
      conversationId,
      userId,
      readAt: new Date().toISOString(),
      messageId: lastReadMessageId,
    });

    // Emit messages:read event ONLY for newly read messages
    if (newlyReadMessageIds.length > 0) {
      console.log(
        '📡 Emitting messages:read event for',
        newlyReadMessageIds.length,
        'newly read messages',
      );
      this.appGateway.emitToRoom(`conversation:${conversationId}`, 'messages:read', {
        messageIds: newlyReadMessageIds,
        userId,
        readAt: new Date().toISOString(),
      });
    } else {
      console.log('⏭️ No new messages to emit (all already read)');
    }
  }

  async getConversationUnreadCount(conversationId: string, userId: string): Promise<number> {
    // Get user's last read timestamp
    const member = await this.db.findOne('conversation_members', {
      conversation_id: conversationId,
      user_id: userId,
    });

    if (!member) {
      console.log('📊 Conversation unread count: User not a member', { conversationId, userId });
      return 0; // Not a member, no unread messages
    }

    const lastReadAt = member.last_read_at || null;
    console.log('📊 Checking conversation unread since:', {
      conversationId,
      userId,
      lastReadAt,
      hasLastRead: !!lastReadAt,
    });

    // Get ALL messages in the conversation using the EXACT same query as getConversationMessages
    const messagesQueryResult = await this.db
      .table('messages')
      .select('*')
      .where('conversation_id', '=', conversationId)
      .execute();

    console.log('📊 Raw query result:', {
      hasData: !!messagesQueryResult.data,
      dataLength: Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data.length : 0,
    });

    const messagesData = Array.isArray(messagesQueryResult.data) ? messagesQueryResult.data : [];

    // Filter out deleted messages manually (is_deleted might be true, false, or null)
    const allMessages = messagesData.filter((msg) => msg.is_deleted !== true);

    console.log('📊 Messages count:', {
      totalRaw: messagesData.length,
      nonDeleted: allMessages.length,
    });

    if (allMessages.length > 0) {
      console.log(
        '📊 Sample messages:',
        allMessages.slice(0, 2).map((m) => ({
          id: m.id,
          created_at: m.created_at,
          user_id: m.user_id,
          is_deleted: m.is_deleted,
          content: m.content?.substring(0, 30),
        })),
      );
    }

    // Filter messages manually
    const unreadMessages = allMessages.filter((msg) => {
      // Don't count own messages
      if (msg.user_id === userId) return false;

      // If never read, all messages are unread
      if (!lastReadAt) return true;

      // Check if message was created after last read
      const messageDate = new Date(msg.created_at);
      const lastReadDate = new Date(lastReadAt);
      return messageDate > lastReadDate;
    });

    // Get the latest message timestamp
    const latestMessage =
      allMessages.length > 0
        ? allMessages.reduce((latest, msg) => {
            return new Date(msg.created_at) > new Date(latest.created_at) ? msg : latest;
          })
        : null;

    console.log('📊 Conversation unread count result:', {
      conversationId,
      userId,
      totalMessages: allMessages.length,
      unreadCount: unreadMessages.length,
      lastReadAt,
      latestMessageCreatedAt: latestMessage?.created_at || 'none',
      latestMessageUser: latestMessage?.user_id || 'none',
      sampleUnreadMessage: unreadMessages[0]
        ? {
            id: unreadMessages[0].id,
            created_at: unreadMessages[0].created_at,
            user_id: unreadMessages[0].user_id,
            content: unreadMessages[0].content?.substring(0, 50),
          }
        : 'none',
    });

    return unreadMessages.length;
  }

  // Read receipts methods
  async getMessageReadReceipts(messageId: string, userId: string): Promise<any[]> {
    // Get the message to verify access
    const message = await this.db.findOne('messages', { id: messageId });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to this message
    if (message.channel_id) {
      const member = await this.db.findOne('channel_members', {
        channel_id: message.channel_id,
        user_id: userId,
      });
      if (!member) {
        throw new ForbiddenException('Not authorized to view read receipts for this message');
      }
    } else if (message.conversation_id) {
      const member = await this.db.findOne('conversation_members', {
        conversation_id: message.conversation_id,
        user_id: userId,
      });
      if (!member) {
        throw new ForbiddenException('Not authorized to view read receipts for this message');
      }
    }

    // Get all read receipts for this message
    const receiptsResult = await this.db.findMany('message_read_receipts', {
      message_id: messageId,
    });

    const receipts = Array.isArray(receiptsResult.data) ? receiptsResult.data : [];

    console.log('📖 Fetched read receipts for message:', { messageId, count: receipts.length });

    return receipts;
  }

  // ==================== POLL METHODS ====================

  /**
   * Vote on a poll
   */
  async votePoll(messageId: string, pollId: string, optionId: string, userId: string) {
    // Get the message containing the poll
    const messageResult = await this.db.findOne('messages', { id: messageId });
    if (!messageResult) {
      throw new NotFoundException('Message not found');
    }

    // Parse linked_content to find the poll
    let linkedContent: any[] = [];
    try {
      linkedContent =
        typeof messageResult.linked_content === 'string'
          ? JSON.parse(messageResult.linked_content)
          : messageResult.linked_content || [];
    } catch (e) {
      linkedContent = [];
    }

    const pollContent = linkedContent.find(
      (item: any) => item.type === 'poll' && item.poll?.id === pollId,
    );
    if (!pollContent || !pollContent.poll) {
      throw new NotFoundException('Poll not found');
    }

    const poll = pollContent.poll;

    // Check if poll is open
    if (!poll.isOpen) {
      throw new BadRequestException('Poll is closed');
    }

    // Check if option exists
    const optionExists = poll.options.some((opt: any) => opt.id === optionId);
    if (!optionExists) {
      throw new BadRequestException('Invalid option');
    }

    // Check if user already voted (using the poll_votes table)
    const existingVote = await this.db.findOne('poll_votes', {
      message_id: messageId,
      poll_id: pollId,
      user_id: userId,
    });

    if (existingVote) {
      throw new BadRequestException('You have already voted on this poll');
    }

    // Record the vote
    await this.db.insert('poll_votes', {
      message_id: messageId,
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
    });

    // Update vote counts in the poll
    const updatedOptions = poll.options.map((opt: any) => ({
      ...opt,
      voteCount: opt.id === optionId ? (opt.voteCount || 0) + 1 : opt.voteCount || 0,
    }));

    const updatedPoll = {
      ...poll,
      options: updatedOptions,
      totalVotes: (poll.totalVotes || 0) + 1,
    };

    // Update the linked_content in the message
    const updatedLinkedContent = linkedContent.map((item: any) => {
      if (item.type === 'poll' && item.poll?.id === pollId) {
        return { ...item, poll: updatedPoll };
      }
      return item;
    });

    await this.db
      .table('messages')
      .update({
        linked_content: JSON.stringify(updatedLinkedContent),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .execute();

    console.log('🗳️ Vote recorded:', { messageId, pollId, optionId, userId });

    // Emit WebSocket event for real-time update
    const room = messageResult.channel_id
      ? `channel:${messageResult.channel_id}`
      : `conversation:${messageResult.conversation_id}`;

    this.appGateway.emitToRoom(room, 'poll:voted', {
      messageId,
      pollId,
      optionId,
      userId,
      poll: updatedPoll,
    });

    return {
      message: 'Vote recorded successfully',
      data: {
        poll: updatedPoll,
        userVotedOptionId: optionId,
      },
    };
  }

  /**
   * Close a poll (creator only)
   */
  async closePoll(messageId: string, pollId: string, userId: string) {
    // Get the message containing the poll
    const messageResult = await this.db.findOne('messages', { id: messageId });
    if (!messageResult) {
      throw new NotFoundException('Message not found');
    }

    // Parse linked_content to find the poll
    let linkedContent: any[] = [];
    try {
      linkedContent =
        typeof messageResult.linked_content === 'string'
          ? JSON.parse(messageResult.linked_content)
          : messageResult.linked_content || [];
    } catch (e) {
      linkedContent = [];
    }

    const pollContent = linkedContent.find(
      (item: any) => item.type === 'poll' && item.poll?.id === pollId,
    );
    if (!pollContent || !pollContent.poll) {
      throw new NotFoundException('Poll not found');
    }

    const poll = pollContent.poll;

    // Verify user is the poll creator
    if (poll.createdBy !== userId) {
      throw new ForbiddenException('Only the poll creator can close the poll');
    }

    // Check if already closed
    if (!poll.isOpen) {
      throw new BadRequestException('Poll is already closed');
    }

    // Update the poll to closed
    const updatedPoll = {
      ...poll,
      isOpen: false,
    };

    // Update the linked_content in the message
    const updatedLinkedContent = linkedContent.map((item: any) => {
      if (item.type === 'poll' && item.poll?.id === pollId) {
        return { ...item, poll: updatedPoll };
      }
      return item;
    });

    await this.db
      .table('messages')
      .update({
        linked_content: JSON.stringify(updatedLinkedContent),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .execute();

    console.log('🔒 Poll closed:', { messageId, pollId, userId });

    // Emit WebSocket event for real-time update
    const room = messageResult.channel_id
      ? `channel:${messageResult.channel_id}`
      : `conversation:${messageResult.conversation_id}`;

    this.appGateway.emitToRoom(room, 'poll:closed', {
      messageId,
      pollId,
      poll: updatedPoll,
    });

    return {
      message: 'Poll closed successfully',
      data: { poll: updatedPoll },
    };
  }

  /**
   * Get poll with user's vote status
   */
  async getPoll(messageId: string, pollId: string, userId: string) {
    // Get the message containing the poll
    const messageResult = await this.db.findOne('messages', { id: messageId });
    if (!messageResult) {
      throw new NotFoundException('Message not found');
    }

    // Parse linked_content to find the poll
    let linkedContent: any[] = [];
    try {
      linkedContent =
        typeof messageResult.linked_content === 'string'
          ? JSON.parse(messageResult.linked_content)
          : messageResult.linked_content || [];
    } catch (e) {
      linkedContent = [];
    }

    const pollContent = linkedContent.find(
      (item: any) => item.type === 'poll' && item.poll?.id === pollId,
    );
    if (!pollContent || !pollContent.poll) {
      throw new NotFoundException('Poll not found');
    }

    const poll = pollContent.poll;

    // Check if user has voted
    const userVote = await this.db.findOne('poll_votes', {
      message_id: messageId,
      poll_id: pollId,
      user_id: userId,
    });

    const userVotedOptionId = userVote ? userVote.option_id : null;
    const hasVoted = !!userVotedOptionId;

    // Determine if we should show results
    // Show results if: poll is closed, user has voted, or showResultsBeforeVoting is true
    const showResults = !poll.isOpen || hasVoted || poll.showResultsBeforeVoting;

    // If not showing results, hide vote counts
    let pollData = { ...poll };
    if (!showResults) {
      pollData = {
        ...poll,
        options: poll.options.map((opt: any) => ({
          ...opt,
          voteCount: undefined,
        })),
        totalVotes: undefined,
      };
    }

    return {
      data: {
        poll: pollData,
        userVotedOptionId,
        hasVoted,
        showResults,
      },
    };
  }

  // ==================== SCHEDULED MESSAGE METHODS ====================

  /**
   * Schedule a message to be sent later
   */
  async scheduleMessage(
    workspaceId: string,
    scheduleDto: import('./dto/scheduled-message.dto').ScheduleMessageDto,
    userId: string,
  ): Promise<{ data: ReturnType<typeof this.formatScheduledMessage>; message: string }> {
    const { scheduledAt, channelId, conversationId, ...messageData } = scheduleDto;

    console.log('📅 [SCHEDULE] ========== SCHEDULING MESSAGE ==========');
    console.log('📅 [SCHEDULE] Received scheduledAt from frontend:', scheduledAt);

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();

    console.log('📅 [SCHEDULE] Parsed scheduledDate (UTC):', scheduledDate.toISOString());
    console.log('📅 [SCHEDULE] Parsed scheduledDate (Local):', scheduledDate.toLocaleString());
    console.log('📅 [SCHEDULE] Current time (UTC):', now.toISOString());
    console.log('📅 [SCHEDULE] Current time (Local):', now.toLocaleString());
    console.log(
      '📅 [SCHEDULE] Time difference (minutes):',
      (scheduledDate.getTime() - now.getTime()) / 60000,
    );

    if (scheduledDate <= now) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Validate that either channelId or conversationId is provided
    if (!channelId && !conversationId) {
      throw new BadRequestException('Either channelId or conversationId must be provided');
    }

    // Verify user has access to channel/conversation
    if (channelId) {
      await this.checkChannelAccess(channelId, userId);
    } else if (conversationId) {
      await this.checkConversationAccess(conversationId, userId);
    }

    // Create the scheduled message
    const scheduledMessage = await this.db.insert('scheduled_messages', {
      workspace_id: workspaceId,
      channel_id: channelId || null,
      conversation_id: conversationId || null,
      user_id: userId,
      content: messageData.content,
      content_html: messageData.contentHtml || null,
      attachments: JSON.stringify(messageData.attachments || []),
      mentions: JSON.stringify(messageData.mentions || []),
      linked_content: JSON.stringify(messageData.linkedContent || []),
      thread_id: messageData.threadId || null,
      parent_id: messageData.parentId || null,
      scheduled_at: scheduledDate.toISOString(),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log('📅 Message scheduled:', {
      id: scheduledMessage.id,
      scheduledAt: scheduledDate.toISOString(),
      channelId,
      conversationId,
    });

    return {
      data: this.formatScheduledMessage(scheduledMessage),
      message: 'Message scheduled successfully',
    };
  }

  /**
   * Get user's scheduled messages
   */
  async getScheduledMessages(
    workspaceId: string,
    userId: string,
    query: import('./dto/scheduled-message.dto').QueryScheduledMessagesDto,
  ): Promise<{ data: Array<ReturnType<typeof this.formatScheduledMessage>>; total: number }> {
    const { status, channelId, conversationId, limit = 50, offset = 0 } = query;

    // Build query
    let queryBuilder = this.db
      .table('scheduled_messages')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId);

    if (status) {
      queryBuilder = queryBuilder.where('status', '=', status);
    }

    if (channelId) {
      queryBuilder = queryBuilder.where('channel_id', '=', channelId);
    }

    if (conversationId) {
      queryBuilder = queryBuilder.where('conversation_id', '=', conversationId);
    }

    const result = await queryBuilder
      .orderBy('scheduled_at', 'ASC')
      .limit(limit)
      .offset(offset)
      .execute();

    const messages = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];

    // Get destination names for each message
    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        const formatted = this.formatScheduledMessage(msg);

        // Get channel or conversation name
        if (msg.channel_id) {
          const channel = await this.db.findOne('channels', { id: msg.channel_id });
          if (channel) {
            formatted.destinationName = channel.name;
            formatted.destinationType = 'channel';
          }
        } else if (msg.conversation_id) {
          // For conversations, get the other participant's name
          const members = await this.db.findMany('conversation_members', {
            conversation_id: msg.conversation_id,
          });
          const membersData = Array.isArray(members.data) ? members.data : [];
          const otherMember = membersData.find((m) => m.user_id !== userId);
          if (otherMember) {
            const user = await this.db.getUserById(otherMember.user_id);
            formatted.destinationName =
              user?.metadata?.name || user?.name || user?.email?.split('@')[0] || 'Unknown';
            formatted.destinationType = 'conversation';
          }
        }

        return formatted;
      }),
    );

    return {
      data: formattedMessages,
      total: messages.length,
    };
  }

  /**
   * Get a scheduled message by ID
   */
  async getScheduledMessage(
    scheduledMessageId: string,
    userId: string,
  ): Promise<{ data: ReturnType<typeof this.formatScheduledMessage> }> {
    const message = await this.db.findOne('scheduled_messages', {
      id: scheduledMessageId,
    });

    if (!message) {
      throw new NotFoundException('Scheduled message not found');
    }

    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only view your own scheduled messages');
    }

    return { data: this.formatScheduledMessage(message) };
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(
    scheduledMessageId: string,
    updateDto: import('./dto/scheduled-message.dto').UpdateScheduledMessageDto,
    userId: string,
  ): Promise<{ data: ReturnType<typeof this.formatScheduledMessage>; message: string }> {
    const message = await this.db.findOne('scheduled_messages', {
      id: scheduledMessageId,
    });

    if (!message) {
      throw new NotFoundException('Scheduled message not found');
    }

    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only update your own scheduled messages');
    }

    if (message.status !== 'pending') {
      throw new BadRequestException('Can only update pending scheduled messages');
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateDto.content !== undefined) {
      updateData.content = updateDto.content;
    }

    if (updateDto.contentHtml !== undefined) {
      updateData.content_html = updateDto.contentHtml;
    }

    if (updateDto.scheduledAt !== undefined) {
      const scheduledDate = new Date(updateDto.scheduledAt);
      if (scheduledDate <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
      updateData.scheduled_at = scheduledDate.toISOString();
    }

    if (updateDto.attachments !== undefined) {
      updateData.attachments = JSON.stringify(updateDto.attachments);
    }

    if (updateDto.mentions !== undefined) {
      updateData.mentions = JSON.stringify(updateDto.mentions);
    }

    if (updateDto.linkedContent !== undefined) {
      updateData.linked_content = JSON.stringify(updateDto.linkedContent);
    }

    await this.db
      .table('scheduled_messages')
      .update(updateData)
      .where('id', '=', scheduledMessageId)
      .execute();

    // Fetch updated message
    const updatedMessage = await this.db.findOne('scheduled_messages', {
      id: scheduledMessageId,
    });

    console.log('📅 Scheduled message updated:', scheduledMessageId);

    return {
      data: this.formatScheduledMessage(updatedMessage),
      message: 'Scheduled message updated successfully',
    };
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(
    scheduledMessageId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const message = await this.db.findOne('scheduled_messages', {
      id: scheduledMessageId,
    });

    if (!message) {
      throw new NotFoundException('Scheduled message not found');
    }

    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only cancel your own scheduled messages');
    }

    if (message.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending scheduled messages');
    }

    await this.db
      .table('scheduled_messages')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', scheduledMessageId)
      .execute();

    console.log('📅 Scheduled message cancelled:', scheduledMessageId);

    return { message: 'Scheduled message cancelled successfully' };
  }

  /**
   * Process scheduled messages (called by cron job)
   */
  async processScheduledMessages(): Promise<{ processed: number; failed: number }> {
    const now = new Date();

    console.log(`[ScheduledMessages] ========== PROCESSING CHECK ==========`);
    console.log(`[ScheduledMessages] Current server time (UTC): ${now.toISOString()}`);
    console.log(`[ScheduledMessages] Current server time (Local): ${now.toLocaleString()}`);
    console.log(`[ScheduledMessages] Current time in ms: ${now.getTime()}`);

    // Get ALL pending messages - we'll filter in JavaScript because database
    // timestamp comparison is unreliable
    const allPending = await this.db
      .table('scheduled_messages')
      .select('*')
      .where('status', '=', 'pending')
      .limit(100)
      .execute();

    const allPendingMessages = Array.isArray(allPending.data)
      ? allPending.data
      : Array.isArray(allPending)
        ? allPending
        : [];

    console.log(`[ScheduledMessages] Total pending messages: ${allPendingMessages.length}`);

    // Filter messages that are actually due using JavaScript Date comparison
    // This is more reliable than database's timestamp comparison
    const messages = allPendingMessages.filter((msg: any) => {
      const scheduledAt = new Date(msg.scheduled_at);
      const isDue = scheduledAt.getTime() <= now.getTime();

      console.log(`[ScheduledMessages] - Message ID: ${msg.id}`);
      console.log(`[ScheduledMessages]   scheduled_at (raw): ${msg.scheduled_at}`);
      console.log(`[ScheduledMessages]   scheduled_at (ms): ${scheduledAt.getTime()}`);
      console.log(`[ScheduledMessages]   scheduled_at (local): ${scheduledAt.toLocaleString()}`);
      console.log(`[ScheduledMessages]   Is due (scheduled <= now)? ${isDue}`);

      return isDue;
    });

    console.log(`[ScheduledMessages] Messages due to send (after JS filter): ${messages.length}`);

    let processed = 0;
    let failed = 0;

    for (const scheduledMsg of messages) {
      try {
        // Parse JSON fields
        const attachments =
          typeof scheduledMsg.attachments === 'string'
            ? JSON.parse(scheduledMsg.attachments)
            : scheduledMsg.attachments || [];

        const mentions =
          typeof scheduledMsg.mentions === 'string'
            ? JSON.parse(scheduledMsg.mentions)
            : scheduledMsg.mentions || [];

        const linkedContent =
          typeof scheduledMsg.linked_content === 'string'
            ? JSON.parse(scheduledMsg.linked_content)
            : scheduledMsg.linked_content || [];

        // Build message data for sendMessage (use snake_case for database columns)
        const messageData: any = {
          content: scheduledMsg.content,
          content_html: scheduledMsg.content_html,
          attachments,
          mentions,
          linked_content: linkedContent,
          thread_id: scheduledMsg.thread_id,
          parent_id: scheduledMsg.parent_id,
          channel_id: scheduledMsg.channel_id || undefined,
          conversation_id: scheduledMsg.conversation_id || undefined,
        };

        // Send the message
        const sentMessage = await this.sendMessage(messageData, scheduledMsg.user_id);

        // Update scheduled message as sent
        await this.db
          .table('scheduled_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_message_id: sentMessage.id,
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', scheduledMsg.id)
          .execute();

        processed++;
        console.log('✅ Scheduled message sent:', scheduledMsg.id);
      } catch (error) {
        // Mark as failed
        await this.db
          .table('scheduled_messages')
          .update({
            status: 'failed',
            failure_reason: error.message || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', scheduledMsg.id)
          .execute();

        failed++;
        console.error('❌ Failed to send scheduled message:', scheduledMsg.id, error.message);
      }
    }

    return { processed, failed };
  }

  /**
   * Format scheduled message for API response
   */
  private formatScheduledMessage(message: any): {
    id: string;
    workspaceId: string;
    channelId: string | null;
    conversationId: string | null;
    userId: string;
    content: string;
    contentHtml: string | null;
    attachments: any[];
    mentions: string[];
    linkedContent: any[];
    threadId: string | null;
    parentId: string | null;
    scheduledAt: string;
    status: string;
    sentAt: string | null;
    sentMessageId: string | null;
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
    destinationName?: string;
    destinationType?: 'channel' | 'conversation';
  } {
    return {
      id: message.id,
      workspaceId: message.workspace_id,
      channelId: message.channel_id,
      conversationId: message.conversation_id,
      userId: message.user_id,
      content: message.content,
      contentHtml: message.content_html,
      attachments:
        typeof message.attachments === 'string'
          ? JSON.parse(message.attachments)
          : message.attachments || [],
      mentions:
        typeof message.mentions === 'string'
          ? JSON.parse(message.mentions)
          : message.mentions || [],
      linkedContent:
        typeof message.linked_content === 'string'
          ? JSON.parse(message.linked_content)
          : message.linked_content || [],
      threadId: message.thread_id,
      parentId: message.parent_id,
      scheduledAt: message.scheduled_at,
      status: message.status,
      sentAt: message.sent_at,
      sentMessageId: message.sent_message_id,
      failureReason: message.failure_reason,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
    };
  }

  // ==================== BOT MESSAGE METHODS ====================

  /**
   * Send a message from a bot to a channel
   */
  async sendBotMessage(data: {
    content: string;
    contentHtml?: string;
    userId: string;
    workspaceId: string;
    channelId?: string;
    conversationId?: string;
    replyToId?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    console.log('[ChatService] Bot sending message to channel:', data.channelId);

    // Use bot:{botId} format so we can look up bot details when fetching messages
    const botUserId = data.metadata?.botId ? `bot:${data.metadata.botId}` : 'bot';

    const messagePayload = {
      content: data.content,
      content_html: data.contentHtml || data.content,
      user_id: botUserId,
      channel_id: data.channelId || null,
      conversation_id: data.conversationId || null,
      parent_id: data.replyToId || null,
      attachments: JSON.stringify([]),
      mentions: JSON.stringify([]),
      linked_content: JSON.stringify([]),
      reactions: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const message = await this.db.insert('messages', messagePayload);

    // Create bot user info for the message
    const botUser = {
      id: botUserId,
      name: data.metadata?.botName || data.metadata?.botDisplayName || 'Bot',
      email: '',
      avatarUrl: data.metadata?.botAvatarUrl || null,
      isBot: true,
    };

    const parsedMessage = {
      ...message,
      user: botUser,
      attachments: [],
      mentions: [],
      linked_content: [],
      reactions: {},
      metadata: data.metadata || {},
    };

    // Emit real-time event
    if (data.channelId) {
      console.log('[ChatService] 📡 Bot emitting message:new to channel:', data.channelId);
      console.log('[ChatService] 📡 Bot message payload:', JSON.stringify(parsedMessage, null, 2));
      this.appGateway.emitToRoom(`channel:${data.channelId}`, 'message:new', {
        message: parsedMessage,
        channel_id: data.channelId,
      });
    }

    if (data.conversationId) {
      console.log(
        '[ChatService] 📡 Bot emitting message:new to conversation:',
        data.conversationId,
      );
      this.appGateway.emitToRoom(`conversation:${data.conversationId}`, 'message:new', {
        message: parsedMessage,
        conversation_id: data.conversationId,
      });
    }

    return parsedMessage;
  }

  /**
   * Send a direct message from a bot
   */
  async sendBotDirectMessage(data: {
    content: string;
    contentHtml?: string;
    userId: string;
    workspaceId: string;
    conversationId: string;
    replyToId?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    console.log('[ChatService] Bot sending DM to conversation:', data.conversationId);

    // Use bot:{botId} format so we can look up bot details when fetching messages
    const botUserId = data.metadata?.botId ? `bot:${data.metadata.botId}` : 'bot';

    const messagePayload = {
      content: data.content,
      content_html: data.contentHtml || data.content,
      user_id: botUserId,
      channel_id: null,
      conversation_id: data.conversationId,
      parent_id: data.replyToId || null,
      attachments: JSON.stringify([]),
      mentions: JSON.stringify([]),
      linked_content: JSON.stringify([]),
      reactions: JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const message = await this.db.insert('messages', messagePayload);

    const botUser = {
      id: botUserId,
      name: data.metadata?.botName || data.metadata?.botDisplayName || 'Bot',
      email: '',
      avatarUrl: data.metadata?.botAvatarUrl || null,
      isBot: true,
    };

    const parsedMessage = {
      ...message,
      user: botUser,
      attachments: [],
      mentions: [],
      linked_content: [],
      reactions: {},
      metadata: data.metadata || {},
    };

    // Emit real-time event
    this.appGateway.emitToRoom(`conversation:${data.conversationId}`, 'message:new', {
      message: parsedMessage,
      conversation_id: data.conversationId,
    });

    return parsedMessage;
  }

  /**
   * Get recent messages from a channel (for bot context)
   */
  async getRecentMessages(channelId: string, limit: number = 10): Promise<any[]> {
    const result = await this.db
      .table('messages')
      .select('*')
      .where('channel_id', '=', channelId)
      .execute();

    const messages = (result.data || [])
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    // Fetch user info for each message
    const enrichedMessages = [];
    for (const message of messages) {
      let user = null;
      const isBot =
        !message.user_id || message.user_id === 'bot' || message.user_id.startsWith('bot:');

      if (message.user_id && !isBot) {
        try {
          const userInfo: any = await this.db.getUserById(message.user_id);
          if (userInfo) {
            const metadata = userInfo.metadata || {};
            user = {
              id: userInfo.id,
              name:
                metadata.name ||
                userInfo.fullName ||
                userInfo.name ||
                userInfo.email?.split('@')[0] ||
                'User',
              email: userInfo.email,
              avatarUrl: userInfo.avatar_url || userInfo.avatarUrl || null,
            };
          }
        } catch (e) {
          user = { id: message.user_id, name: 'User', email: '', avatarUrl: null };
        }
      } else if (isBot) {
        const metadata =
          typeof message.metadata === 'string'
            ? JSON.parse(message.metadata)
            : message.metadata || {};
        user = {
          id: 'bot',
          name: metadata.botName || 'Bot',
          email: '',
          avatarUrl: null,
          isBot: true,
        };
      }

      enrichedMessages.push({
        ...message,
        user,
        content: message.content,
        attachments:
          typeof message.attachments === 'string'
            ? JSON.parse(message.attachments)
            : message.attachments || [],
        mentions:
          typeof message.mentions === 'string'
            ? JSON.parse(message.mentions)
            : message.mentions || [],
      });
    }

    return enrichedMessages.reverse(); // Return in chronological order
  }
}
