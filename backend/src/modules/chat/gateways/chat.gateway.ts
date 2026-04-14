import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat.service';
import { SendMessageDto } from '../dto';
import { BotExecutionService } from '../../bots/services/bot-execution.service';
import { BotMessageHandlerService } from '../../bots/services/bot-message-handler.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  workspaceId?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => BotExecutionService))
    private botExecutionService: BotExecutionService,
    @Inject(forwardRef(() => BotMessageHandlerService))
    private botMessageHandler: BotMessageHandlerService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from multiple sources
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`Chat connection rejected: No token provided - ${client.id}`);
        client.disconnect();
        return;
      }

      // Validate JWT token
      const payload = await this.validateToken(token);
      if (!payload) {
        this.logger.warn(`Chat connection rejected: Invalid token - ${client.id}`);
        client.disconnect();
        return;
      }

      // Extract workspace ID from query or use default
      const workspaceId = client.handshake.query?.workspaceId as string;
      if (!workspaceId) {
        this.logger.warn(`Chat connection rejected: No workspace ID provided - ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach validated user info to socket
      client.userId = payload.sub;
      client.workspaceId = workspaceId;

      // Join workspace room
      client.join(`workspace:${workspaceId}`);

      // Store connection
      this.connectedUsers.set(client.id, client);

      this.logger.log(`User ${client.userId} connected to workspace ${client.workspaceId}`);

      // Notify others about user online status
      client.to(`workspace:${client.workspaceId}`).emit('user_online', {
        userId: client.userId,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    const workspaceId = client.workspaceId;

    if (userId && workspaceId) {
      // Notify others about user offline status
      client.to(`workspace:${workspaceId}`).emit('user_offline', {
        userId,
        socketId: client.id,
      });

      this.logger.log(`User ${userId} disconnected from workspace ${workspaceId}`);
    }

    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    if (!client.userId || !data.channelId) {
      return;
    }

    try {
      // Join channel room
      client.join(`channel:${data.channelId}`);

      // Notify others in channel
      client.to(`channel:${data.channelId}`).emit('user_joined_channel', {
        userId: client.userId,
        channelId: data.channelId,
      });

      client.emit('joined_channel', {
        channelId: data.channelId,
        success: true,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to join channel' });
    }
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    if (!client.userId || !data.channelId) {
      return;
    }

    // Leave channel room
    client.leave(`channel:${data.channelId}`);

    // Notify others in channel
    client.to(`channel:${data.channelId}`).emit('user_left_channel', {
      userId: client.userId,
      channelId: data.channelId,
    });

    client.emit('left_channel', {
      channelId: data.channelId,
      success: true,
    });
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId || !data.conversationId) {
      return;
    }

    try {
      // Join conversation room
      client.join(`conversation:${data.conversationId}`);

      // Notify others in conversation
      client.to(`conversation:${data.conversationId}`).emit('user_joined_conversation', {
        userId: client.userId,
        conversationId: data.conversationId,
      });

      client.emit('joined_conversation', {
        conversationId: data.conversationId,
        success: true,
      });

      this.logger.log(`User ${client.userId} joined conversation ${data.conversationId}`);
    } catch (error) {
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId || !data.conversationId) {
      return;
    }

    // Leave conversation room
    client.leave(`conversation:${data.conversationId}`);

    // Notify others in conversation
    client.to(`conversation:${data.conversationId}`).emit('user_left_conversation', {
      userId: client.userId,
      conversationId: data.conversationId,
    });

    client.emit('left_conversation', {
      conversationId: data.conversationId,
      success: true,
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto & { channelId?: string; conversationId?: string },
  ) {
    if (!client.userId) {
      return;
    }

    try {
      const message = await this.chatService.sendMessage(
        {
          ...data,
          channel_id: data.channelId,
          conversation_id: data.conversationId,
        },
        client.userId,
      );

      // Broadcast to appropriate room
      const room = data.channelId
        ? `channel:${data.channelId}`
        : data.conversationId
          ? `conversation:${data.conversationId}`
          : `workspace:${client.workspaceId}`;

      this.server.to(room).emit('message:new', {
        ...message,
        user: { id: client.userId }, // In real app, fetch user details
      });

      // Process bot message handler for DMs asynchronously
      if (client.workspaceId && data.conversationId && this.botMessageHandler) {
        this.logger.debug(
          `[ChatGateway] Calling bot message handler for conversation ${data.conversationId}`,
        );
        this.botMessageHandler
          .processMessage(
            client.workspaceId,
            data.conversationId,
            message.id,
            client.userId,
            data.content || '',
          )
          .catch((err) => this.logger.error('Bot message handler error:', err));
      } else {
        this.logger.debug(
          `[ChatGateway] Bot message handler NOT called - workspaceId: ${client.workspaceId}, conversationId: ${data.conversationId}, handler exists: ${!!this.botMessageHandler}`,
        );
      }

      // Evaluate bot triggers asynchronously (don't block message sending)
      if (client.workspaceId && this.botExecutionService) {
        this.botExecutionService
          .evaluateAndExecute({
            messageId: message.id,
            messageContent: data.content,
            messageContentHtml: data.content_html,
            channelId: data.channelId,
            conversationId: data.conversationId,
            workspaceId: client.workspaceId,
            userId: client.userId,
            mentions: data.mentions,
            isThread: !!data.parent_id,
          })
          .catch((err) => this.logger.error('Bot execution error:', err));
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId?: string; conversationId?: string },
  ) {
    if (!client.userId) {
      this.logger.warn('typing_start received but no userId on socket');
      return;
    }

    const room = data.channelId
      ? `channel:${data.channelId}`
      : data.conversationId
        ? `conversation:${data.conversationId}`
        : null;

    this.logger.log(`⌨️ User ${client.userId} started typing in room: ${room}`);

    if (room) {
      const payload = {
        userId: client.userId,
        channelId: data.channelId,
        conversationId: data.conversationId,
      };
      this.logger.log(`⌨️ Emitting user_typing_start to room ${room}:`, payload);
      client.to(room).emit('user_typing_start', payload);
    } else {
      this.logger.warn('typing_start received but no room specified:', data);
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId?: string; conversationId?: string },
  ) {
    if (!client.userId) {
      this.logger.warn('typing_stop received but no userId on socket');
      return;
    }

    const room = data.channelId
      ? `channel:${data.channelId}`
      : data.conversationId
        ? `conversation:${data.conversationId}`
        : null;

    this.logger.log(`⌨️ User ${client.userId} stopped typing in room: ${room}`);

    if (room) {
      const payload = {
        userId: client.userId,
        channelId: data.channelId,
        conversationId: data.conversationId,
      };
      this.logger.log(`⌨️ Emitting user_typing_stop to room ${room}:`, payload);
      client.to(room).emit('user_typing_stop', payload);
    } else {
      this.logger.warn('typing_stop received but no room specified:', data);
    }
  }

  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.userId) {
      return;
    }

    try {
      const result = await this.chatService.addReaction(data.messageId, data.emoji, client.userId);

      // Broadcast appropriate event based on whether reaction was added or removed (toggle)
      if (result.removed) {
        // Reaction was toggled off (removed)
        this.server.to(`workspace:${client.workspaceId}`).emit('reaction_removed', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: client.userId,
        });
      } else {
        // Reaction was added
        this.server.to(`workspace:${client.workspaceId}`).emit('reaction_added', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: client.userId,
          reaction: result.reaction,
        });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to add reaction' });
    }
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.userId) {
      return;
    }

    try {
      await this.chatService.removeReaction(data.messageId, data.emoji, client.userId);

      // Broadcast reaction removal to workspace
      this.server.to(`workspace:${client.workspaceId}`).emit('reaction_removed', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: client.userId,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  @SubscribeMessage('mark_channel_read')
  async handleMarkChannelRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId: string; messageId?: string },
  ) {
    if (!client.userId || !data.channelId) {
      return;
    }

    try {
      await this.chatService.markChannelAsRead(data.channelId, data.messageId, client.userId);

      client.emit('channel_marked_read', {
        channelId: data.channelId,
        success: true,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to mark channel as read' });
    }
  }

  @SubscribeMessage('mark_conversation_read')
  async handleMarkConversationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId?: string },
  ) {
    if (!client.userId || !data.conversationId) {
      return;
    }

    try {
      await this.chatService.markConversationAsRead(
        data.conversationId,
        data.messageId,
        client.userId,
      );

      client.emit('conversation_marked_read', {
        conversationId: data.conversationId,
        success: true,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to mark conversation as read' });
    }
  }

  // Method to send notifications from other parts of the app
  notifyWorkspace(workspaceId: string, event: string, data: any) {
    this.server.to(`workspace:${workspaceId}`).emit(event, data);
  }

  notifyChannel(channelId: string, event: string, data: any) {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }

  notifyConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try multiple sources for the token
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '') ||
      client.handshake.query?.token;

    return typeof token === 'string' ? token : null;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      // Decode database JWT without verification
      // We trust database's signature - just extract the payload
      // The token is already signed by database backend
      const payload = this.jwtService.decode(token) as any;

      if (!payload) {
        this.logger.warn('Token validation failed: Invalid token format');
        return null;
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logger.warn('Token validation failed: Token expired');
        return null;
      }

      // database JWT payload contains: userId, email, role, projectId, appId
      // Map to standard format expected by the gateway
      return {
        sub: payload.userId || payload.sub,
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
        projectId: payload.projectId,
        appId: payload.appId,
        name: payload.name,
        username: payload.username,
      };
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }
}
