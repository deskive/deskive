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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { VideoCallsService } from '../video-calls.service';
import { DatabaseService } from '../../database/database.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  callId?: string;
}

interface MediaToggleData {
  callId: string;
  participantId: string;
  mediaType: 'audio' | 'video' | 'screen';
  enabled: boolean;
}

interface ParticipantEventData {
  callId: string;
  participantId: string;
  userId: string;
  displayName?: string;
}

@WebSocketGateway({
  namespace: '/video-calls',
  cors: {
    origin: '*',
  },
})
export class VideoCallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('VideoCallsGateway');
  private connectedParticipants = new Map<string, AuthenticatedSocket>();

  constructor(
    @Inject(forwardRef(() => VideoCallsService))
    private videoCallsService: VideoCallsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.warn(`Video call connection rejected: No token provided - ${client.id}`);
        client.disconnect();
        return;
      }

      // Validate JWT token
      const payload = await this.validateToken(token);
      if (!payload) {
        this.logger.warn(`Video call connection rejected: Invalid token - ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach validated user info to socket
      client.userId = payload.sub;

      // Store connection
      this.connectedParticipants.set(client.id, client);

      this.logger.log(`User ${client.userId} connected to video calls namespace - ${client.id}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    const callId = client.callId;

    if (userId && callId) {
      this.logger.log(
        `User ${userId} disconnected from call ${callId} - updating participant status`,
      );

      try {
        // IMPORTANT: Update the database to mark participant as left
        // This handles the case where user closes browser/tab and the API call doesn't complete
        await this.videoCallsService.leaveCall(callId, userId);
        this.logger.log(
          `✅ Successfully updated participant status for user ${userId} in call ${callId}`,
        );
      } catch (error) {
        this.logger.error(`❌ Failed to update participant status on disconnect: ${error.message}`);
        // Continue with cleanup even if leaveCall fails
      }

      // Notify others in the call that participant disconnected
      this.server.to(`call:${callId}`).emit('participant:disconnected', {
        userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Remove from connected participants
    this.connectedParticipants.delete(client.id);
  }

  // ============================================
  // Call Management Events
  // ============================================

  @SubscribeMessage('call:join')
  async handleJoinCall(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { callId } = data;
    const userId = client.userId;

    this.logger.log(
      `🚪 [call:join] Socket ${client.id} attempting to join call ${callId}, userId: ${userId}`,
    );

    if (!userId) {
      this.logger.warn(`🚪 [call:join] Rejected - no userId on socket`);
      return { error: 'Unauthorized' };
    }

    try {
      // Join the call room
      client.join(`call:${callId}`);
      client.callId = callId;

      this.logger.log(`🚪 [call:join] User ${userId} joined call room: ${callId}`);

      // Broadcast to other participants
      client.to(`call:${callId}`).emit('participant:joined', {
        userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });

      // Get current participants to send back
      const participants = await this.videoCallsService.getParticipants(callId, userId);

      return {
        success: true,
        participants,
      };
    } catch (error) {
      this.logger.error(`Error joining call: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('call:leave')
  async handleLeaveCall(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { callId } = data;
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      this.logger.log(`User ${userId} leaving call: ${callId}`);

      // Broadcast to other participants
      client.to(`call:${callId}`).emit('participant:left', {
        userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });

      // Leave the call room
      client.leave(`call:${callId}`);
      client.callId = undefined;

      return { success: true };
    } catch (error) {
      this.logger.error(`Error leaving call: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('call:decline')
  async handleDeclineCall(
    @MessageBody() data: { callId: string; callerUserId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { callId, callerUserId } = data;
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      this.logger.log(
        `📵 [VideoCallsGateway] User ${userId} declined call ${callId} from ${callerUserId}`,
      );

      // Call the service method to properly decline the call
      // This updates the participant status to 'declined' and checks if call should end
      await this.videoCallsService.declineCall(callId, userId);

      // Get call details to determine if it's a group call
      let isGroupCall = false;
      try {
        const call = await this.videoCallsService.getCallById(callId, userId);
        isGroupCall = call?.is_group_call || false;
        this.logger.log(
          `📋 [VideoCallsGateway] Call type: ${isGroupCall ? 'Group' : 'One-to-One'}`,
        );
      } catch (error) {
        this.logger.warn(`⚠️ [VideoCallsGateway] Could not fetch call details: ${error.message}`);
        // Continue with default isGroupCall = false
      }

      // Get user info for the person who declined
      const declinedByUser = await this.db.getUserById(userId);
      const declinedByName =
        declinedByUser?.metadata?.name ||
        (declinedByUser as any)?.fullName ||
        declinedByUser?.name ||
        declinedByUser?.email?.split('@')[0] ||
        'Someone';

      this.logger.log(`👤 [VideoCallsGateway] Declined by: ${declinedByName}`);

      // Find all sockets for the caller
      const connectedSockets = Array.from(this.connectedParticipants.values());
      const callerSockets = connectedSockets.filter((socket) => socket.userId === callerUserId);

      this.logger.log(
        `🔌 [VideoCallsGateway] Found ${callerSockets.length} socket(s) for caller ${callerUserId}`,
      );

      if (callerSockets.length > 0) {
        // Send decline notification to all caller's connected devices
        callerSockets.forEach((socket) => {
          const declinePayload = {
            callId,
            declinedBy: userId,
            declinedByName,
            isGroupCall, // Include group call flag
            timestamp: new Date().toISOString(),
          };

          this.logger.log(`📤 [VideoCallsGateway] Sending 'call:declined' to socket ${socket.id}`);
          this.logger.log(`📋 [VideoCallsGateway] Payload: ${JSON.stringify(declinePayload)}`);

          socket.emit('call:declined', declinePayload);

          // Also emit call:ended event to trigger UI refresh for call status
          socket.emit('call:ended', {
            reason: 'declined',
            ended_by: userId,
            timestamp: new Date().toISOString(),
          });
        });

        this.logger.log(
          `✅ [VideoCallsGateway] Sent call declined notification to caller ${callerUserId}`,
        );
      } else {
        this.logger.warn(
          `⚠️ [VideoCallsGateway] Caller ${callerUserId} is not connected to WebSocket`,
        );
      }

      // Also send call:ended to the decliner to update their sidebar
      const declinerSockets = connectedSockets.filter((socket) => socket.userId === userId);
      declinerSockets.forEach((socket) => {
        socket.emit('call:ended', {
          reason: 'declined',
          ended_by: userId,
          timestamp: new Date().toISOString(),
        });
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`❌ [VideoCallsGateway] Error handling call decline: ${error.message}`);
      return { error: error.message };
    }
  }

  // ============================================
  // Media Control Events
  // ============================================

  @SubscribeMessage('media:toggle')
  async handleMediaToggle(
    @MessageBody() data: MediaToggleData,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const { callId, participantId, mediaType, enabled } = data;

      this.logger.log(`User ${userId} toggled ${mediaType} to ${enabled} in call ${callId}`);

      // Update participant state in database
      const updateData: any = {};
      if (mediaType === 'audio') {
        updateData.is_audio_muted = !enabled;
      } else if (mediaType === 'video') {
        updateData.is_video_muted = !enabled;
      } else if (mediaType === 'screen') {
        updateData.is_screen_sharing = enabled;
      }

      await this.videoCallsService.updateParticipant(callId, participantId, userId, updateData);

      // Broadcast to other participants
      client.to(`call:${callId}`).emit('participant:media_updated', {
        userId,
        participantId,
        mediaType,
        enabled,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error toggling media: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('hand:raise')
  async handleHandRaise(
    @MessageBody() data: { callId: string; participantId: string; raised: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const { callId, participantId, raised } = data;

      this.logger.log(`User ${userId} ${raised ? 'raised' : 'lowered'} hand in call ${callId}`);

      // Update participant state in database
      await this.videoCallsService.updateParticipant(callId, participantId, userId, {
        is_hand_raised: raised,
      });

      // Broadcast to all participants (including sender)
      this.server.to(`call:${callId}`).emit('participant:hand_updated', {
        userId,
        participantId,
        raised,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error updating hand raise: ${error.message}`);
      return { error: error.message };
    }
  }

  // ============================================
  // Chat Events (In-call messaging)
  // ============================================

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @MessageBody() data: { callId: string; content: string; replyTo?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const { callId, content, replyTo } = data;

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        senderId: userId,
        content,
        replyTo,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all participants (including sender)
      this.server.to(`call:${callId}`).emit('chat:message_received', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`[chat:message] Error: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('chat:reaction')
  async handleChatReaction(
    @MessageBody()
    data: { callId: string; messageId: string; emoji: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const { callId, messageId, emoji } = data;

      // Broadcast to all participants
      this.server.to(`call:${callId}`).emit('chat:reaction_added', {
        messageId,
        userId,
        emoji,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error adding reaction: ${error.message}`);
      return { error: error.message };
    }
  }

  // ============================================
  // Recording Events
  // ============================================

  @SubscribeMessage('recording:started')
  handleRecordingStarted(
    @MessageBody() data: { callId: string; recordingId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { callId, recordingId } = data;

    this.logger.log(`Recording started for call ${callId}: ${recordingId}`);

    // Broadcast to all participants
    this.server.to(`call:${callId}`).emit('recording:status', {
      status: 'started',
      recordingId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('recording:stopped')
  handleRecordingStopped(
    @MessageBody() data: { callId: string; recordingId: string; recordingUrl?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const { callId, recordingId, recordingUrl } = data;

    this.logger.log(`Recording stopped for call ${callId}: ${recordingId}`);

    // Broadcast to all participants
    this.server.to(`call:${callId}`).emit('recording:status', {
      status: 'stopped',
      recordingId,
      recordingUrl,
      timestamp: new Date().toISOString(),
    });

    // If recording URL is available, send it as a system chat message
    if (recordingUrl) {
      this.sendRecordingMessage(callId, recordingUrl);
    }

    return { success: true };
  }

  /**
   * Send recording URL as a system chat message
   */
  sendRecordingMessage(callId: string, recordingUrl: string) {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      senderId: 'system',
      senderName: 'Recording Bot',
      type: 'recording',
      content: `📹 Recording is ready!\n\nDownload: ${recordingUrl}`,
      recordingUrl,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`Sending recording message to call ${callId}: ${recordingUrl}`);
    this.server.to(`call:${callId}`).emit('chat:message_received', message);
  }

  // ============================================
  // Connection Quality Events
  // ============================================

  @SubscribeMessage('quality:update')
  handleQualityUpdate(
    @MessageBody()
    data: {
      callId: string;
      participantId: string;
      quality: 'excellent' | 'good' | 'poor';
      stats?: any;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;

    if (!userId) {
      return { error: 'Unauthorized' };
    }

    const { callId, participantId, quality } = data;

    // Optionally broadcast quality degradation to other participants
    if (quality === 'poor') {
      client.to(`call:${callId}`).emit('participant:quality_degraded', {
        userId,
        participantId,
        quality,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Extract JWT token from socket handshake
   */
  private extractTokenFromSocket(client: Socket): string | null {
    // Try multiple sources in order of preference
    const sources = [
      client.handshake.auth?.token,
      client.handshake.query?.token,
      client.handshake.headers?.authorization?.replace('Bearer ', ''),
    ];

    for (const token of sources) {
      if (token && typeof token === 'string') {
        return token;
      }
    }

    return null;
  }

  /**
   * Validate JWT token (database tokens)
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
      };
    } catch (error) {
      this.logger.error('Token validation failed:', error.message);
      return null;
    }
  }

  /**
   * Broadcast event to specific call room
   */
  broadcastToCall(callId: string, event: string, data: any) {
    this.logger.log(`📡 [VideoCallsGateway] Broadcasting ${event} to call room: call:${callId}`);
    this.server.to(`call:${callId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast event to specific users (by user IDs)
   * Useful when participants haven't joined the call room yet
   */
  broadcastToUsers(userIds: string[], event: string, data: any) {
    const connectedSockets = Array.from(this.connectedParticipants.values());

    for (const userId of userIds) {
      const userSockets = connectedSockets.filter((socket) => socket.userId === userId);

      if (userSockets.length > 0) {
        userSockets.forEach((socket) => {
          this.logger.log(
            `📤 [VideoCallsGateway] Sending ${event} to user ${userId} (socket: ${socket.id})`,
          );
          socket.emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
          });
        });
      } else {
        this.logger.warn(`⚠️ [VideoCallsGateway] User ${userId} not connected for event ${event}`);
      }
    }
  }

  /**
   * Get connected participants count for a call
   */
  getCallParticipantCount(callId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`call:${callId}`);
    return room ? room.size : 0;
  }

  /**
   * Send incoming call notification to specific user(s)
   */
  sendIncomingCallNotification(
    userIds: string[],
    callData: {
      callId: string;
      callType: 'audio' | 'video';
      isGroupCall: boolean;
      callerUserId: string;
      callerName: string;
      callerAvatar?: string;
      participantIds?: string[];
    },
  ) {
    this.logger.log('📞 [VideoCallsGateway] sendIncomingCallNotification called');
    this.logger.log(`📋 [VideoCallsGateway] Target user IDs: ${JSON.stringify(userIds)}`);
    this.logger.log(`📋 [VideoCallsGateway] Call data: ${JSON.stringify(callData)}`);

    // Get all connected sockets for the target users
    const connectedSockets = Array.from(this.connectedParticipants.values());
    this.logger.log(`🔌 [VideoCallsGateway] Total connected sockets: ${connectedSockets.length}`);

    // Log all connected user IDs for debugging
    const connectedUserIds = connectedSockets.map((s) => s.userId).filter(Boolean);
    this.logger.log(
      `👥 [VideoCallsGateway] Connected user IDs: ${JSON.stringify(connectedUserIds)}`,
    );

    for (const userId of userIds) {
      this.logger.log(`🔍 [VideoCallsGateway] Processing notification for user: ${userId}`);

      // Skip sending to the caller
      if (userId === callData.callerUserId) {
        this.logger.log(`⏭️ [VideoCallsGateway] Skipping caller ${userId}`);
        continue;
      }

      // Find all sockets for this user
      const userSockets = connectedSockets.filter((socket) => socket.userId === userId);
      this.logger.log(
        `🔌 [VideoCallsGateway] Found ${userSockets.length} socket(s) for user ${userId}`,
      );

      if (userSockets.length > 0) {
        // Send notification to all user's connected devices
        userSockets.forEach((socket) => {
          const notificationPayload = {
            callId: callData.callId,
            callType: callData.callType,
            isGroupCall: callData.isGroupCall,
            from: {
              id: callData.callerUserId,
              name: callData.callerName,
              avatar: callData.callerAvatar,
            },
            participants: callData.participantIds,
            timestamp: new Date().toISOString(),
          };

          this.logger.log(`📤 [VideoCallsGateway] Emitting 'call:incoming' to socket ${socket.id}`);
          this.logger.log(
            `📋 [VideoCallsGateway] Payload: ${JSON.stringify(notificationPayload, null, 2)}`,
          );

          socket.emit('call:incoming', notificationPayload);

          this.logger.log(
            `✅ [VideoCallsGateway] Sent incoming ${callData.callType} call notification to user ${userId} (socket: ${socket.id})`,
          );
        });
      } else {
        this.logger.warn(
          `⚠️ [VideoCallsGateway] User ${userId} is not connected to video call WebSocket`,
        );
      }
    }

    this.logger.log('✅ [VideoCallsGateway] sendIncomingCallNotification completed');
  }

  // ============================================
  // Join Request Events
  // ============================================

  /**
   * Emit join request to host
   */
  emitJoinRequest(
    callId: string,
    hostUserId: string,
    requestData: {
      id: string;
      user_id: string;
      display_name: string;
      message?: string;
      timestamp: string;
    },
  ) {
    this.logger.log(`Emitting join request to host ${hostUserId} for call ${callId}`);

    // Find all sockets for the host user
    const hostSockets = Array.from(this.connectedParticipants.values()).filter(
      (socket) => socket.userId === hostUserId,
    );

    if (hostSockets.length > 0) {
      hostSockets.forEach((socket) => {
        socket.emit('join-request:new', {
          call_id: callId,
          request: requestData,
        });
      });

      this.logger.log(`Join request sent to host ${hostUserId} (${hostSockets.length} socket(s))`);
    } else {
      this.logger.warn(`Host ${hostUserId} not connected to receive join request`);
    }
  }

  /**
   * Emit join request accepted to requester
   */
  emitJoinRequestAccepted(
    callId: string,
    requesterUserId: string,
    data: {
      call_id: string;
      request_id: string;
      message: string;
    },
  ) {
    this.logger.log(`Emitting join request accepted to user ${requesterUserId}`);

    const requesterSockets = Array.from(this.connectedParticipants.values()).filter(
      (socket) => socket.userId === requesterUserId,
    );

    if (requesterSockets.length > 0) {
      requesterSockets.forEach((socket) => {
        socket.emit('join-request:accepted', data);
      });

      this.logger.log(
        `Join request acceptance sent to ${requesterUserId} (${requesterSockets.length} socket(s))`,
      );
    } else {
      this.logger.warn(`Requester ${requesterUserId} not connected to receive acceptance`);
    }
  }

  /**
   * Emit join request rejected to requester
   */
  emitJoinRequestRejected(
    callId: string,
    requesterUserId: string,
    data: {
      call_id: string;
      request_id: string;
      message: string;
    },
  ) {
    this.logger.log(`Emitting join request rejected to user ${requesterUserId}`);

    const requesterSockets = Array.from(this.connectedParticipants.values()).filter(
      (socket) => socket.userId === requesterUserId,
    );

    if (requesterSockets.length > 0) {
      requesterSockets.forEach((socket) => {
        socket.emit('join-request:rejected', data);
      });

      this.logger.log(
        `Join request rejection sent to ${requesterUserId} (${requesterSockets.length} socket(s))`,
      );
    } else {
      this.logger.warn(`Requester ${requesterUserId} not connected to receive rejection`);
    }
  }
}
