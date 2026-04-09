// src/lib/api/chat-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/stores/chatStore';
import { encryptionService, decryptMessages, shareConversationKey, retrieveConversationKey } from '@/lib/crypto';

// Types
export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: 'channel' | 'dm';
  is_private: boolean;
  is_archived: boolean;
  created_by: string;
  collaborative_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Client-side fields (optional)
  members?: string[];
  unreadCount?: number;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  attachments?: MessageAttachment[];
  parentId?: string;
  edited?: boolean;
  editedAt?: string;
  reactions?: MessageReaction[];
  is_bookmarked?: boolean;
  bookmarked_at?: string;
  bookmarked_by?: string;
  is_pinned?: boolean;
  pinned_at?: string;
  pinned_by?: string;
  read_by_count?: number;
  read_receipts?: MessageReadReceipt[];
  // E2EE fields
  encrypted_content?: string;
  encryption_metadata?: {
    algorithm: string;
    version: string;
    nonce: string;
    conversationId: string;
  };
  is_encrypted?: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    avatarUrl?: string;
  };
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface MessageAttachment {
  id: string;
  filename?: string;
  fileName: string; // Backend format (required)
  size?: number;
  fileSize: string; // Backend format (as string, required)
  mimeType: string;
  url: string;
}

export interface MessageReaction {
  id?: string;
  emoji: string;
  users: string[];
  userId?: string; // User who added the reaction
}

// Poll types
export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  isOpen: boolean;
  showResultsBeforeVoting: boolean;
  createdBy: string;
  totalVotes: number;
  userVotedOptionId?: string; // Which option the current user voted for
}

// Scheduled message types
export type ScheduledMessageStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

export interface ScheduledMessage {
  id: string;
  workspaceId: string;
  channelId: string | null;
  conversationId: string | null;
  userId: string;
  content: string;
  contentHtml: string | null;
  attachments: MessageAttachment[];
  mentions: string[];
  linkedContent: LinkedContent[];
  threadId: string | null;
  parentId: string | null;
  scheduledAt: string;
  status: ScheduledMessageStatus;
  sentAt: string | null;
  sentMessageId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  destinationName?: string;
  destinationType?: 'channel' | 'conversation';
}

export interface ScheduleMessageRequest {
  content: string;
  contentHtml?: string;
  channelId?: string;
  conversationId?: string;
  threadId?: string;
  parentId?: string;
  attachments?: MessageAttachment[];
  mentions?: string[];
  linkedContent?: LinkedContent[];
  scheduledAt: string;
}

export interface UpdateScheduledMessageRequest {
  content?: string;
  contentHtml?: string;
  scheduledAt?: string;
  attachments?: MessageAttachment[];
  mentions?: string[];
  linkedContent?: LinkedContent[];
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  type: 'channel' | 'dm';
  is_private: boolean;
  member_ids?: string[];
}

export interface SendMessageRequest {
  content: string;
  attachments?: File[];
  parentId?: string;
}

export interface UpdateMessageRequest {
  content: string;
}

// Conversation types for DMs
export interface Conversation {
  id: string;
  workspace_id: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  participants: string[];
  created_by: string;
  is_active: boolean;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  last_message_at: string | null;
  message_count: number;
  settings: Record<string, any>;
  collaborative_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Starred fields (per-user)
  isStarred?: boolean;
  starredAt?: string | null;
  // Client-side computed fields
  otherUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    status?: 'online' | 'offline' | 'away' | 'busy';
  };
  unreadCount?: number;
}

// Channel member types
export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    status?: 'online' | 'offline' | 'away' | 'busy';
  };
}

// Linked content item (notes, events, files, drive files, polls attached to message)
export interface LinkedContent {
  id: string;
  title: string;
  type: 'notes' | 'events' | 'files' | 'drive' | 'poll';
  subtitle?: string;
  // Drive-specific fields
  driveFileUrl?: string;
  driveThumbnailUrl?: string;
  driveMimeType?: string;
  driveFileSize?: number;
  // Poll-specific fields
  poll?: Poll;
}

// SendMessageData type for sending messages
export interface SendMessageData {
  content: string;
  content_html?: string; // HTML formatted content (for rich text, images, GIFs)
  type?: 'text' | 'file' | 'image';
  parentId?: string;
  threadId?: string;
  attachments?: MessageAttachment[];
  mentions?: string[];
  linked_content?: LinkedContent[];
}

// Search channel result
export interface SearchChannelResult {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  is_member: boolean;
}

