/**
 * Presence Hook
 * Provides user presence functionality (online/offline status)
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { type UserPresence } from '@/lib/api/websocket-api';

export interface PresenceState {
  onlineUsers: UserPresence[];
  userStatus: Map<string, UserPresence>;
  isLoading: boolean;
}

export interface UsePresenceOptions {
  trackUsers?: string[];
  updateInterval?: number;
}

export const usePresence = (options: UsePresenceOptions = {}) => {
  const {
    trackUsers = [],
    updateInterval = 30000, // 30 seconds
  } = options;

  const {
    isConnected,
    onlineUsers,
    updatePresence,
    subscribeToPresence,
    unsubscribeFromPresence,
  } = useWebSocket();

  const [presenceState, setPresenceState] = useState<PresenceState>({
    onlineUsers: [],
    userStatus: new Map(),
    isLoading: false,
  });

  // Convert Map to array and update state
  useEffect(() => {
    const onlineUsersArray = Array.from(onlineUsers.values());
    setPresenceState(prev => ({
      ...prev,
      onlineUsers: onlineUsersArray,
      userStatus: onlineUsers,
    }));
  }, [onlineUsers]);

  // Subscribe to presence for specific users
  useEffect(() => {
    if (isConnected && trackUsers.length > 0) {
      subscribeToPresence(trackUsers);

      return () => {
        unsubscribeFromPresence(trackUsers);
      };
    }
  }, [isConnected, trackUsers, subscribeToPresence, unsubscribeFromPresence]);

  // Update own presence status
  const setStatus = useCallback((status: 'online' | 'away' | 'busy' | 'offline', customMessage?: string) => {
    updatePresence(status, customMessage);
  }, [updatePresence]);

  // Get status for a specific user
  const getUserStatus = useCallback((userId: string): UserPresence | null => {
    return presenceState.userStatus.get(userId) || null;
  }, [presenceState.userStatus]);

  // Check if user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    const status = getUserStatus(userId);
    return status?.status === 'online' || status?.status === 'away' || status?.status === 'busy';
  }, [getUserStatus]);

  // Get online users count
  const getOnlineCount = useCallback((): number => {
    return presenceState.onlineUsers.filter(user => 
      user.status === 'online' || user.status === 'away' || user.status === 'busy'
    ).length;
  }, [presenceState.onlineUsers]);

  // Get users by status
  const getUsersByStatus = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    return presenceState.onlineUsers.filter(user => user.status === status);
  }, [presenceState.onlineUsers]);

  // Handle page visibility changes
  useEffect(() => {
    if (!isConnected) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStatus('away');
      } else {
        setStatus('online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, setStatus]);

  // Handle mouse activity to update status
  useEffect(() => {
    if (!isConnected) return;

    let lastActivity = Date.now();
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      lastActivity = Date.now();
      
      // If user was away due to inactivity, set back to online
      if (getUserStatus('self')?.status === 'away') {
        setStatus('online');
      }
    };

    const checkInactivity = () => {
      const now = Date.now();
      const inactivityTime = now - lastActivity;
      
      // Set to away after 5 minutes of inactivity
      if (inactivityTime > 5 * 60 * 1000) {
        setStatus('away');
      }
    };

    // Set up activity listeners
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('touchstart', handleActivity);

    // Check inactivity periodically
    activityTimeout = setInterval(checkInactivity, updateInterval);

    return () => {
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('scroll', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
      clearInterval(activityTimeout);
    };
  }, [isConnected, setStatus, getUserStatus, updateInterval]);

  // Handle beforeunload to set offline
  useEffect(() => {
    if (!isConnected) return;

    const handleBeforeUnload = () => {
      setStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isConnected, setStatus]);

  // Set to online when first connected
  useEffect(() => {
    if (isConnected) {
      setStatus('online');
    }
  }, [isConnected, setStatus]);

  return {
    ...presenceState,
    setStatus,
    getUserStatus,
    isUserOnline,
    getOnlineCount,
    getUsersByStatus,
    isConnected,
  };
};