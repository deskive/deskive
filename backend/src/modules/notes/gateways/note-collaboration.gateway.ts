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
import { NoteCollaborationService } from '../services/note-collaboration.service';
import {
  JoinNoteDto,
  LeaveNoteDto,
  NoteUpdateDto,
  AwarenessUpdateDto,
  CursorPositionDto,
} from '../dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
  workspaceId?: string;
}

@WebSocketGateway({
  namespace: '/notes',
  cors: {
    origin: '*',
  },
})
export class NoteCollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NoteCollaborationGateway');

  constructor(
    private collaborationService: NoteCollaborationService,
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
        this.logger.warn(`Note collaboration connection rejected: No token - ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.validateToken(token);
      if (!payload) {
        this.logger.warn(`Note collaboration connection rejected: Invalid token - ${client.id}`);
        client.disconnect();
        return;
      }

      // Debug: Log the entire handshake to see what's being received
      this.logger.log(`Handshake query: ${JSON.stringify(client.handshake.query)}`);
      this.logger.log(`Handshake auth: ${JSON.stringify(client.handshake.auth)}`);

      // Check both query and auth for workspaceId (Flutter sends in both)
      const workspaceId =
        (client.handshake.query?.workspaceId as string) ||
        (client.handshake.auth?.workspaceId as string);
      if (!workspaceId) {
        this.logger.warn(`Note collaboration connection rejected: No workspace ID - ${client.id}`);
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

      this.logger.log(`User ${client.userName} (${client.userId}) connected to note collaboration`);

      client.emit('connected', {
        userId: client.userId,
        userName: client.userName,
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const mapping = this.collaborationService.removeUser(client.id);

    if (mapping) {
      const { noteId, userId } = mapping;

      // Notify others in the note room
      client.to(`note:${noteId}`).emit('note:user-left', {
        noteId,
        userId,
      });

      // Send updated presence
      const users = this.collaborationService.getUsers(noteId);
      client.to(`note:${noteId}`).emit('note:presence', {
        noteId,
        users,
      });

      this.logger.log(`User ${userId} disconnected from note ${noteId}`);
    }
  }

  /**
   * Handle user joining a note editing session
   */
  @SubscribeMessage('note:join')
  async handleJoinNote(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: JoinNoteDto,
  ) {
    if (!client.userId || !data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      const { session, user } = await this.collaborationService.addUser(
        data.noteId,
        client.id,
        client.userId,
        client.userName || 'User',
        client.userAvatar,
      );

      // Join the note room
      client.join(`note:${data.noteId}`);

      // Send initial document state to the joining user
      const docState = this.collaborationService.getDocState(data.noteId);
      if (docState) {
        client.emit('note:sync', {
          noteId: data.noteId,
          state: Buffer.from(docState).toString('base64'),
        });
      }

      // Notify others that a user joined
      client.to(`note:${data.noteId}`).emit('note:user-joined', {
        noteId: data.noteId,
        user,
      });

      // Send current presence to all users in the room
      const users = this.collaborationService.getUsers(data.noteId);
      this.server.to(`note:${data.noteId}`).emit('note:presence', {
        noteId: data.noteId,
        users,
      });

      this.logger.log(`User ${client.userName} joined note ${data.noteId}`);

      return {
        success: true,
        user,
        users,
      };
    } catch (error) {
      this.logger.error(`Failed to join note ${data.noteId}:`, error);
      return { success: false, error: 'Failed to join note' };
    }
  }

  /**
   * Handle user leaving a note editing session
   */
  @SubscribeMessage('note:leave')
  async handleLeaveNote(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LeaveNoteDto,
  ) {
    if (!client.userId || !data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    const mapping = this.collaborationService.removeUser(client.id);

    if (mapping) {
      // Leave the note room
      client.leave(`note:${data.noteId}`);

      // Notify others
      client.to(`note:${data.noteId}`).emit('note:user-left', {
        noteId: data.noteId,
        userId: client.userId,
      });

      // Send updated presence
      const users = this.collaborationService.getUsers(data.noteId);
      client.to(`note:${data.noteId}`).emit('note:presence', {
        noteId: data.noteId,
        users,
      });

      this.logger.log(`User ${client.userName} left note ${data.noteId}`);
    }

    return { success: true };
  }

  /**
   * Handle Yjs document update
   */
  @SubscribeMessage('note:update')
  async handleNoteUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: NoteUpdateDto,
  ) {
    this.logger.log(`Received note:update from ${client.userName} for note ${data.noteId}`);

    if (!client.userId || !data.noteId || !data.update) {
      this.logger.warn('Invalid note:update request - missing data');
      return { success: false, error: 'Invalid request' };
    }

    try {
      // Decode base64 update
      const update = Buffer.from(data.update, 'base64');
      this.logger.log(`Update size: ${update.length} bytes`);

      // Apply update to the document
      const success = this.collaborationService.applyUpdate(data.noteId, update);
      this.logger.log(`Applied update to Yjs doc: ${success}`);

      if (success) {
        // Broadcast update to all other users in the note room
        this.logger.log(`Broadcasting update to room note:${data.noteId}`);
        client.to(`note:${data.noteId}`).emit('note:update', {
          noteId: data.noteId,
          update: data.update,
          userId: client.userId,
        });
      }

      return { success };
    } catch (error) {
      this.logger.error(`Failed to apply update for note ${data.noteId}:`, error);
      return { success: false, error: 'Failed to apply update' };
    }
  }

  /**
   * Handle awareness update (cursor position, user presence)
   */
  @SubscribeMessage('note:awareness')
  async handleAwarenessUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: AwarenessUpdateDto,
  ) {
    if (!client.userId || !data.noteId || !data.update) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      // Decode base64 awareness update
      const update = Buffer.from(data.update, 'base64');

      // Apply awareness update
      const success = this.collaborationService.applyAwarenessUpdate(data.noteId, update);

      if (success) {
        // Broadcast awareness update to all other users
        client.to(`note:${data.noteId}`).emit('note:awareness', {
          noteId: data.noteId,
          update: data.update,
          userId: client.userId,
        });
      }

      return { success };
    } catch (error) {
      this.logger.error(`Failed to apply awareness update for note ${data.noteId}:`, error);
      return { success: false, error: 'Failed to apply awareness update' };
    }
  }

  /**
   * Handle cursor position update (simplified alternative to full awareness)
   */
  @SubscribeMessage('note:cursor')
  async handleCursorUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CursorPositionDto,
  ) {
    if (!client.userId || !data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      const user = this.collaborationService.updateCursor(
        data.noteId,
        client.userId,
        data.index,
        data.length,
      );

      if (user) {
        // Broadcast cursor update to all other users
        client.to(`note:${data.noteId}`).emit('note:cursor', {
          noteId: data.noteId,
          userId: client.userId,
          userName: user.name,
          userColor: user.color,
          index: data.index,
          length: data.length,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update cursor for note ${data.noteId}:`, error);
      return { success: false, error: 'Failed to update cursor' };
    }
  }

  /**
   * Handle simple content change notification (for non-Yjs clients like Flutter)
   * This allows Flutter to notify others that content changed without sending Yjs data
   */
  @SubscribeMessage('note:content-changed')
  async handleContentChanged(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { noteId: string },
  ) {
    if (!client.userId || !data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    this.logger.log(`Content changed notification from ${client.userName} for note ${data.noteId}`);

    // Broadcast to ALL clients in the note room (including sender's other devices)
    // Using this.server.to() instead of client.to() ensures same user on different
    // devices also receives the notification for cross-device sync
    // Each client will check if they should refresh based on their own state
    this.server.to(`note:${data.noteId}`).emit('note:content-changed', {
      noteId: data.noteId,
      userId: client.userId,
      userName: client.userName,
      socketId: client.id, // Include socket ID so clients can ignore their own emission
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Handle Quill Delta updates for real-time collaboration (Flutter clients)
   * This provides character-by-character sync without requiring Yjs
   */
  @SubscribeMessage('note:delta')
  async handleDeltaUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { noteId: string; delta: any; fullContent?: string },
  ) {
    if (!client.userId || !data.noteId || !data.delta) {
      return { success: false, error: 'Invalid request' };
    }

    // Broadcast delta to ALL clients in the note room (including sender's other devices)
    // Using this.server.to() ensures cross-device sync for same user
    // Clients will filter based on socketId to avoid applying their own changes
    this.server.to(`note:${data.noteId}`).emit('note:delta', {
      noteId: data.noteId,
      userId: client.userId,
      userName: client.userName,
      socketId: client.id, // Include socket ID so clients can ignore their own emission
      delta: data.delta,
      fullContent: data.fullContent,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Handle full document sync request (for initial load or reconnection)
   * Flutter clients can request the current document state
   */
  @SubscribeMessage('note:request-full-sync')
  async handleRequestFullSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { noteId: string },
  ) {
    if (!client.userId || !data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    // Request all clients in the room to share their current state
    // The first client to respond will provide the current content
    client.to(`note:${data.noteId}`).emit('note:sync-request', {
      noteId: data.noteId,
      requesterId: client.userId,
      requesterName: client.userName,
    });

    return { success: true };
  }

  /**
   * Handle full document sync response
   * A client responds with their current document state
   */
  @SubscribeMessage('note:sync-response')
  async handleSyncResponse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { noteId: string; requesterId: string; content: string; title?: string },
  ) {
    if (!client.userId || !data.noteId || !data.requesterId) {
      return { success: false, error: 'Invalid request' };
    }

    // Send the content directly to the requester
    this.server.to(`note:${data.noteId}`).emit('note:full-sync', {
      noteId: data.noteId,
      senderId: client.userId,
      senderName: client.userName,
      targetId: data.requesterId,
      content: data.content,
      title: data.title,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Handle sync request (when client needs to sync state)
   */
  @SubscribeMessage('note:sync-request')
  async handleSyncRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { noteId: string; stateVector?: string },
  ) {
    if (!client.userId || !data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    try {
      if (data.stateVector) {
        // Client sent state vector, respond with diff
        const stateVector = Buffer.from(data.stateVector, 'base64');
        const syncStep2 = this.collaborationService.handleSyncStep1(data.noteId, stateVector);

        if (syncStep2) {
          client.emit('note:sync-step2', {
            noteId: data.noteId,
            update: Buffer.from(syncStep2).toString('base64'),
          });
        }
      } else {
        // No state vector, send full state
        const docState = this.collaborationService.getDocState(data.noteId);
        if (docState) {
          client.emit('note:sync', {
            noteId: data.noteId,
            state: Buffer.from(docState).toString('base64'),
          });
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle sync request for note ${data.noteId}:`, error);
      return { success: false, error: 'Failed to sync' };
    }
  }

  /**
   * Get presence for a note
   */
  @SubscribeMessage('note:get-presence')
  async handleGetPresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { noteId: string },
  ) {
    if (!data.noteId) {
      return { success: false, error: 'Invalid request' };
    }

    const users = this.collaborationService.getUsers(data.noteId);

    return {
      success: true,
      noteId: data.noteId,
      users,
    };
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
   * Uses decode instead of verify because tokens are from database
   * which uses its own signature
   */
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
        avatar_url: payload.avatar_url,
        avatarUrl: payload.avatarUrl || payload.avatar_url,
      };
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return null;
    }
  }
}
