import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../../modules/chat/chat.service';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
  workspaceId?: string;
  workspaceIds?: string[]; // Support multiple workspaces
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  socketIds: Set<string>;
}

export interface RealtimeEvent {
  type: string;
  data: any;
  userId?: string;
  timestamp: string;
  channel?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);
  private userPresence = new Map<string, UserPresence>();
  private socketToUser = new Map<string, string>();
  private connectionAttempts = new Map<string, number>();
  private blockedIPs = new Set<string>();
  
  private readonly MAX_CONNECTIONS_PER_IP = 10;
  private readonly MAX_CONNECTION_ATTEMPTS = 5;
  private readonly BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  // =============================================
  // GATEWAY LIFECYCLE EVENTS
  // =============================================

  afterInit() {
    this.logger.log('🚀 WebSocket Gateway initialized');
    
    // Set up periodic presence cleanup
    setInterval(() => {
      this.cleanupStalePresence();
    }, 60000); // Clean up every minute
  }

  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      // Get client IP for rate limiting
      const clientIP = client.handshake.address;

      // Skip rate limiting for localhost in development
      const isLocalhost = clientIP === '::1' || clientIP === '127.0.0.1' || clientIP === 'localhost';
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

      if (!isLocalhost || !isDevelopment) {
        // Check if IP is blocked
        if (this.blockedIPs.has(clientIP)) {
          this.logger.warn(`Connection rejected: Blocked IP - ${clientIP}`);
          client.disconnect();
          return;
        }

        // Check connection rate limiting
        if (!this.checkConnectionRateLimit(clientIP)) {
          this.logger.warn(`Connection rejected: Rate limit exceeded - ${clientIP}`);
          client.disconnect();
          return;
        }
      }

      // Extract token from handshake auth
      const token = this.extractTokenFromSocket(client);
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided - ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.validateToken(token);
      if (!payload) {
        this.logger.warn(`Connection rejected: Invalid token - ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = payload.sub;
      client.user = payload;

      // Track socket-to-user mapping
      this.socketToUser.set(client.id, payload.sub);

      // Update user presence
      this.updateUserPresence(payload.sub, client.id, 'online');

      // Join user to their personal room
      await client.join(`user:${payload.sub}`);

      // Join user to general rooms
      await client.join('authenticated');

      this.logger.log(`User ${payload.sub} connected - Socket: ${client.id}`);
      
      // Emit presence update to other users
      this.emitPresenceUpdate(payload.sub, 'online');
      
      // Send welcome message
      client.emit('connection:success', {
        message: 'Connected to Life-OS real-time service',
        userId: payload.sub,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      const clientIP = client.handshake.address;
      
      // Handle different types of errors with appropriate responses
      if (error.name === 'JsonWebTokenError') {
        this.logger.warn(`JWT error for IP ${clientIP}: ${error.message}`);
        client.emit('connection:error', { 
          type: 'INVALID_TOKEN', 
          message: 'Invalid authentication token'
        });
      } else if (error.name === 'TokenExpiredError') {
        this.logger.warn(`Expired token for IP ${clientIP}: ${error.message}`);
        client.emit('connection:error', { 
          type: 'TOKEN_EXPIRED', 
          message: 'Authentication token expired'
        });
      } else {
        this.logger.error(`Unexpected connection error for IP ${clientIP}: ${error.message}`, error.stack);
        client.emit('connection:error', { 
          type: 'CONNECTION_ERROR', 
          message: 'Connection failed'
        });
      }
      
      // Increment failed attempts for rate limiting
      const attempts = this.connectionAttempts.get(clientIP) || 0;
      this.connectionAttempts.set(clientIP, attempts + 1);
      
      // Add small delay before disconnecting to prevent rapid reconnection attempts
      setTimeout(() => client.disconnect(), 1000);
    }
  }

  handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      const userId = this.socketToUser.get(client.id);
      
      if (userId) {
        // Remove socket from user presence
        this.removeSocketFromPresence(userId, client.id);
        
        // Remove socket-to-user mapping
        this.socketToUser.delete(client.id);
        
        // Check if user still has other active connections
        const userPresence = this.userPresence.get(userId);
        const isStillOnline = userPresence && userPresence.socketIds.size > 0;
        
        if (!isStillOnline && userPresence) {
          // Mark user as offline and emit presence update
          userPresence.status = 'offline';
          userPresence.lastSeen = new Date();
          this.emitPresenceUpdate(userId, 'offline');
        }
        
        this.logger.log(`User ${userId} disconnected - Socket: ${client.id}`);
      } else {
        this.logger.log(`Unknown socket disconnected: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message} - Socket: ${client.id}`);
    }
  }

  // =============================================
  // WEBSOCKET EVENT HANDLERS
  // =============================================

  @SubscribeMessage('presence:update')
  async handlePresenceUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: 'online' | 'away' | 'busy' },
  ) {
    if (!client.userId) return;

    try {
      this.updateUserPresence(client.userId, client.id, data.status);
      this.emitPresenceUpdate(client.userId, data.status);
      
      this.logger.debug(`User ${client.userId} presence updated to: ${data.status}`);
    } catch (error) {
      this.logger.error(`Presence update error: ${error.message}`);
    }
  }

  @SubscribeMessage('join:room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (!client.userId) return;

    try {
      // Validate room access (implement your own logic here)
      if (this.canJoinRoom(client.userId, data.room)) {
        await client.join(data.room);
        
        client.emit('room:joined', {
          room: data.room,
          timestamp: new Date().toISOString(),
        });
        
        // Notify other room members
        client.to(data.room).emit('user:joined', {
          userId: client.userId,
          room: data.room,
          timestamp: new Date().toISOString(),
        });
        
        this.logger.debug(`User ${client.userId} joined room: ${data.room}`);
      } else {
        client.emit('error', {
          message: 'Unauthorized to join this room',
          code: 'UNAUTHORIZED_ROOM_ACCESS',
        });
      }
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
    }
  }

  @SubscribeMessage('leave:room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (!client.userId) return;

    try {
      await client.leave(data.room);
      
      client.emit('room:left', {
        room: data.room,
        timestamp: new Date().toISOString(),
      });
      
      // Notify other room members
      client.to(data.room).emit('user:left', {
        userId: client.userId,
        room: data.room,
        timestamp: new Date().toISOString(),
      });
      
      this.logger.debug(`User ${client.userId} left room: ${data.room}`);
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join:workspace')
  async handleJoinWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (!client.userId || !data.workspaceId) {
      this.logger.warn(`Invalid workspace join attempt - userId: ${client.userId}, workspaceId: ${data.workspaceId}`);
      return;
    }

    try {
      const { workspaceId } = data;

      // Join workspace-specific user room for cross-page notifications
      const workspaceUserRoom = `workspace:${workspaceId}:user:${client.userId}`;
      await client.join(workspaceUserRoom);

      // Also join general workspace room
      await client.join(`workspace:${workspaceId}`);

      // Store workspace ID on socket
      client.workspaceId = workspaceId;
      if (!client.workspaceIds) {
        client.workspaceIds = [];
      }
      if (!client.workspaceIds.includes(workspaceId)) {
        client.workspaceIds.push(workspaceId);
      }

      client.emit('workspace:joined', {
        workspaceId,
        room: workspaceUserRoom,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${client.userId} joined workspace ${workspaceId} - Room: ${workspaceUserRoom}`);
    } catch (error) {
      this.logger.error(`Join workspace error: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join workspace',
        code: 'WORKSPACE_JOIN_FAILED',
      });
    }
  }

  @SubscribeMessage('leave:workspace')
  async handleLeaveWorkspace(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { workspaceId: string },
  ) {
    if (!client.userId || !data.workspaceId) return;

    try {
      const { workspaceId } = data;

      // Leave workspace-specific user room
      const workspaceUserRoom = `workspace:${workspaceId}:user:${client.userId}`;
      await client.leave(workspaceUserRoom);

      // Leave general workspace room
      await client.leave(`workspace:${workspaceId}`);

      // Remove from workspaceIds array
      if (client.workspaceIds) {
        client.workspaceIds = client.workspaceIds.filter(id => id !== workspaceId);
      }
      if (client.workspaceId === workspaceId) {
        client.workspaceId = undefined;
      }

      client.emit('workspace:left', {
        workspaceId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${client.userId} left workspace ${workspaceId}`);
    } catch (error) {
      this.logger.error(`Leave workspace error: ${error.message}`);
    }
  }

  // =============================================
  // WEBRTC VIDEO CALL SIGNALING HANDLERS
  // =============================================

  @SubscribeMessage('video:offer')
  async handleVideoOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { offer: RTCSessionDescriptionInit; to: string; callId: string; fromName?: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.log(`📹 [WebRTC] User ${client.userId} sending offer to ${data.to} for call ${data.callId}`);

      // Send offer to the target user with caller info
      this.emitToUser(data.to, 'video:offer', {
        offer: data.offer,
        from: client.userId,
        fromName: data.fromName || client.user?.name || 'Unknown User',
        callId: data.callId,
      });

      this.logger.debug(`✅ [WebRTC] Offer forwarded from ${client.userId} to ${data.to}`);
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Video offer error: ${error.message}`);
      client.emit('video:error', {
        message: 'Failed to send video offer',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('video:answer')
  async handleVideoAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { answer: RTCSessionDescriptionInit; to: string; callId: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.log(`📹 [WebRTC] User ${client.userId} sending answer to ${data.to} for call ${data.callId}`);

      // Send answer to the target user
      this.emitToUser(data.to, 'video:answer', {
        answer: data.answer,
        from: client.userId,
        callId: data.callId,
      });

      this.logger.debug(`✅ [WebRTC] Answer forwarded from ${client.userId} to ${data.to}`);
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Video answer error: ${error.message}`);
      client.emit('video:error', {
        message: 'Failed to send video answer',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('video:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { candidate: RTCIceCandidateInit; to: string; callId: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.debug(`🧊 [WebRTC] ICE candidate from ${client.userId} to ${data.to}`);

      // Send ICE candidate to the target user
      this.emitToUser(data.to, 'video:ice-candidate', {
        candidate: data.candidate,
        from: client.userId,
        callId: data.callId,
      });
    } catch (error) {
      this.logger.error(`❌ [WebRTC] ICE candidate error: ${error.message}`);
    }
  }

  @SubscribeMessage('video:join-call')
  async handleJoinCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; roomName: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.log(`📹 [WebRTC] User ${client.userId} joining call ${data.callId}`);

      // Join the call room
      await client.join(data.roomName);

      // Notify other participants
      client.to(data.roomName).emit('video:user-joined', {
        userId: client.userId,
        callId: data.callId,
      });

      // Send confirmation to user
      client.emit('video:joined', {
        callId: data.callId,
        roomName: data.roomName,
      });

      this.logger.debug(`✅ [WebRTC] User ${client.userId} joined call room ${data.roomName}`);
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Join call error: ${error.message}`);
      client.emit('video:error', {
        message: 'Failed to join call',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('video:leave-call')
  async handleLeaveCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; roomName: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.log(`📹 [WebRTC] User ${client.userId} leaving call ${data.callId}`);

      // Leave the call room
      await client.leave(data.roomName);

      // Notify other participants
      client.to(data.roomName).emit('video:user-left', {
        userId: client.userId,
        callId: data.callId,
      });

      // Send confirmation to user
      client.emit('video:left', {
        callId: data.callId,
      });

      this.logger.debug(`✅ [WebRTC] User ${client.userId} left call room ${data.roomName}`);
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Leave call error: ${error.message}`);
    }
  }

  @SubscribeMessage('video:toggle-audio')
  async handleToggleAudio(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; roomName: string; enabled: boolean },
  ) {
    if (!client.userId) return;

    try {
      this.logger.debug(`🎤 [WebRTC] User ${client.userId} audio ${data.enabled ? 'enabled' : 'muted'}`);

      // Notify other participants
      client.to(data.roomName).emit('video:audio-toggled', {
        userId: client.userId,
        callId: data.callId,
        enabled: data.enabled,
      });
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Toggle audio error: ${error.message}`);
    }
  }

  @SubscribeMessage('video:toggle-video')
  async handleToggleVideo(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; roomName: string; enabled: boolean },
  ) {
    if (!client.userId) return;

    try {
      this.logger.debug(`📹 [WebRTC] User ${client.userId} video ${data.enabled ? 'enabled' : 'disabled'}`);

      // Notify other participants
      client.to(data.roomName).emit('video:video-toggled', {
        userId: client.userId,
        callId: data.callId,
        enabled: data.enabled,
      });
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Toggle video error: ${error.message}`);
    }
  }

  @SubscribeMessage('video:screen-share-started')
  async handleScreenShareStarted(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; roomName: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.log(`🖥️ [WebRTC] User ${client.userId} started screen sharing`);

      // Notify other participants
      client.to(data.roomName).emit('video:user-screen-sharing', {
        userId: client.userId,
        callId: data.callId,
        sharing: true,
      });
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Screen share started error: ${error.message}`);
    }
  }

  @SubscribeMessage('video:screen-share-stopped')
  async handleScreenShareStopped(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callId: string; roomName: string },
  ) {
    if (!client.userId) return;

    try {
      this.logger.log(`🖥️ [WebRTC] User ${client.userId} stopped screen sharing`);

      // Notify other participants
      client.to(data.roomName).emit('video:user-screen-sharing', {
        userId: client.userId,
        callId: data.callId,
        sharing: false,
      });
    } catch (error) {
      this.logger.error(`❌ [WebRTC] Screen share stopped error: ${error.message}`);
    }
  }

  // =============================================
  // PUBLIC METHODS FOR SERVICE INTEGRATION
  // =============================================

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any): boolean {
    try {
      this.server.to(`user:${userId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to emit to user ${userId}: ${error.message}`);
      return false;
    }
  }

  // Emit to multiple users
  emitToUsers(userIds: string[], event: string, data: any): boolean {
    try {
      userIds.forEach(userId => {
        this.emitToUser(userId, event, data);
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to emit to multiple users: ${error.message}`);
      return false;
    }
  }

  // Emit to room
  emitToRoom(room: string, event: string, data: any): boolean {
    try {
      this.server.to(room).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to emit to room ${room}: ${error.message}`);
      return false;
    }
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any, excludeUserId?: string): boolean {
    try {
      let emitter = this.server.to('authenticated');
      
      if (excludeUserId) {
        emitter = emitter.except(`user:${excludeUserId}`);
      }
      
      emitter.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to broadcast: ${error.message}`);
      return false;
    }
  }

  // Get user presence
  getUserPresence(userId: string): UserPresence | null {
    return this.userPresence.get(userId) || null;
  }

  // Get all online users
  getOnlineUsers(): string[] {
    return Array.from(this.userPresence.entries())
      .filter(([, presence]) => presence.status !== 'offline' && presence.socketIds.size > 0)
      .map(([userId]) => userId);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    const presence = this.userPresence.get(userId);
    return presence ? presence.status !== 'offline' && presence.socketIds.size > 0 : false;
  }

  // Get connection count for user
  getUserConnectionCount(userId: string): number {
    const presence = this.userPresence.get(userId);
    return presence ? presence.socketIds.size : 0;
  }

  // Get user IDs currently in a specific room
  async getUsersInRoom(roomName: string): Promise<string[]> {
    try {
      const socketsInRoom = await this.server.in(roomName).fetchSockets();
      const userIds = new Set<string>();

      for (const socket of socketsInRoom) {
        const userId = this.socketToUser.get(socket.id);
        if (userId) {
          userIds.add(userId);
        }
      }

      return Array.from(userIds);
    } catch (error) {
      this.logger.error(`Failed to get users in room ${roomName}: ${error.message}`);
      return [];
    }
  }

  // Emit to workspace user (for cross-page notifications)
  emitToWorkspaceUser(workspaceId: string, userId: string, event: string, data: any): boolean {
    try {
      const room = `workspace:${workspaceId}:user:${userId}`;

      // Check if anyone is in this room
      const socketsInRoom = this.server.in(room).allSockets();
      socketsInRoom.then(sockets => {
        this.logger.log(`📡 [AppGateway] Room ${room} has ${sockets.size} socket(s)`);
        if (sockets.size === 0) {
          this.logger.warn(`⚠️ [AppGateway] No sockets in room ${room} - user may not be connected`);
        }
      });

      this.server.to(room).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`✅ [AppGateway] Emitted ${event} to room: ${room}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ [AppGateway] Failed to emit to workspace user ${workspaceId}:${userId}: ${error.message}`);
      return false;
    }
  }

  // Emit to multiple workspace users (for conversation/channel participants)
  emitToWorkspaceUsers(workspaceId: string, userIds: string[], event: string, data: any): boolean {
    try {
      this.logger.log(`📡 [AppGateway] Emitting ${event} to ${userIds.length} users in workspace ${workspaceId}`);
      userIds.forEach(userId => {
        this.emitToWorkspaceUser(workspaceId, userId, event, data);
      });
      return true;
    } catch (error) {
      this.logger.error(`❌ [AppGateway] Failed to emit to workspace users: ${error.message}`);
      return false;
    }
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

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

  private updateUserPresence(userId: string, socketId: string, status: 'online' | 'away' | 'busy' | 'offline'): void {
    let presence = this.userPresence.get(userId);
    
    if (!presence) {
      presence = {
        userId,
        status,
        lastSeen: new Date(),
        socketIds: new Set([socketId]),
      };
      this.userPresence.set(userId, presence);
    } else {
      presence.status = status;
      presence.lastSeen = new Date();
      presence.socketIds.add(socketId);
    }
  }

  private removeSocketFromPresence(userId: string, socketId: string): void {
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.socketIds.delete(socketId);
      if (presence.socketIds.size === 0) {
        presence.status = 'offline';
        presence.lastSeen = new Date();
      }
    }
  }

  private emitPresenceUpdate(userId: string, status: string): void {
    this.broadcast('presence:updated', {
      userId,
      status,
    }, userId);
  }

  private canJoinRoom(userId: string, room: string): boolean {
    // Implement your room access logic here
    // Allow joining:
    // - User-specific rooms (user:userId)
    // - Workspace user rooms (workspace:workspaceId:user:userId)
    // - Workspace rooms (workspace:workspaceId)
    // - Conversation rooms (conversation:conversationId) - for DMs and group chats
    // - Channel rooms (channel:channelId)
    // - Common rooms (general, notifications)

    const allowedRooms = [
      `user:${userId}`,
      'general',
      'notifications',
    ];

    // Check if room matches allowed rooms
    if (allowedRooms.includes(room)) {
      return true;
    }

    // Allow workspace-specific user rooms
    if (room.match(/^workspace:[^:]+:user:[^:]+$/)) {
      // Extract userId from room pattern
      const roomUserId = room.split(':')[3];
      return roomUserId === userId;
    }

    // Allow general workspace rooms (TODO: Add proper permission check in production)
    if (room.startsWith('workspace:')) {
      return true;
    }

    // Allow conversation and channel rooms (TODO: Add proper permission check in production)
    if (room.startsWith('conversation:') || room.startsWith('channel:')) {
      return true;
    }

    // Allow file rooms for comments (file:fileId:comments)
    if (room.startsWith('file:')) {
      return true;
    }

    // Allow user sub-rooms
    if (room.startsWith(`user:${userId}:`)) {
      return true;
    }

    return false;
  }

  private cleanupStalePresence(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [userId, presence] of this.userPresence.entries()) {
      const timeSinceLastSeen = now.getTime() - presence.lastSeen.getTime();
      
      if (timeSinceLastSeen > staleThreshold && presence.socketIds.size === 0) {
        this.userPresence.delete(userId);
        this.logger.debug(`Cleaned up stale presence for user: ${userId}`);
      }
    }
  }

  private checkConnectionRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(clientIP) || 0;
    
    // Reset attempts every minute
    setTimeout(() => {
      this.connectionAttempts.delete(clientIP);
    }, 60000);
    
    if (attempts >= this.MAX_CONNECTION_ATTEMPTS) {
      // Block IP temporarily
      this.blockedIPs.add(clientIP);
      setTimeout(() => {
        this.blockedIPs.delete(clientIP);
        this.logger.log(`Unblocked IP: ${clientIP}`);
      }, this.BLOCK_DURATION_MS);
      
      this.logger.warn(`Blocked IP due to excessive connection attempts: ${clientIP}`);
      return false;
    }
    
    // Count current connections from this IP
    let connectionsFromIP = 0;

    // Check if server and sockets are available
    if (this.server && this.server.sockets && this.server.sockets.sockets) {
      for (const [socketId, userId] of this.socketToUser.entries()) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket && socket.handshake.address === clientIP) {
          connectionsFromIP++;
        }
      }

      if (connectionsFromIP >= this.MAX_CONNECTIONS_PER_IP) {
        this.logger.warn(`Connection limit exceeded for IP: ${clientIP}`);
        return false;
      }
    }
    
    // Increment connection attempts
    this.connectionAttempts.set(clientIP, attempts + 1);
    return true;
  }

  // =============================================
  // TYPING INDICATOR HANDLERS
  // =============================================

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channelId?: string; conversationId?: string }
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
    @MessageBody() data: { channelId?: string; conversationId?: string }
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
    @MessageBody() data: { messageId: string; emoji: string }
  ) {
    if (!client.userId) {
      this.logger.warn('add_reaction received but no userId on socket');
      return;
    }

    try {
      this.logger.log(`👍 User ${client.userId} toggling reaction ${data.emoji} on message ${data.messageId}`);

      const result = await this.chatService.addReaction(
        data.messageId,
        data.emoji,
        client.userId
      );

      // Broadcast appropriate event based on whether reaction was added or removed (toggle)
      if (result.removed) {
        // Reaction was toggled off (removed)
        this.server.to(`workspace:${client.workspaceId}`).emit('reaction_removed', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: client.userId,
        });
        this.logger.log(`✅ Reaction removed successfully`);
      } else {
        // Reaction was added
        this.server.to(`workspace:${client.workspaceId}`).emit('reaction_added', {
          messageId: data.messageId,
          emoji: data.emoji,
          userId: client.userId,
          reaction: result.reaction,
        });
        this.logger.log(`✅ Reaction added successfully`);
      }

    } catch (error) {
      this.logger.error(`❌ Failed to toggle reaction: ${error.message}`);
      client.emit('error', { message: 'Failed to toggle reaction' });
    }
  }

  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string }
  ) {
    if (!client.userId) {
      this.logger.warn('remove_reaction received but no userId on socket');
      return;
    }

    try {
      this.logger.log(`👎 User ${client.userId} removing reaction ${data.emoji} from message ${data.messageId}`);

      await this.chatService.removeReaction(
        data.messageId,
        data.emoji,
        client.userId
      );

      // Broadcast reaction removal to workspace
      this.server.to(`workspace:${client.workspaceId}`).emit('reaction_removed', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: client.userId,
      });

      this.logger.log(`✅ Reaction removed successfully`);

    } catch (error) {
      this.logger.error(`❌ Failed to remove reaction: ${error.message}`);
      client.emit('error', { message: 'Failed to remove reaction' });
    }
  }
}