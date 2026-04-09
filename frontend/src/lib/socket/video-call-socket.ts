// src/lib/socket/video-call-socket.ts
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/config';

// ============================================
// Video Call Socket Events (matching backend)
// ============================================

export type VideoCallEvent =
  // Connection events
  | 'connect'
  | 'disconnect'
  | 'connect_error'
  | 'reconnect'
  // Call management
  | 'call:join'
  | 'call:leave'
  | 'call:decline'
  | 'call:ended'
  | 'call:incoming'
  | 'call:declined'
  // Participant events (emitted by backend)
  | 'participant:joined'
  | 'participant:left'
  | 'participant:disconnected'
  | 'participant:media_updated'
  | 'participant:hand_updated'
  | 'participant:quality_degraded'
  // Media control events
  | 'media:toggle'
  | 'hand:raise'
  // Chat events
  | 'chat:message'
  | 'chat:reaction'
  | 'chat:message_received'
  | 'chat:reaction_added'
  // Recording events
  | 'recording:started'
  | 'recording:stopped'
  | 'recording:status'
  // Quality events
  | 'quality:update';

export interface MediaToggleData {
  callId: string;
  participantId: string;
  mediaType: 'audio' | 'video' | 'screen';
  enabled: boolean;
}

export interface ParticipantJoinedData {
  userId: string;
  socketId: string;
  timestamp: string;
}

export interface ParticipantLeftData {
  userId: string;
  socketId: string;
  timestamp: string;
}

export interface ParticipantMediaUpdatedData {
  userId: string;
  participantId: string;
  mediaType: 'audio' | 'video' | 'screen';
  enabled: boolean;
  timestamp: string;
}

export interface ParticipantHandUpdatedData {
  userId: string;
  participantId: string;
  raised: boolean;
  timestamp: string;
}

export interface ChatMessageData {
  callId: string;
  content: string;
  replyTo?: string;
}

export interface ChatMessageReceivedData {
  id: string;
  senderId: string;
  content: string;
  replyTo?: string;
  timestamp: string;
}

export interface ChatReactionData {
  callId: string;
  messageId: string;
  emoji: string;
}

export interface RecordingStatusData {
  status: 'started' | 'stopped';
  recordingId: string;
  timestamp: string;
}

export interface QualityUpdateData {
  callId: string;
  participantId: string;
  quality: 'excellent' | 'good' | 'poor';
  stats?: any;
}

export interface CallEndedData {
  reason: 'participant_left' | 'all_participants_left' | 'host_ended';
  ended_by: string;
  timestamp: string;
}

export interface IncomingCallData {
  callId: string;
  callType: 'audio' | 'video';
  isGroupCall: boolean;
  from: {
    id: string;
    name: string;
    avatar?: string;
  };
  participants?: string[];
  timestamp: string;
}

export interface CallDeclinedData {
  callId: string;
  declinedBy: string;
  declinedByName: string;
  isGroupCall: boolean;
  timestamp: string;
}

// ============================================
// Video Call Socket Service
// ============================================

class VideoCallSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private eventHandlers = new Map<string, Set<Function>>();

  /**
   * Connect to video calls WebSocket namespace
   */
  connect(token?: string): void {
    if (this.socket?.connected) {
      console.log('[VideoCallSocket] Already connected');
      return;
    }

    const authToken = token || this.token || localStorage.getItem('auth_token') || '';
    if (token) {
      this.token = token;
    }

    console.log('[VideoCallSocket] Connecting to /video-calls namespace...');

    // Connect to /video-calls namespace
    this.socket = io(`${API_CONFIG.baseUrl}/video-calls`, {
      auth: {
        token: authToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup default event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ [VideoCallSocket] Connected to video calls namespace');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [VideoCallSocket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[VideoCallSocket] Connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ [VideoCallSocket] Reconnected after ${attemptNumber} attempts`);
    });
  }

  /**
   * Disconnect from video calls socket
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[VideoCallSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ============================================
  // Call Management
  // ============================================

  /**
   * Join a call room
   */
  joinCall(callId: string): Promise<{ success: boolean; participants?: any[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('call:join', { callId }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          console.log('[VideoCallSocket] Joined call:', callId);
          resolve(response);
        }
      });
    });
  }

  /**
   * Leave a call room
   */
  leaveCall(callId: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('call:leave', { callId }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          console.log('[VideoCallSocket] Left call:', callId);
          resolve(response);
        }
      });
    });
  }

  /**
   * Decline a call invitation
   */
  declineCall(callId: string, callerUserId: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('call:decline', { callId, callerUserId }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          console.log('[VideoCallSocket] Declined call:', callId);
          resolve(response);
        }
      });
    });
  }

  // ============================================
  // Media Controls
  // ============================================

  /**
   * Toggle media (audio/video/screen)
   */
  toggleMedia(data: MediaToggleData): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('media:toggle', data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Raise or lower hand
   */
  raiseHand(
    callId: string,
    participantId: string,
    raised: boolean
  ): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('hand:raise', { callId, participantId, raised }, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // ============================================
  // Chat
  // ============================================

  /**
   * Send in-call chat message
   */
  sendChatMessage(data: ChatMessageData): Promise<{ success: boolean; message: any }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('chat:message', data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Add reaction to a message
   */
  addReaction(data: ChatReactionData): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('chat:reaction', data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // ============================================
  // Recording
  // ============================================

  /**
   * Notify recording started
   */
  notifyRecordingStarted(callId: string, recordingId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('recording:started', { callId, recordingId });
    }
  }

  /**
   * Notify recording stopped
   */
  notifyRecordingStopped(callId: string, recordingId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('recording:stopped', { callId, recordingId });
    }
  }

  // ============================================
  // Quality Monitoring
  // ============================================

  /**
   * Update connection quality
   */
  updateQuality(data: QualityUpdateData): void {
    if (this.socket?.connected) {
      this.socket.emit('quality:update', data);
    }
  }

  // ============================================
  // Event Listeners
  // ============================================

  /**
   * Subscribe to video call events
   */
  on(event: VideoCallEvent, callback: Function): void {
    if (this.socket) {
      this.socket.on(event, callback as (...args: any[]) => void);

      // Track event handlers for cleanup
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set());
      }
      this.eventHandlers.get(event)!.add(callback);
    }
  }

  /**
   * Unsubscribe from video call events
   */
  off(event: VideoCallEvent, callback?: Function): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as (...args: any[]) => void);
        this.eventHandlers.get(event)?.delete(callback);
      } else {
        this.socket.off(event);
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Subscribe once to an event
   */
  once(event: VideoCallEvent, callback: Function): void {
    if (this.socket) {
      this.socket.once(event, callback as (...args: any[]) => void);
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get raw socket instance (for advanced use cases)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Reconnect with new token
   */
  reconnect(token?: string): void {
    this.disconnect();
    this.connect(token);
  }
}

// Export singleton instance
export const videoCallSocket = new VideoCallSocketService();
export default videoCallSocket;
