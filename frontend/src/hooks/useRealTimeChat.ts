/**
 * Real-time Chat Hook
 * Provides real-time chat functionality for components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { chatService, type Message, type SendMessageRequest } from '@/lib/api/chat-api';
import { decryptMessageIfNeeded } from '@/lib/crypto';

export interface ChatMessage extends Message {
  isOptimistic?: boolean;
  tempId?: string;
  type?: 'text' | 'image' | 'file';
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

export interface UseRealTimeChatOptions {
  channelId: string;
  initialLoad?: boolean;
  pageSize?: number;
}

export const useRealTimeChat = ({ channelId, initialLoad = true, pageSize = 50 }: UseRealTimeChatOptions) => {
  const { 
    isConnected, 
    joinRoom, 
    leaveRoom, 
    on, 
    off, 
    sendMessage: wsendMessage,
    startTyping: wstartTyping,
    stopTyping: wstopTyping,
    addReaction: waddReaction,
    removeReaction: wremoveReaction,
    typingUsers
  } = useWebSocket();

  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    hasMore: true,
    error: null,
  });

  const currentChannelRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync messages state with ref for event handlers
  useEffect(() => {
    messagesRef.current = chatState.messages;
  }, [chatState.messages]);

  // Load initial messages
  const loadMessages = useCallback(async (cursor?: string, append = false) => {
    if (!channelId) return;

    try {
      setChatState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await chatService.getMessages(channelId, {
        limit: pageSize,
        cursor,
      });

      const newMessages = response.data || [];
      
      setChatState(prev => ({
        ...prev,
        messages: append ? [...newMessages.reverse(), ...prev.messages] : newMessages.reverse(),
        isLoading: false,
        hasMore: newMessages.length === pageSize,
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load messages',
      }));
    }
  }, [channelId, pageSize]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (chatState.isLoading || !chatState.hasMore || messagesRef.current.length === 0) return;

    const oldestMessage = messagesRef.current[0];
    if (oldestMessage && !oldestMessage.isOptimistic) {
      await loadMessages(oldestMessage.createdAt, true);
    }
  }, [chatState.isLoading, chatState.hasMore, loadMessages]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text', attachments?: File[]) => {
    if (!content.trim() || !channelId) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      tempId,
      channelId,
      userId: '', // Will be filled by server
      content,
      type,
      isOptimistic: true,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: '',
        name: 'You',
        avatar: '',
      },
    };

    // Add optimistic message
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, optimisticMessage],
    }));

    try {
      // Send via WebSocket for real-time delivery
      if (isConnected) {
        wsendMessage(channelId, content, type, { tempId });
      } else {
        // Fallback to REST API
        const sentMessage = await chatService.sendMessage(channelId, {
          content,
          attachments,
        });

        // Replace optimistic message with actual message
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(msg => 
            msg.tempId === tempId ? { ...sentMessage, isOptimistic: false } : msg
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove failed optimistic message
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.tempId !== tempId),
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
    }
  }, [channelId, isConnected, wsendMessage]);

  // Start typing with auto-stop
  const startTyping = useCallback(() => {
    if (!channelId || !isConnected) return;

    wstartTyping(channelId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      wstopTyping(channelId);
    }, 3000);
  }, [channelId, isConnected, wstartTyping, wstopTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (!channelId || !isConnected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    wstopTyping(channelId);
  }, [channelId, isConnected, wstopTyping]);

  // Add reaction (WebSocket only for real-time)
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      if (isConnected) {
        waddReaction(messageId, emoji);
      } else {
        console.warn('WebSocket not connected, reaction not sent');
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [isConnected, waddReaction]);

  // Remove reaction (WebSocket only for real-time)
  const removeReaction = useCallback(async (messageId: string, reactionId: string) => {
    try {
      if (isConnected) {
        wremoveReaction(messageId, reactionId);
      } else {
        console.warn('WebSocket not connected, reaction not removed');
      }
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  }, [isConnected, wremoveReaction]);

  // Real-time event handlers
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const handleMessageCreated = async (message: Message) => {
      if (message.channelId !== channelId) return;

      // Decrypt message if encrypted
      const decryptedMessage = await decryptMessageIfNeeded(message);

      setChatState(prev => {
        // Check if this message replaces an optimistic one
        const tempMessage = prev.messages.find(msg =>
          msg.isOptimistic && msg.content === decryptedMessage.content
        );

        if (tempMessage) {
          // Replace optimistic message
          return {
            ...prev,
            messages: prev.messages.map(msg =>
              msg.tempId === tempMessage.tempId ? { ...decryptedMessage, isOptimistic: false } : msg
            ),
          };
        }

        // Check if message already exists
        const exists = prev.messages.some(msg => msg.id === decryptedMessage.id);
        if (exists) return prev;

        // Add new message
        return {
          ...prev,
          messages: [...prev.messages, decryptedMessage],
        };
      });
    };

    const handleMessageUpdated = async (message: Message) => {
      if (message.channelId !== channelId) return;

      // Decrypt message if encrypted
      const decryptedMessage = await decryptMessageIfNeeded(message);

      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === decryptedMessage.id ? { ...decryptedMessage, isOptimistic: false } : msg
        ),
      }));
    };

    const handleMessageDeleted = (data: { messageId: string; channelId: string }) => {
      if (data.channelId !== channelId) return;

      setChatState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== data.messageId),
      }));
    };

    const handleReactionAdded = (data: { messageId: string; reaction: any }) => {
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => {
          if (msg.id === data.messageId) {
            const reactions = [...(msg.reactions || [])];
            reactions.push(data.reaction);
            return { ...msg, reactions };
          }
          return msg;
        }),
      }));
    };

    const handleReactionRemoved = (data: { messageId: string; reactionId: string }) => {
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg => {
          if (msg.id === data.messageId) {
            const reactions = (msg.reactions || []).filter(r => r.id !== data.reactionId);
            return { ...msg, reactions };
          }
          return msg;
        }),
      }));
    };

    // Register event listeners
    on('message_created', handleMessageCreated);
    on('message_updated', handleMessageUpdated);
    on('message_deleted', handleMessageDeleted);
    on('reaction_added', handleReactionAdded);
    on('reaction_removed', handleReactionRemoved);

    return () => {
      off('message_created', handleMessageCreated);
      off('message_updated', handleMessageUpdated);
      off('message_deleted', handleMessageDeleted);
      off('reaction_added', handleReactionAdded);
      off('reaction_removed', handleReactionRemoved);
    };
  }, [isConnected, channelId, on, off]);

  // Join/leave room when channel changes
  useEffect(() => {
    if (!isConnected || !channelId) return;

    // Leave previous room
    if (currentChannelRef.current && currentChannelRef.current !== channelId) {
      leaveRoom(`channel:${currentChannelRef.current}`);
    }

    // Join new room
    joinRoom(`channel:${channelId}`);
    currentChannelRef.current = channelId;

    // Load initial messages
    if (initialLoad) {
      loadMessages();
    }

    return () => {
      if (currentChannelRef.current) {
        leaveRoom(`channel:${currentChannelRef.current}`);
        currentChannelRef.current = null;
      }
    };
  }, [isConnected, channelId, joinRoom, leaveRoom, initialLoad, loadMessages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Get typing users for current channel
  const currentTypingUsers = channelId ? typingUsers.get(channelId) || [] : [];

  return {
    ...chatState,
    sendMessage,
    loadMoreMessages,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    typingUsers: currentTypingUsers,
    isConnected,
  };
};