// Query Keys
export const chatKeys = {
  all: ['chat'] as const,
  channels: () => [...chatKeys.all, 'channels'] as const,
  channel: (id: string) => [...chatKeys.channels(), id] as const,
  messages: (channelId: string) => [...chatKeys.channel(channelId), 'messages'] as const,
  message: (channelId: string, messageId: string) => [...chatKeys.messages(channelId), messageId] as const,
  threads: (messageId: string) => [...chatKeys.all, 'threads', messageId] as const,
  directMessages: () => [...chatKeys.all, 'direct'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...chatKeys.conversations(), id] as const,
  conversationMessages: (conversationId: string) => [...chatKeys.conversation(conversationId), 'messages'] as const,
  channelMembers: (channelId: string) => [...chatKeys.channel(channelId), 'members'] as const,
  conversationMembers: (conversationId: string) => [...chatKeys.conversation(conversationId), 'members'] as const,
};

// API Functions
export const chatApi = {
  // Channels
  async getChannels(workspaceId: string): Promise<Channel[]> {
    const response = await api.get<{ data: Channel[] }>(`/workspaces/${workspaceId}/channels`);
    return response.data || [];
  },

  async getChannel(channelId: string): Promise<Channel> {
    return api.get<Channel>(`/channels/${channelId}`);
  },

  async searchChannels(workspaceId: string, name: string): Promise<SearchChannelResult[]> {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    return api.get<SearchChannelResult[]>(`/workspaces/${workspaceId}/channels/search-private?${params}`);
  },

  async createChannel(workspaceId: string, data: CreateChannelRequest): Promise<Channel> {
    return api.post<Channel>(`/workspaces/${workspaceId}/channels`, data);
  },

  async updateChannel(workspaceId: string, channelId: string, data: Partial<CreateChannelRequest>): Promise<Channel> {
    return api.put<Channel>(`/workspaces/${workspaceId}/channels/${channelId}`, data);
  },

  async deleteChannel(workspaceId: string, channelId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
  },

  async joinChannel(channelId: string): Promise<void> {
    await api.post(`/channels/${channelId}/join`, null);
  },

  // Workspace-scoped join channel
  async joinChannelWorkspace(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/join`, null);
  },

  async leaveChannel(channelId: string): Promise<void> {
    await api.post(`/channels/${channelId}/leave`, null);
  },

  // Workspace-scoped leave channel
  async leaveChannelWorkspace(workspaceId: string, channelId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/leave`, null);
  },

  // Messages
  async getMessages(channelId: string, options?: { cursor?: string; limit?: number } | string, limit?: number): Promise<{
    data?: Message[];
    messages?: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const params = new URLSearchParams();

    // Handle both legacy (cursor, limit) and new ({ cursor, limit }) formats
    if (typeof options === 'string') {
      if (options) params.append('cursor', options);
      if (limit) params.append('limit', limit.toString());
    } else if (options) {
      if (options.cursor) params.append('cursor', options.cursor);
      if (options.limit) params.append('limit', options.limit.toString());
    }

    const result = await api.get<{
      messages: Message[];
      hasMore: boolean;
      nextCursor?: string;
    }>(`/channels/${channelId}/messages?${params}`);

    // Return with both 'data' and 'messages' for backward compatibility
    return {
      data: result.messages,
      messages: result.messages,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor
    };
  },

  // Workspace-scoped channel messages
  async getChannelMessages(workspaceId: string, channelId: string, options?: { cursor?: string; limit?: number; offset?: number }): Promise<{
    data: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const params = new URLSearchParams();
    if (options?.cursor) params.append('cursor', options.cursor);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const result = await api.get<Message[]>(`/workspaces/${workspaceId}/channels/${channelId}/messages?${params}`);

    // Backend returns array directly
    const messages = Array.isArray(result) ? result : [];

    // Decrypt encrypted messages
    const decryptedMessages = await decryptMessages(messages);

    return {
      data: decryptedMessages,
      hasMore: false, // TODO: Implement proper pagination
      nextCursor: undefined
    };
  },

  async sendMessage(channelId: string, data: SendMessageRequest): Promise<Message> {
    const formData = new FormData();
    formData.append('content', data.content);
    if (data.parentId) formData.append('parentId', data.parentId);

    // Handle file attachments
    if (data.attachments) {
      data.attachments.forEach(file => {
        formData.append('attachments', file);
      });
    }

    // Don't set Content-Type header - let axios auto-detect FormData and add boundary
    const response = await api.post<Message>(`/channels/${channelId}/messages`, formData);

    return response;
  },

  // Workspace-scoped send channel message
  async sendChannelMessage(workspaceId: string, channelId: string, data: SendMessageData): Promise<Message> {
    // Check if E2EE is enabled and initialized
    const useEncryption = encryptionService.isInitialized();

    let payload: any = {};

    if (useEncryption) {
      try {
        // Determine what to encrypt: prefer content_html if available, fallback to content
        const contentToEncrypt = data.content_html || data.content;

        // Encrypt the message content
        const encrypted = await encryptionService.encryptMessage(channelId, contentToEncrypt);

        payload = {
          encrypted_content: encrypted.encryptedContent,
          encryption_metadata: encrypted.encryptionMetadata,
          is_encrypted: true,
          content: '', // Empty content for encrypted messages
          content_html: '', // Empty HTML content for encrypted messages
        };
      } catch (error) {
        console.error('Encryption failed, sending plaintext:', error);
        // Fallback to plaintext if encryption fails
        payload = {
          content: data.content,
          content_html: data.content_html,
          is_encrypted: false,
        };
      }
    } else {
      // Send plaintext if encryption not initialized
      payload = {
        content: data.content,
        content_html: data.content_html,
        is_encrypted: false,
      };
    }

    // Note: content_html already set above based on encryption status

    // Add optional fields
    if (data.parentId) payload.parent_id = data.parentId;
    if (data.threadId) payload.thread_id = data.threadId;
    if (data.attachments && data.attachments.length > 0) {
      payload.attachments = data.attachments;
    }
    if (data.mentions && data.mentions.length > 0) {
      payload.mentions = data.mentions;
    }
    if (data.linked_content && data.linked_content.length > 0) {
      payload.linked_content = data.linked_content;
    }

    return api.post<Message>(`/workspaces/${workspaceId}/channels/${channelId}/messages`, payload);
  },

  async updateMessage(workspaceId: string, messageId: string, data: UpdateMessageRequest): Promise<Message> {
    return api.patch<Message>(`/workspaces/${workspaceId}/messages/${messageId}`, data);
  },

  async deleteMessage(workspaceId: string, messageId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/messages/${messageId}`);
  },

  async addReaction(workspaceId: string, messageId: string, emoji: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  },

  async removeReaction(workspaceId: string, messageId: string, emoji: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
  },

  // Thread messages
  async getThreadMessages(parentId: string): Promise<Message[]> {
    return api.get<Message[]>(`/messages/${parentId}/thread`);
  },

  // Direct messages
  async getDirectChannels(workspaceId: string): Promise<Channel[]> {
    return api.get<Channel[]>(`/workspaces/${workspaceId}/channels/direct`);
  },

  async createDirectChannel(workspaceId: string, userId: string): Promise<Channel> {
    return api.post<Channel>(`/workspaces/${workspaceId}/channels/direct`, { userId });
  },

  // Typing indicators
  async sendTypingIndicator(channelId: string): Promise<void> {
    await api.post(`/channels/${channelId}/typing`, null);
  },

  // Mark as read (legacy - keeping for backward compatibility)
  async markChannelAsRead(channelId: string, lastReadMessageId: string): Promise<void> {
    await api.post(`/channels/${channelId}/read`, { lastReadMessageId });
  },

  // Workspace-scoped read tracking
  async markChannelAsReadWorkspace(workspaceId: string, channelId: string, lastReadMessageId?: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/read`, { lastReadMessageId });
  },

  async getChannelUnreadCount(workspaceId: string, channelId: string): Promise<number> {
    const result = await api.get<{ count: number }>(`/workspaces/${workspaceId}/channels/${channelId}/unread-count`);
    return result.count;
  },

  async markConversationAsRead(workspaceId: string, conversationId: string, lastReadMessageId?: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/conversations/${conversationId}/read`, { lastReadMessageId });
  },

  async getConversationUnreadCount(workspaceId: string, conversationId: string): Promise<number> {
    const result = await api.get<{ count: number }>(`/workspaces/${workspaceId}/conversations/${conversationId}/unread-count`);
    return result.count;
  },

  // Conversations (DM)
  async getConversations(workspaceId: string): Promise<Conversation[]> {
    const response = await api.get<{ data: Conversation[] }>(`/workspaces/${workspaceId}/conversations`);
    return response.data || [];
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    return api.get<Conversation>(`/conversations/${conversationId}`);
  },

  async createConversation(workspaceId: string, participantIds: string[]): Promise<Conversation> {
    return api.post<Conversation>(`/workspaces/${workspaceId}/conversations`, { participants: participantIds });
  },

  async getConversationMessages(workspaceId: string, conversationId: string, options?: { limit?: number; offset?: number }): Promise<{
    data: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const result = await api.get<Message[]>(`/workspaces/${workspaceId}/conversations/${conversationId}/messages?${params}`);

    // Backend returns array directly, not wrapped object
    const messages = Array.isArray(result) ? result : [];

    // Check if any messages are encrypted
    const hasEncryptedMessages = messages.some((m: any) => m.is_encrypted);
    const hasConversationKey = encryptionService.hasConversationKey(conversationId);

    console.log('🔍 Message check - encrypted:', hasEncryptedMessages, 'hasKey:', hasConversationKey);

    if (hasEncryptedMessages) {
      // ALWAYS try to retrieve the conversation key from server
      // Even if we think we have it locally (might be wrong key)
      console.log('🔑 ⚠️ ENCRYPTED MESSAGES DETECTED - RETRIEVING KEY FROM SERVER...');
      try {
        const keyRetrieved = await retrieveConversationKey(conversationId);
        console.log('🔑 Key retrieval result:', keyRetrieved ? 'SUCCESS' : 'FAILED');

        if (!keyRetrieved && !hasConversationKey) {
          console.error('❌ CRITICAL: Could not retrieve conversation key from server!');
        }
      } catch (error) {
        console.error('❌ CRITICAL: Failed to retrieve conversation key:', error);
      }
    } else {
      console.log('ℹ️ No encrypted messages in this conversation');
    }

    // Decrypt encrypted messages
    const decryptedMessages = await decryptMessages(messages);

    return {
      data: decryptedMessages,
      hasMore: false, // TODO: Implement proper pagination
      nextCursor: undefined
    };
  },

  async sendConversationMessage(workspaceId: string, conversationId: string, data: SendMessageData): Promise<Message> {
    // Check if E2EE is enabled and initialized
    const useEncryption = encryptionService.isInitialized();

    let payload: any = {};

    if (useEncryption) {
      try {
        // Determine what to encrypt: prefer content_html if available, fallback to content
        const contentToEncrypt = data.content_html || data.content;

        // Encrypt the message content (this generates conversation key if needed)
        const encrypted = await encryptionService.encryptMessage(conversationId, contentToEncrypt);

        // Check if we just generated a new conversation key
        // If so, share it with all participants
        const conversationKey = encryptionService.getConversationKey(conversationId);

        // Get conversation members to share key
        const members = await chatApi.getConversationMembers(workspaceId, conversationId);
        const participantIds = members
          .map(m => m.userId)
          .filter(id => id !== encryptionService.getCurrentUserId());

        if (participantIds.length > 0 && conversationKey) {
          console.log('🔑 Sharing conversation key with', participantIds.length, 'participants');
          try {
            await shareConversationKey(conversationId, participantIds);
          } catch (error) {
            console.error('⚠️ Failed to share conversation key, but message will still send:', error);
            // Don't throw - message is already encrypted and will be sent
          }
        }

        payload = {
          encrypted_content: encrypted.encryptedContent,
          encryption_metadata: encrypted.encryptionMetadata,
          is_encrypted: true,
          content: '', // Empty content for encrypted messages
          content_html: '', // Empty HTML content for encrypted messages
        };
      } catch (error) {
        console.error('Encryption failed, sending plaintext:', error);
        // Fallback to plaintext if encryption fails
        payload = {
          content: data.content,
          content_html: data.content_html,
          is_encrypted: false,
        };
      }
    } else {
      // Send plaintext if encryption not initialized
      payload = {
        content: data.content,
        content_html: data.content_html,
        is_encrypted: false,
      };
    }

    // Note: content_html already set above based on encryption status

    // Add optional fields
    if (data.parentId) payload.parent_id = data.parentId;
    if (data.threadId) payload.thread_id = data.threadId;
    if (data.attachments && data.attachments.length > 0) {
      payload.attachments = data.attachments;
    }
    if (data.mentions && data.mentions.length > 0) {
      payload.mentions = data.mentions;
    }
    if (data.linked_content && data.linked_content.length > 0) {
      payload.linked_content = data.linked_content;
    }

    return api.post<Message>(`/workspaces/${workspaceId}/conversations/${conversationId}/messages`, payload);
  },

  // Channel Members
  async getChannelMembers(workspaceId: string, channelId: string): Promise<ChannelMember[]> {
    const response = await api.get<any[]>(`/workspaces/${workspaceId}/channels/${channelId}/members`);

    // Transform backend response (snake_case) to frontend format (camelCase)
    return response.map((member: any) => ({
      id: member.id || `${channelId}-${member.user_id}`, // Generate ID if not present
      channelId: channelId,
      userId: member.user_id,
      role: member.role || 'member',
      joinedAt: member.joined_at || new Date().toISOString(),
      user: {
        id: member.user_id,
        name: member.name || 'Unknown User',
        email: member.email || '',
        avatarUrl: member.avatar || undefined,
        status: 'offline' as const,
      }
    }));
  },

  async addChannelMember(channelId: string, userId: string, role: 'admin' | 'moderator' | 'member' = 'member'): Promise<ChannelMember> {
    return api.post<ChannelMember>(`/channels/${channelId}/members`, { userId, role });
  },

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await api.delete(`/channels/${channelId}/members/${userId}`);
  },

  async updateChannelMemberRole(channelId: string, userId: string, role: 'admin' | 'moderator' | 'member'): Promise<ChannelMember> {
    return api.patch<ChannelMember>(`/channels/${channelId}/members/${userId}`, { role });
  },

  // Conversation Members
  async getConversationMembers(workspaceId: string, conversationId: string): Promise<ChannelMember[]> {
    return api.get<ChannelMember[]>(`/workspaces/${workspaceId}/conversations/${conversationId}/members`);
  },

  // Bookmark operations
  async bookmarkMessage(workspaceId: string, messageId: string): Promise<{ message: string; data: any }> {
    return api.post<{ message: string; data: any }>(`/workspaces/${workspaceId}/messages/${messageId}/bookmark`, {});
  },

  async removeBookmark(workspaceId: string, messageId: string): Promise<{ message: string; data: any }> {
    return api.delete<{ message: string; data: any }>(`/workspaces/${workspaceId}/messages/${messageId}/bookmark`);
  },

  async getBookmarkedMessages(
    workspaceId: string,
    conversationId: string
  ): Promise<{ data: Message[]; total: number }> {
    return api.get<{ data: Message[]; total: number }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/bookmarks`
    );
  },

  async getChannelBookmarkedMessages(
    workspaceId: string,
    channelId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: Message[]; total: number; page: number; limit: number; totalPages: number }> {
    return api.get<{ data: Message[]; total: number; page: number; limit: number; totalPages: number }>(
      `/workspaces/${workspaceId}/channels/${channelId}/bookmarks?page=${page}&limit=${limit}`
    );
  },

  // Pin operations
  async pinMessage(workspaceId: string, conversationId: string, messageId: string): Promise<{ message: string; data: any; previouslyPinnedCount: number }> {
    return api.post<{ message: string; data: any; previouslyPinnedCount: number }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages/${messageId}/pin`,
      {}
    );
  },

  async unpinMessage(workspaceId: string, conversationId: string, messageId: string): Promise<{ message: string; data: any }> {
    return api.delete<{ message: string; data: any }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages/${messageId}/pin`
    );
  },

  async getPinnedMessage(workspaceId: string, conversationId: string): Promise<{ data: Message | null }> {
    return api.get<{ data: Message | null }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/pinned`
    );
  },

  // Star conversation operations
  async starConversation(workspaceId: string, conversationId: string): Promise<{ message: string; data: { conversationId: string; isStarred: boolean; starredAt: string } }> {
    return api.post<{ message: string; data: { conversationId: string; isStarred: boolean; starredAt: string } }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/star`,
      {}
    );
  },

  async unstarConversation(workspaceId: string, conversationId: string): Promise<{ message: string; data: { conversationId: string; isStarred: boolean; starredAt: null } }> {
    return api.delete<{ message: string; data: { conversationId: string; isStarred: boolean; starredAt: null } }>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/star`
    );
  },

  // Read receipts
  async getMessageReadReceipts(workspaceId: string, messageId: string): Promise<{ data: MessageReadReceipt[] }> {
    return api.get<{ data: MessageReadReceipt[] }>(
      `/workspaces/${workspaceId}/messages/${messageId}/read-receipts`
    );
  },

  // Poll operations
  async votePoll(
    workspaceId: string,
    messageId: string,
    pollId: string,
    optionId: string
  ): Promise<{ message: string; data: { poll: Poll; userVotedOptionId: string } }> {
    return api.post<{ message: string; data: { poll: Poll; userVotedOptionId: string } }>(
      `/workspaces/${workspaceId}/messages/${messageId}/polls/${pollId}/vote`,
      { optionId }
    );
  },

  async closePoll(
    workspaceId: string,
    messageId: string,
    pollId: string
  ): Promise<{ message: string; data: { poll: Poll } }> {
    return api.post<{ message: string; data: { poll: Poll } }>(
      `/workspaces/${workspaceId}/messages/${messageId}/polls/${pollId}/close`,
      {}
    );
  },

  async getPoll(
    workspaceId: string,
    messageId: string,
    pollId: string
  ): Promise<{ data: { poll: Poll; userVotedOptionId: string | null; canViewResults: boolean } }> {
    return api.get<{ data: { poll: Poll; userVotedOptionId: string | null; canViewResults: boolean } }>(
      `/workspaces/${workspaceId}/messages/${messageId}/polls/${pollId}`
    );
  },

  // Scheduled Messages API
  async scheduleMessage(
    workspaceId: string,
    data: ScheduleMessageRequest
  ): Promise<{ message: string; data: ScheduledMessage }> {
    return api.post<{ message: string; data: ScheduledMessage }>(
      `/workspaces/${workspaceId}/scheduled-messages`,
      data
    );
  },

  async getScheduledMessages(
    workspaceId: string,
    status?: ScheduledMessageStatus
  ): Promise<{ data: ScheduledMessage[] }> {
    const params = status ? `?status=${status}` : '';
    return api.get<{ data: ScheduledMessage[] }>(
      `/workspaces/${workspaceId}/scheduled-messages${params}`
    );
  },

  async getScheduledMessage(
    workspaceId: string,
    messageId: string
  ): Promise<{ data: ScheduledMessage }> {
    return api.get<{ data: ScheduledMessage }>(
      `/workspaces/${workspaceId}/scheduled-messages/${messageId}`
    );
  },

  async updateScheduledMessage(
    workspaceId: string,
    messageId: string,
    data: UpdateScheduledMessageRequest
  ): Promise<{ message: string; data: ScheduledMessage }> {
    return api.put<{ message: string; data: ScheduledMessage }>(
      `/workspaces/${workspaceId}/scheduled-messages/${messageId}`,
      data
    );
  },

  async cancelScheduledMessage(
    workspaceId: string,
    messageId: string
  ): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/workspaces/${workspaceId}/scheduled-messages/${messageId}`
    );
  },
};

