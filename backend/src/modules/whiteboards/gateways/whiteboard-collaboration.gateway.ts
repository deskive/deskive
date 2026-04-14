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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WhiteboardCollaborationService } from '../services/whiteboard-collaboration.service';
import {
  JoinWhiteboardDto,
  LeaveWhiteboardDto,
  WhiteboardUpdateDto,
  WhiteboardAwarenessUpdateDto,
  PointerPositionDto,
  ElementsUpdateDto,
  COLLABORATOR_COLORS,
} from '../dto/whiteboard-collaboration.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
  workspaceId?: string;
}

@WebSocketGateway({
  namespace: '/whiteboards',
  cors: {
    origin: '*',
  },
})
export class WhiteboardCollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WhiteboardCollaborationGateway');

  constructor(
    private collaborationService: WhiteboardCollaborationService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`Whiteboard connection rejected: No token - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.validateToken(token);
      if (!payload) {
        this.logger.warn(`Whiteboard connection rejected: Invalid token - ${client.id}`);
        client.disconnect();
        return;
      }

      // Check both query and auth for workspaceId
      const workspaceId =
        (client.handshake.query?.workspaceId as string) ||
        (client.handshake.auth?.workspaceId as string);
      if (!workspaceId) {
        this.logger.warn(`Whiteboard connection rejected: No workspace ID - ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = payload.sub || payload.userId;
      client.userName = payload.name || payload.username || payload.email?.split('@')[0] || 'User';
      client.userAvatar = payload.avatarUrl || payload.avatar_url;
      client.workspaceId = workspaceId;

      // Join workspace room for general notifications
      client.join(`workspace:${workspaceId}`);

      this.logger.log(
        `User ${client.userName} (${client.userId}) connected to whiteboard collaboration`,
      );

      client.emit('connected', {
        userId: client.userId,
        userName: client.userName,
      });
    } catch (error) {
      this.logger.error('Whiteboard connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const mapping = this.collaborationService.removeUser(client.id);

    if (mapping) {
      const { sessionId, userId } = mapping;

      // Notify others in the whiteboard room
      client.to(`whiteboard:${sessionId}`).emit('whiteboard:user-left', {
        sessionId,
        userId,
      });

      // Send updated presence
      const users = this.collaborationService.getUsers(sessionId);
      client.to(`whiteboard:${sessionId}`).emit('whiteboard:presence', {
        sessionId,
        users,
      });

      this.logger.log(`User ${userId} disconnected from whiteboard ${sessionId}`);
    }
  }

  /**
   * Handle user joining a whiteboard session
   */
  @SubscribeMessage('whiteboard:join')
  async handleJoinWhiteboard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinWhiteboardDto,
  ) {
    if (!client.userId || !data.sessionId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      const { session, user } = await this.collaborationService.addUser(
        data.sessionId,
        client.id,
        client.userId,
        client.userName || 'User',
        client.userAvatar,
      );

      // Join the whiteboard room
      client.join(`whiteboard:${data.sessionId}`);

      // Send initial document state to the joining user
      const docState = this.collaborationService.getDocState(data.sessionId);
      if (docState) {
        client.emit('whiteboard:sync', {
          sessionId: data.sessionId,
          state: Buffer.from(docState).toString('base64'),
        });
      }

      // Also send current elements directly
      const elements = this.collaborationService.getElements(data.sessionId);
      client.emit('whiteboard:elements', {
        sessionId: data.sessionId,
        elements,
      });

      // Notify others that a user joined
      client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:user-joined', {
        sessionId: data.sessionId,
        user,
      });

      // Send current presence to all users in the room
      const users = this.collaborationService.getUsers(data.sessionId);
      this.server.to(`whiteboard:${data.sessionId}`).emit('whiteboard:presence', {
        sessionId: data.sessionId,
        users,
      });

      this.logger.log(`User ${client.userName} joined whiteboard ${data.sessionId}`);

      return {
        success: true,
        user,
        users,
        elements,
      };
    } catch (error) {
      this.logger.error(`Failed to join whiteboard ${data.sessionId}:`, error);
      return { success: false, error: 'Failed to join whiteboard' };
    }
  }

  /**
   * Handle user leaving a whiteboard session
   */
  @SubscribeMessage('whiteboard:leave')
  async handleLeaveWhiteboard(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LeaveWhiteboardDto,
  ) {
    if (!client.userId || !data.sessionId) {
      return { success: false, error: 'Invalid request' };
    }

    const mapping = this.collaborationService.removeUser(client.id);

    if (mapping) {
      // Leave the whiteboard room
      client.leave(`whiteboard:${data.sessionId}`);

      // Notify others
      client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:user-left', {
        sessionId: data.sessionId,
        userId: client.userId,
      });

      // Send updated presence
      const users = this.collaborationService.getUsers(data.sessionId);
      client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:presence', {
        sessionId: data.sessionId,
        users,
      });

      this.logger.log(`User ${client.userName} left whiteboard ${data.sessionId}`);
    }

    return { success: true };
  }

  /**
   * Handle Yjs document update
   */
  @SubscribeMessage('whiteboard:update')
  async handleWhiteboardUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WhiteboardUpdateDto,
  ) {
    if (!client.userId || !data.sessionId || !data.update) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      // Decode base64 update
      const update = Buffer.from(data.update, 'base64');

      // Apply update to the document
      const success = this.collaborationService.applyUpdate(data.sessionId, update);

      if (success) {
        // Broadcast update to all other users in the whiteboard room
        client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:update', {
          sessionId: data.sessionId,
          update: data.update,
          userId: client.userId,
        });
      }

      return { success };
    } catch (error) {
      this.logger.error(`Failed to apply update for whiteboard ${data.sessionId}:`, error);
      return { success: false, error: 'Failed to apply update' };
    }
  }

  /**
   * Handle direct elements update (without Yjs, for simpler sync)
   */
  @SubscribeMessage('whiteboard:elements-update')
  async handleElementsUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ElementsUpdateDto,
  ) {
    if (!client.userId || !data.sessionId || !data.elements) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      // Update elements in Yjs doc (this sanitizes the elements)
      const success = this.collaborationService.updateElements(data.sessionId, data.elements);

      if (success) {
        // Get sanitized elements to broadcast (ensures cross-platform compatibility)
        const sanitizedElements = this.collaborationService.getElements(data.sessionId);

        // Broadcast sanitized elements to all other users
        client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:elements', {
          sessionId: data.sessionId,
          elements: sanitizedElements,
          userId: client.userId,
        });
      }

      return { success };
    } catch (error) {
      this.logger.error(`Failed to update elements for whiteboard ${data.sessionId}:`, error);
      return { success: false, error: 'Failed to update elements' };
    }
  }

  /**
   * Handle files update (for image sync between collaborators)
   */
  @SubscribeMessage('whiteboard:files-update')
  async handleFilesUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      sessionId: string;
      files: Record<string, { id: string; mimeType: string; dataURL: string }>;
    },
  ) {
    if (!client.userId || !data.sessionId || !data.files) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      this.logger.log(
        `Received files update for whiteboard ${data.sessionId}: ${Object.keys(data.files).length} files`,
      );

      // Broadcast files to all other users in the whiteboard room
      client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:files', {
        sessionId: data.sessionId,
        files: data.files,
        userId: client.userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to broadcast files for whiteboard ${data.sessionId}:`, error);
      return { success: false, error: 'Failed to broadcast files' };
    }
  }

  /**
   * Handle awareness update (pointer position, user presence)
   */
  @SubscribeMessage('whiteboard:awareness')
  async handleAwarenessUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WhiteboardAwarenessUpdateDto,
  ) {
    if (!client.userId || !data.sessionId || !data.update) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      // Decode base64 awareness update
      const update = Buffer.from(data.update, 'base64');

      // Apply awareness update
      const success = this.collaborationService.applyAwarenessUpdate(data.sessionId, update);

      if (success) {
        // Broadcast awareness update to all other users
        client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:awareness', {
          sessionId: data.sessionId,
          update: data.update,
          userId: client.userId,
        });
      }

      return { success };
    } catch (error) {
      this.logger.error(
        `Failed to apply awareness update for whiteboard ${data.sessionId}:`,
        error,
      );
      return { success: false, error: 'Failed to apply awareness update' };
    }
  }

  /**
   * Handle pointer position update (Excalidraw specific)
   */
  @SubscribeMessage('whiteboard:pointer')
  async handlePointerUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: PointerPositionDto,
  ) {
    if (!client.userId || !data.sessionId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      const user = this.collaborationService.updatePointer(
        data.sessionId,
        client.userId,
        data.x,
        data.y,
        data.tool,
        data.pressing,
      );

      if (user) {
        // Get user color for Excalidraw format
        const colorIndex = this.collaborationService
          .getUsers(data.sessionId)
          .findIndex((u) => u.id === client.userId);
        const colorSet = COLLABORATOR_COLORS[colorIndex % COLLABORATOR_COLORS.length];

        // Broadcast pointer update to all other users in Excalidraw collaborator format
        client.to(`whiteboard:${data.sessionId}`).emit('whiteboard:pointer', {
          sessionId: data.sessionId,
          oderId: client.userId,
          odername: user.name,
          pointer: {
            x: data.x,
            y: data.y,
          },
          button: data.pressing ? 'down' : 'up',
          username: user.name,
          color: colorSet,
          avatarUrl: user.avatar,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update pointer for whiteboard ${data.sessionId}:`, error);
      return { success: false, error: 'Failed to update pointer' };
    }
  }

  /**
   * Get presence for a whiteboard
   */
  @SubscribeMessage('whiteboard:get-presence')
  async handleGetPresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!data.sessionId) {
      return { success: false, error: 'Invalid request' };
    }

    const users = this.collaborationService.getUsers(data.sessionId);

    return {
      success: true,
      sessionId: data.sessionId,
      users,
    };
  }

  /**
   * Handle sync request (when client needs to sync state)
   */
  @SubscribeMessage('whiteboard:sync-request')
  async handleSyncRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; stateVector?: string },
  ) {
    if (!client.userId || !data.sessionId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      if (data.stateVector) {
        // Client sent state vector, respond with diff
        const stateVector = Buffer.from(data.stateVector, 'base64');
        const syncStep2 = this.collaborationService.handleSyncStep1(data.sessionId, stateVector);

        if (syncStep2) {
          client.emit('whiteboard:sync-step2', {
            sessionId: data.sessionId,
            update: Buffer.from(syncStep2).toString('base64'),
          });
        }
      } else {
        // No state vector, send full state
        const docState = this.collaborationService.getDocState(data.sessionId);
        if (docState) {
          client.emit('whiteboard:sync', {
            sessionId: data.sessionId,
            state: Buffer.from(docState).toString('base64'),
          });
        }

        // Also send current elements
        const elements = this.collaborationService.getElements(data.sessionId);
        client.emit('whiteboard:elements', {
          sessionId: data.sessionId,
          elements,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle sync request for whiteboard ${data.sessionId}:`, error);
      return { success: false, error: 'Failed to sync' };
    }
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // Try auth header first
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const token = client.handshake.query?.token as string;
    if (token) {
      return token;
    }

    // Try auth object
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    return null;
  }

  /**
   * Validate JWT token
   */
  private async validateToken(token: string): Promise<any> {
    try {
      // Decode database JWT without verification
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

      return {
        sub: payload.userId || payload.sub,
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
        projectId: payload.projectId,
        appId: payload.appId,
        name: payload.name,
        username: payload.username,
        avatar_url: payload.avatar_url,
        avatarUrl: payload.avatarUrl || payload.avatar_url,
      };
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }
}
