/**
 * WebSocket Context
 * Provides WebSocket service instance and connection state to components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { websocketService } from '@/lib/api/websocket-api';
import type {
  ConnectionState,
  ConnectionStateInfo,
  EventCallback,
  RealTimeEvent,
  WebSocketEvent,
  WebSocketEventType,
  NotificationData,
  UserPresence,
  TypingData
} from '@/lib/api/websocket-api';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { useLocation } from 'react-router-dom';

interface WebSocketContextType {
  // Connection state
  connectionState: ConnectionStateInfo;
  isConnected: boolean;

  // Socket instance (for WebRTC and other integrations)
  socket: typeof websocketService;

  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;

  // Event management
  on: (event: WebSocketEventType, callback: EventCallback) => void;
  off: (event: WebSocketEventType, callback: EventCallback) => void;

  // Room management
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;

  // Workspace management
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => void;

  // Chat features
  sendMessage: (channelId: string, content: string, type?: 'text' | 'image' | 'file', metadata?: any) => void;
  startTyping: (channelId?: string, conversationId?: string) => void;
  stopTyping: (channelId?: string, conversationId?: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, reactionId: string) => void;

  // Presence features
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline', customMessage?: string) => void;
  subscribeToPresence: (userIds: string[]) => void;
  unsubscribeFromPresence: (userIds?: string[]) => void;
  
  // Notification features
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Real-time data states
  onlineUsers: Map<string, UserPresence>;
  unreadNotifications: NotificationData[];
  typingUsers: Map<string, TypingData[]>; // channelId -> typing users
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const location = useLocation();
  const [connectionState, setConnectionState] = useState<ConnectionStateInfo>({
    state: 'disconnected',
    isConnected: false,
  });
  
  // Real-time data states
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationData[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingData[]>>(new Map());

  const isConnected = connectionState.isConnected;

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = websocketService.onConnectionStateChange((state) => {
      console.log('🔄 WebSocketContext: Connection state changed:', state);
      setConnectionState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Connection methods
  const connect = useCallback(async () => {
    if (!isAuthenticated || connectionState.isConnected) return;

    try {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('No auth token found for WebSocket connection');
        return;
      }

      console.log('🔌 WebSocketContext: Calling websocketService.connect()');
      // Connect - this will trigger state change callbacks we subscribed to above
      websocketService.connect(token);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionState(websocketService.getConnectionState());
    }
  }, [isAuthenticated, connectionState.isConnected]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setConnectionState(websocketService.getConnectionState());
    // Clear real-time data
    setOnlineUsers(new Map());
    setUnreadNotifications([]);
    setTypingUsers(new Map());
  }, []);

  const reconnect = useCallback(() => {
    websocketService.reconnect();
  }, []);

  // Event management
  const on = useCallback((event: WebSocketEventType, callback: EventCallback) => {
    websocketService.on(event, callback);
  }, []);

  const off = useCallback((event: WebSocketEventType, callback: EventCallback) => {
    websocketService.off(event, callback);
  }, []);

  // Room management
  const joinRoom = useCallback((room: string) => {
    websocketService.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    websocketService.leaveRoom(room);
  }, []);

  // Workspace management
  const joinWorkspace = useCallback((workspaceId: string) => {
    websocketService.joinWorkspace(workspaceId);
  }, []);

  const leaveWorkspace = useCallback((workspaceId: string) => {
    websocketService.leaveWorkspace(workspaceId);
  }, []);

  // Chat features
  const sendMessage = useCallback((channelId: string, content: string, type?: 'text' | 'image' | 'file', metadata?: any) => {
    websocketService.sendMessage(channelId, content, type, metadata);
  }, []);

  const startTyping = useCallback((channelId?: string, conversationId?: string) => {
    websocketService.startTyping(channelId, conversationId);
  }, []);

  const stopTyping = useCallback((channelId?: string, conversationId?: string) => {
    websocketService.stopTyping(channelId, conversationId);
  }, []);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    websocketService.addReaction(messageId, emoji);
  }, []);

  const removeReaction = useCallback((messageId: string, reactionId: string) => {
    websocketService.removeReaction(messageId, reactionId);
  }, []);

  // Presence features
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'offline', customMessage?: string) => {
    websocketService.updatePresence(status, customMessage);
  }, []);

  const subscribeToPresence = useCallback((userIds: string[]) => {
    websocketService.subscribeToPresence(userIds);
  }, []);

  const unsubscribeFromPresence = useCallback((userIds?: string[]) => {
    websocketService.unsubscribeFromPresence(userIds);
  }, []);

  // Notification features
  const markNotificationAsRead = useCallback((notificationId: string) => {
    websocketService.markNotificationAsRead(notificationId);
  }, []);

  const clearAllNotifications = useCallback(() => {
    websocketService.clearAllNotifications();
  }, []);

  // Setup connection state listeners IMMEDIATELY (before connection)
  useEffect(() => {
    // Connection state listeners must be registered BEFORE connecting
    const handleConnect = () => {
      console.log('✅ WebSocket Context: Connected event received');
      const newState = websocketService.getConnectionState();
      console.log('✅ WebSocket Context: New connection state:', newState);
      setConnectionState(newState);
    };

    const handleDisconnect = () => {
      console.log('❌ WebSocket Context: Disconnected event received');
      setConnectionState(websocketService.getConnectionState());
    };

    const handleReconnect = () => {
      console.log('🔄 WebSocket Context: Reconnect event received');
      setConnectionState(websocketService.getConnectionState());
    };

    // Register connection state listeners immediately
    websocketService.on('connect', handleConnect);
    websocketService.on('disconnect', handleDisconnect);
    websocketService.on('reconnect', handleReconnect);

    // Cleanup
    return () => {
      websocketService.off('connect', handleConnect);
      websocketService.off('disconnect', handleDisconnect);
      websocketService.off('reconnect', handleReconnect);
    };
  }, []); // Run once on mount

  // Setup other event listeners only when connected
  useEffect(() => {
    if (!isConnected) return;

    // Presence listeners
    const handleUserOnline = (data: UserPresence) => {
      setOnlineUsers(prev => new Map(prev.set(data.userId, data)));
    };

    const handleUserOffline = (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };

    const handleUserStatusChanged = (data: UserPresence) => {
      setOnlineUsers(prev => new Map(prev.set(data.userId, data)));
    };

    // Notification listeners
    const handleNotificationReceived = (data: NotificationData) => {
      if (!data.read) {
        setUnreadNotifications(prev => [...prev, data]);
      }
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      setUnreadNotifications(prev => prev.filter(n => n.id !== data.notificationId));
    };

    const handleNotificationCleared = () => {
      setUnreadNotifications([]);
    };

    // Typing indicators listeners
    const handleTypingStart = (data: TypingData) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const channelTypers = newMap.get(data.channelId) || [];
        const updatedTypers = channelTypers.filter(t => t.userId !== data.userId);
        updatedTypers.push(data);
        newMap.set(data.channelId, updatedTypers);
        return newMap;
      });
    };

    const handleTypingStop = (data: { channelId: string; userId: string }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const channelTypers = newMap.get(data.channelId) || [];
        const updatedTypers = channelTypers.filter(t => t.userId !== data.userId);
        if (updatedTypers.length === 0) {
          newMap.delete(data.channelId);
        } else {
          newMap.set(data.channelId, updatedTypers);
        }
        return newMap;
      });
    };

    // Register event listeners (connect/disconnect/reconnect handled in separate useEffect)
    // Backend event (presence:updated)
    websocketService.on('presence:updated', handleUserStatusChanged);

    // Legacy events for backward compatibility
    websocketService.on('user_online', handleUserOnline);
    websocketService.on('user_offline', handleUserOffline);
    websocketService.on('user_status_changed', handleUserStatusChanged);

    websocketService.on('notification_received', handleNotificationReceived);
    websocketService.on('notification_read', handleNotificationRead);
    websocketService.on('notification_cleared', handleNotificationCleared);
    websocketService.on('typing_start', handleTypingStart);
    websocketService.on('typing_stop', handleTypingStop);

    // Cleanup on unmount or disconnection
    return () => {
      // Note: connect/disconnect/reconnect are handled in separate useEffect
      websocketService.off('presence:updated', handleUserStatusChanged);
      websocketService.off('user_online', handleUserOnline);
      websocketService.off('user_offline', handleUserOffline);
      websocketService.off('user_status_changed', handleUserStatusChanged);
      websocketService.off('notification_received', handleNotificationReceived);
      websocketService.off('notification_read', handleNotificationRead);
      websocketService.off('notification_cleared', handleNotificationCleared);
      websocketService.off('typing_start', handleTypingStart);
      websocketService.off('typing_stop', handleTypingStop);
    };
  }, [isConnected]);

  // Auto-connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated && !isConnected && connectionState.state !== 'connecting') {
      connect();
    } else if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [isAuthenticated, isConnected, connectionState.state, connect, disconnect]);

  // Set user presence to online when connected and user is available
  useEffect(() => {
    if (isConnected && user) {
      updatePresence('online');
    }
  }, [isConnected, user, updatePresence]);

  // Handle page visibility changes for presence
  useEffect(() => {
    if (!isConnected || !user) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, user, updatePresence]);

  // Handle beforeunload to set user offline
  useEffect(() => {
    if (!isConnected || !user) return;

    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isConnected, user, updatePresence]);

  // Clean up typing indicators after timeout
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const typingTimeout = 5000; // 5 seconds

      setTypingUsers(prev => {
        let hasChanges = false;
        const newMap = new Map();

        for (const [channelId, typers] of prev) {
          const activeTypers = typers.filter(typer => {
            const typingTime = new Date(typer.timestamp).getTime();
            return now - typingTime < typingTimeout;
          });

          if (activeTypers.length !== typers.length) {
            hasChanges = true;
          }

          if (activeTypers.length > 0) {
            newMap.set(channelId, activeTypers);
          }
        }

        // Only return new Map if there were actual changes
        // This prevents unnecessary re-renders
        return hasChanges ? newMap : prev;
      });
    }, 1000); // Check every second

    return () => clearInterval(cleanupInterval);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }, []);

  // Auto-join workspace when connected and workspace is selected
  useEffect(() => {
    if (isConnected && currentWorkspace?.id) {
      console.log('🏢 WebSocketContext: Auto-joining workspace:', currentWorkspace.id);
      joinWorkspace(currentWorkspace.id);
    }
  }, [isConnected, currentWorkspace?.id, joinWorkspace]);

  // Use ref to track current location without causing re-renders
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Global workspace notification listener - works on ALL pages
  useEffect(() => {
    if (!isConnected || !currentWorkspace?.id) {
      return;
    }

    const handleWorkspaceNotification = (data: any) => {
      const currentPath = locationRef.current;
      console.log('🔔 [WebSocketContext] message:new:workspace event received!', {
        hasMessage: !!data.message,
        hasConversationId: !!data.conversation_id,
        hasChannelId: !!data.channel_id,
        type: data.type,
        currentPath,
        fullData: data
      });

      if (!data.message) {
        console.warn('⚠️ No message data in workspace notification');
        return;
      }

      // Check if user is on the chat page - DON'T show notification if they are
      const isOnChatPage = currentPath.includes('/chat');

      console.log('🔍 Notification check:', {
        isOnChatPage,
        currentPath,
        willShow: !isOnChatPage
      });

      if (isOnChatPage) {
        console.log('🚫 User is on chat page - skipping notification');
        return;
      }

      // Note: Toast notification is handled by NotificationBell via notification:event
      // This event (message:new:workspace) is only used for real-time UI updates (e.g., sidebar unread counts)
      // The database notification system (notificationsService.sendNotification) already triggers the toast
      console.log('✅ Workspace message received - toast handled by NotificationBell', {
        conversation_id: data.conversation_id,
        channel_id: data.channel_id,
        sender: data.message.user?.name
      });
    };

    // Listen for workspace delete events
    const handleWorkspaceDelete = (data: any) => {
      console.log('🗑️ [WebSocketContext] message:deleted:workspace event received!', data);
    };

    // Listen for workspace update events
    const handleWorkspaceUpdate = (data: any) => {
      console.log('✏️ [WebSocketContext] message:updated:workspace event received!', data);
    };

    console.log('🔔 [WebSocketContext] Registering global workspace notification listeners');
    websocketService.on('message:new:workspace', handleWorkspaceNotification);
    websocketService.on('message:deleted:workspace', handleWorkspaceDelete);
    websocketService.on('message:updated:workspace', handleWorkspaceUpdate);

    return () => {
      console.log('🔔 [WebSocketContext] Removing global workspace notification listeners');
      websocketService.off('message:new:workspace', handleWorkspaceNotification);
      websocketService.off('message:deleted:workspace', handleWorkspaceDelete);
      websocketService.off('message:updated:workspace', handleWorkspaceUpdate);
    };
  }, [isConnected, currentWorkspace?.id]);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value: WebSocketContextType = useMemo(() => ({
    // Connection state
    connectionState,
    isConnected,
    socket: websocketService, // Expose socket instance for WebRTC

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Event management
    on,
    off,

    // Room management
    joinRoom,
    leaveRoom,

    // Workspace management
    joinWorkspace,
    leaveWorkspace,

    // Chat features
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,

    // Presence features
    updatePresence,
    subscribeToPresence,
    unsubscribeFromPresence,

    // Notification features
    markNotificationAsRead,
    clearAllNotifications,

    // Real-time data states
    onlineUsers,
    unreadNotifications,
    typingUsers,
  }), [
    connectionState,
    isConnected,
    connect,
    disconnect,
    reconnect,
    on,
    off,
    joinRoom,
    leaveRoom,
    joinWorkspace,
    leaveWorkspace,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    updatePresence,
    subscribeToPresence,
    unsubscribeFromPresence,
    markNotificationAsRead,
    clearAllNotifications,
    onlineUsers,
    unreadNotifications,
    typingUsers,
  ]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;