// React Query Hooks
export const useChatChannels = (workspaceId: string) => {
  return useQuery({
    queryKey: chatKeys.channels(),
    queryFn: () => chatApi.getChannels(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useChannel = (channelId: string) => {
  return useQuery({
    queryKey: chatKeys.channel(channelId),
    queryFn: () => chatApi.getChannel(channelId),
    enabled: !!channelId,
  });
};

export const useCreateChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateChannelRequest }) =>
      chatApi.createChannel(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
    },
  });
};

export const useUpdateChannel = () => {
  const queryClient = useQueryClient();
  const updateChannel = useChatStore((state) => state.updateChannel);

  return useMutation({
    mutationFn: ({ workspaceId, channelId, data }: { workspaceId: string; channelId: string; data: Partial<CreateChannelRequest> }) =>
      chatApi.updateChannel(workspaceId, channelId, data),
    onSuccess: (response: any, variables) => {
      console.log('✅ [useUpdateChannel] onSuccess called with:', { response, variables });

      // Extract the actual channel data from the response
      // Backend returns { data: [channel], count: 1 }
      const updatedChannel = Array.isArray(response?.data) && response.data.length > 0
        ? response.data[0]
        : response;

      console.log('📦 [useUpdateChannel] Extracted channel:', updatedChannel);

      // Invalidate all channel-related queries
      queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
      // Invalidate the specific channel query
      queryClient.invalidateQueries({ queryKey: chatKeys.channel(variables.channelId) });
      // Invalidate channel members query
      queryClient.invalidateQueries({ queryKey: chatKeys.channelMembers(variables.channelId) });

      // Update Zustand store with the actual channel object
      console.log('📝 [useUpdateChannel] Calling updateChannel on Zustand store');
      updateChannel(variables.channelId, updatedChannel);
    },
  });
};

