// src/lib/api/websocket-api.ts
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/lib/config';

// Types
export type WebSocketEventType =
  | 'message'
  | 'typing'
  | 'presence'
  | 'notification'
  | 'cursor'
  | 'whiteboard'
  | 'video-call'
  | 'connect'
  | 'disconnect'
  | 'reconnect'
  | 'user_online'
  | 'user_offline'
  | 'user_status_changed'
  | 'notification_received'
  | 'notification_read'
  | 'notification_cleared'
  | 'typing_start'
  | 'typing_stop'
  | 'user_typing_start'    // Backend emits this
  | 'user_typing_stop'     // Backend emits this
  | 'message_created'
  | 'message_updated'
  | 'message_deleted'
  | 'message:new'          // Backend emits this
  | 'message:updated'      // Backend emits this
  | 'message:deleted'      // Backend emits this
  | 'message:bookmarked'   // Backend emits this
  | 'message:pinned'       // Backend emits this
  | 'message:new:workspace'  // Backend emits this
  | 'messages:read'        // Backend emits this
  | 'channel:read'         // Backend emits this
  | 'conversation:read'    // Backend emits this
  | 'reaction_added'
  | 'reaction_removed'
  | 'connection:success'
  | 'connection:error'
  | 'presence:updated'
  | 'room:joined'
  | 'room:left'
  | 'user:joined'
  | 'user:left'
  | 'poll:voted'          // Backend emits this
  | 'poll:closed'         // Backend emits this
  | 'approval:status_updated'  // Backend emits when approval request status changes
  | 'approval:comment_added'   // Backend emits when new comment is added
  | 'approval:request_deleted' // Backend emits when approval request is deleted
  | 'approval:request_created' // Backend emits when new approval request is created
  | 'whiteboard:user_joined'   // Backend emits when user joins whiteboard
  | 'whiteboard:user_left'     // Backend emits when user leaves whiteboard
  | 'whiteboard:update';       // Backend emits when whiteboard is updated

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  channelId?: string;
  userId?: string;
  timestamp: number;
}

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ConnectionStateInfo {
  state: ConnectionState;
  isConnected: boolean;
}

export type EventCallback = (data: any) => void;

export interface RealTimeEvent {
  type: string;
  data: any;
}

export interface WebSocketEvent {
  type: WebSocketEventType;
  data: any;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read?: boolean;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
}

export interface TypingData {
  userId: string;
  channelId: string;
  isTyping: boolean;
  timestamp: string;
}