export const useDeleteChannel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, channelId }: { workspaceId: string; channelId: string }) =>
      chatApi.deleteChannel(workspaceId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
    },
  });
};

export const useChannelMembers = (workspaceId: string, channelId: string, enabled = true) => {
  return useQuery({
    queryKey: chatKeys.channelMembers(channelId),
    queryFn: () => chatApi.getChannelMembers(workspaceId, channelId),
    enabled: enabled && !!workspaceId && !!channelId,
  });
};

export const useMessages = (channelId: string) => {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(channelId),
    queryFn: ({ pageParam }) => chatApi.getMessages(channelId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    enabled: !!channelId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: SendMessageRequest }) =>
      chatApi.sendMessage(channelId, data),
    onSuccess: (newMessage, { channelId }) => {
      // Optimistically add the message to the cache
      queryClient.setQueryData(chatKeys.messages(channelId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                messages: [newMessage, ...page.messages],
              };
            }
            return page;
          }),
        };
      });
    },
  });
};

export const useUpdateMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ channelId, messageId, data }: {
      channelId: string;
      messageId: string;
      data: UpdateMessageRequest;
    }) => chatApi.updateMessage(channelId, messageId, data),
    onSuccess: (updatedMessage, { channelId, messageId }) => {
      // Update the message in the cache
      queryClient.setQueryData(chatKeys.messages(channelId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: Message) =>
              msg.id === messageId ? updatedMessage : msg
            ),
          })),
        };
      });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, messageId }: { workspaceId: string; messageId: string }) =>
      chatApi.deleteMessage(workspaceId, messageId),
    onSuccess: (_, { workspaceId, messageId }) => {
      // Invalidate all message queries to refetch
      queryClient.invalidateQueries({
        queryKey: ['chat', 'messages']
      });
    },
  });
};

export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, messageId, emoji }: { workspaceId: string; messageId: string; emoji: string }) =>
      chatApi.addReaction(workspaceId, messageId, emoji),
    onSuccess: () => {
      // Invalidate messages to refetch with updated reactions
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
};

export const useThreadMessages = (parentId: string) => {
  return useQuery({
    queryKey: chatKeys.threads(parentId),
    queryFn: () => chatApi.getThreadMessages(parentId),
    enabled: !!parentId,
  });
};

export const useDirectChannels = (workspaceId: string) => {
  return useQuery({
    queryKey: chatKeys.directMessages(),
    queryFn: () => chatApi.getDirectChannels(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateDirectChannel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      chatApi.createDirectChannel(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.directMessages() });
    },
  });
};

export const useMarkChannelAsRead = () => {
  return useMutation({
    mutationFn: ({ channelId, lastReadMessageId }: {
      channelId: string;
      lastReadMessageId: string;
    }) => chatApi.markChannelAsRead(channelId, lastReadMessageId),
  });
};

// Workspace-scoped hooks with caching
export const useChannelMessages = (workspaceId: string, channelId: string, enabled = true, limit = 10, offset = 0) => {
  return useQuery({
    queryKey: [...chatKeys.messages(channelId), workspaceId, limit, offset],
    queryFn: async () => {
      try {
        const response = await chatApi.getChannelMessages(workspaceId, channelId, { limit, offset });
        return response || { data: [], hasMore: false };
      } catch (error: any) {
        // Don't throw error for 404 or empty channels - just return empty data
        if (error?.response?.status === 404 || error?.message?.includes('not found')) {
          console.log('New channel or no messages yet, returning empty array');
          return { data: [], hasMore: false, nextCursor: undefined };
        }
        throw error;
      }
    },
    enabled: !!workspaceId && !!channelId && enabled,
    // Cache initial load (offset=0) for 30s, but always fetch for pagination (offset>0)
    staleTime: offset === 0 ? 30 * 1000 : 0,
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes after unmount
    placeholderData: undefined, // Don't show stale data from other chats
    retry: (failureCount, error: any) => {
      // Don't retry for 404 errors
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useConversationMessagesQuery = (workspaceId: string, conversationId: string, enabled = true, limit = 10, offset = 0) => {
  return useQuery({
    queryKey: [...chatKeys.conversationMessages(conversationId), workspaceId, limit, offset],
    queryFn: async () => {
      try {
        const response = await chatApi.getConversationMessages(workspaceId, conversationId, { limit, offset });
        // Return empty array for new conversations instead of throwing error
        return response || { data: [], hasMore: false };
      } catch (error: any) {
        // Don't throw error for 404 or empty conversations - just return empty data
        if (error?.response?.status === 404 || error?.message?.includes('not found')) {
          console.log('New conversation or no messages yet, returning empty array');
          return { data: [], hasMore: false, nextCursor: undefined };
        }
        throw error;
      }
    },
    enabled: !!workspaceId && !!conversationId && enabled,
    // Cache initial load (offset=0) for 30s, but always fetch for pagination (offset>0)
    staleTime: offset === 0 ? 30 * 1000 : 0,
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes after unmount
    placeholderData: undefined, // Don't show stale data from other chats
    retry: (failureCount, error: any) => {
      // Don't retry for 404 errors (conversation doesn't exist or no messages)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Hook for fetching conversation members
export const useConversationMembers = (workspaceId: string, conversationId: string, enabled = true) => {
  return useQuery({
    queryKey: [...chatKeys.conversationMembers(conversationId), workspaceId],
    queryFn: () => chatApi.getConversationMembers(workspaceId, conversationId),
    enabled: !!workspaceId && !!conversationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - member data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });
};

// Bookmark hooks
export const useBookmarkMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, messageId }: { workspaceId: string; messageId: string }) =>
      chatApi.bookmarkMessage(workspaceId, messageId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate all message queries to refresh bookmark status
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
};

export const useRemoveBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, messageId }: { workspaceId: string; messageId: string }) =>
      chatApi.removeBookmark(workspaceId, messageId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate all message queries to refresh bookmark status
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
};

export const useBookmarkedMessages = (
  workspaceId: string,
  chatId: string,
  chatType: 'conversation' | 'channel' | null,
  enabled: boolean = true
) => {
  const isEnabled = enabled && !!workspaceId && !!chatId;

  console.log('🔍 useBookmarkedMessages query:', {
    workspaceId,
    chatId,
    chatType,
    enabled,
    isEnabled,
    willFetch: isEnabled
  });

  return useQuery({
    queryKey: ['chat', 'bookmarks', chatId],
    queryFn: () => {
      console.log('📡 Fetching bookmarked messages:', { workspaceId, chatId });
      // Always use conversations endpoint - it works for both channels and conversations
      return chatApi.getBookmarkedMessages(workspaceId, chatId);
    },
    enabled: isEnabled,
  });
};

// Pin hooks
export const usePinMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, conversationId, messageId }: {
      workspaceId: string;
      conversationId: string;
      messageId: string;
    }) => chatApi.pinMessage(workspaceId, conversationId, messageId),
    onSuccess: (_, { conversationId }) => {
      // Invalidate all message queries and pinned message query
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
      queryClient.invalidateQueries({ queryKey: [...chatKeys.conversationMessages(conversationId), 'pinned'] });
    },
  });
};