// WebSocket Service (Socket.IO Implementation)
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private token: string | null = null;
  private connectionStateCallbacks: Array<(state: ConnectionStateInfo) => void> = [];

  // Subscribe to connection state changes
  onConnectionStateChange(callback: (state: ConnectionStateInfo) => void): () => void {
    this.connectionStateCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.connectionStateCallbacks = this.connectionStateCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all subscribers of state change
  private notifyConnectionStateChange(): void {
    const state = this.getConnectionState();
    this.connectionStateCallbacks.forEach(callback => callback(state));
  }

  connect(token?: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const authToken = token || this.token || localStorage.getItem('auth_token') || '';
    if (token) {
      this.token = token;
    }

    console.log('🔌 Connecting to Socket.IO server...');

    // Create Socket.IO connection
    this.socket = io(API_CONFIG.baseUrl, {
      auth: {
        token: authToken
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Apply any pending listeners
    this.applyPendingListeners();

    // Socket.IO event handlers
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      this.reconnectAttempts = 0;
      this.notifyConnectionStateChange();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.notifyConnectionStateChange();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.notifyConnectionStateChange();
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}...`);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      this.notifyConnectionStateChange();
    });

    // Backend specific events
    this.socket.on('connection:success', (data) => {
      console.log('✅ Connection success:', data);
    });

    this.socket.on('connection:error', (error) => {
      console.error('❌ Connection error:', error);
    });

    // Notify initial state
    this.notifyConnectionStateChange();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket is not connected');
    }
  }

  // Store pending listeners that will be registered when socket connects
  private pendingListeners: Map<string, Set<(data: any) => void>> = new Map();

  on(event: WebSocketEventType | string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      // Queue listener for when socket connects
      if (!this.pendingListeners.has(event)) {
        this.pendingListeners.set(event, new Set());
      }
      this.pendingListeners.get(event)!.add(callback);
    }
  }

  off(event: WebSocketEventType | string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    // Also remove from pending listeners
    const pending = this.pendingListeners.get(event);
    if (pending) {
      pending.delete(callback);
    }
  }

  // Apply any pending listeners after socket is created
  private applyPendingListeners(): void {
    if (!this.socket) return;

    for (const [event, callbacks] of this.pendingListeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }
    this.pendingListeners.clear();
  }

  getConnectionState(): ConnectionStateInfo {
    const isConnected = this.socket?.connected ?? false;
    const state: ConnectionState = isConnected ? 'connected' :
                                    this.socket?.disconnected ? 'disconnected' :
                                    'connecting';

    return {
      state,
      isConnected
    };
  }

  reconnect(token?: string): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    if (token) {
      this.token = token;
    }
    this.connect(this.token || undefined);
  }

  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join:room', { room: roomId });
      console.log('Joining room:', roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave:room', { room: roomId });
      console.log('Leaving room:', roomId);
    }
  }

  joinWorkspace(workspaceId: string): void {
    if (this.socket?.connected) {
      console.log('🏢 [WebSocket] Emitting join:workspace for:', workspaceId);
      this.socket.emit('join:workspace', { workspaceId });

      // Listen for confirmation (one-time listener)
      this.socket.once('workspace:joined', (data) => {
        console.log('✅ [WebSocket] Successfully joined workspace room:', data);
      });

      // Listen for errors
      this.socket.once('error', (error) => {
        console.error('❌ [WebSocket] Error joining workspace:', error);
      });
    } else {
      console.warn('⚠️ [WebSocket] Cannot join workspace: Socket not connected');
    }
  }

  leaveWorkspace(workspaceId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave:workspace', { workspaceId });
      console.log('🏢 Leaving workspace:', workspaceId);
    }
  }

  sendMessage(channelId: string, content: string, type?: 'text' | 'image' | 'file', metadata?: any): void {
    if (this.socket?.connected) {
      this.socket.emit('message:send', {
        channelId,
        content,
        type: type || 'text',
        metadata
      });
    }
  }

  startTyping(channelId?: string, conversationId?: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { channelId, conversationId });
    }
  }

  stopTyping(channelId?: string, conversationId?: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { channelId, conversationId });
    }
  }

  addReaction(messageId: string, reaction: string): void {
    if (this.socket?.connected) {
      this.socket.emit('add_reaction', { messageId, emoji: reaction });
    }
  }

  removeReaction(messageId: string, reaction: string): void {
    if (this.socket?.connected) {
      this.socket.emit('remove_reaction', { messageId, emoji: reaction });
    }
  }

  updatePresence(status: 'online' | 'offline' | 'away' | 'busy', customMessage?: string): void {
    if (this.socket?.connected) {
      this.socket.emit('presence:update', { status, customMessage });
    }
  }

  subscribeToPresence(userIds: string | string[]): void {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (this.socket?.connected) {
      this.socket.emit('presence:subscribe', { userIds: ids });
    }
  }

  unsubscribeFromPresence(userIds?: string | string[]): void {
    if (this.socket?.connected) {
      if (!userIds) {
        this.socket.emit('presence:unsubscribe_all');
      } else {
        const ids = Array.isArray(userIds) ? userIds : [userIds];
        this.socket.emit('presence:unsubscribe', { userIds: ids });
      }
    }
  }

  markNotificationAsRead(notificationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:read', { notificationId });
    }
  }

  clearAllNotifications(): void {
    if (this.socket?.connected) {
      this.socket.emit('notification:clear_all');
    }
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