export const useUnpinMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, conversationId, messageId }: {
      workspaceId: string;
      conversationId: string;
      messageId: string;
    }) => chatApi.unpinMessage(workspaceId, conversationId, messageId),
    onSuccess: (_, { conversationId }) => {
      // Invalidate all message queries and pinned message query
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
      queryClient.invalidateQueries({ queryKey: [...chatKeys.conversationMessages(conversationId), 'pinned'] });
    },
  });
};

export const usePinnedMessage = (workspaceId: string, conversationId: string) => {
  return useQuery({
    queryKey: [...chatKeys.conversationMessages(conversationId), 'pinned'],
    queryFn: () => chatApi.getPinnedMessage(workspaceId, conversationId),
    enabled: !!workspaceId && !!conversationId,
    staleTime: 30 * 1000, // 30 seconds - pinned messages change infrequently
  });
};

// Star conversation hooks
export const useStarConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, conversationId }: { workspaceId: string; conversationId: string }) =>
      chatApi.starConversation(workspaceId, conversationId),
    onSuccess: () => {
      // Invalidate conversations list to refresh starred status and sorting
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
};

export const useUnstarConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, conversationId }: { workspaceId: string; conversationId: string }) =>
      chatApi.unstarConversation(workspaceId, conversationId),
    onSuccess: () => {
      // Invalidate conversations list to refresh starred status and sorting
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
};

// Poll hooks
export const useVotePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
      pollId,
      optionId,
    }: {
      workspaceId: string;
      messageId: string;
      pollId: string;
      optionId: string;
    }) => chatApi.votePoll(workspaceId, messageId, pollId, optionId),
    onSuccess: () => {
      // Invalidate all message queries to refresh poll data
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
};

export const useClosePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
      pollId,
    }: {
      workspaceId: string;
      messageId: string;
      pollId: string;
    }) => chatApi.closePoll(workspaceId, messageId, pollId),
    onSuccess: () => {
      // Invalidate all message queries to refresh poll data
      queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
};

// Scheduled message hooks
export const useScheduledMessages = (workspaceId: string, status?: ScheduledMessageStatus) => {
  return useQuery({
    queryKey: ['scheduledMessages', workspaceId, status],
    queryFn: () => chatApi.getScheduledMessages(workspaceId, status),
    enabled: !!workspaceId,
  });
};

export const useScheduleMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: ScheduleMessageRequest;
    }) => chatApi.scheduleMessage(workspaceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages', variables.workspaceId] });
    },
  });
};

export const useUpdateScheduledMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
      data,
    }: {
      workspaceId: string;
      messageId: string;
      data: UpdateScheduledMessageRequest;
    }) => chatApi.updateScheduledMessage(workspaceId, messageId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages', variables.workspaceId] });
    },
  });
};

export const useCancelScheduledMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      messageId,
    }: {
      workspaceId: string;
      messageId: string;
    }) => chatApi.cancelScheduledMessage(workspaceId, messageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages', variables.workspaceId] });
    },
  });
};

// Backward compatibility: export as chatService
export const chatService = chatApi;
