/**
 * Chat Page - Complete Implementation
 * Main chat interface with channels, messages, threads, and real-time features
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import {
  Hash,
  Lock,
  Loader2,
  AlertCircle,
  MessageSquare,
  Search,
  Plus,
  ChevronDown,
  Phone,
  Video,
  Pin,
  X,
  CheckSquare,
  Trash2,
  Archive,
  Copy,
  PanelRight,
  Bookmark,
  CornerUpRight,
  Clock
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Services
import {
  chatService,
  useChannelMessages,
  useConversationMessagesQuery,
  useConversationMembers,
  chatKeys,
  useBookmarkMessage,
  useRemoveBookmark,
  usePinMessage,
  useUnpinMessage,
  usePinnedMessage
} from '@/lib/api/chat-api';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { storageApi } from '@/lib/api/storage-api';
import { useCreateVideoCall } from '@/lib/api/video-call-api';
import { botsApi, useBots } from '@/lib/api/bots-api';
import { useQuery } from '@tanstack/react-query';
import type {
  Channel,
  Conversation,
  Message as ServiceMessage,
  SendMessageData,
  MessageAttachment,
  ChannelMember,
  LinkedContent
} from '@/lib/api/chat-api';

// Chat Components
import { MessageItem, type Message as MessageItemMessage, type User, type Reaction, type Attachment, type LinkedContent as MessageLinkedContent } from '@/components/chat/MessageItem';
import { MessageInput, type AttachedContent, type MessageInputRef } from '@/components/chat/MessageInput';
import { ThreadSidebar } from '@/components/chat/ThreadSidebar';
import { ChatDrivePickerModal } from '@/components/chat/ChatDrivePickerModal';
import { YoutubeVideoPickerModal } from '@/components/chat/YoutubeVideoPickerModal';
import { googleDriveApi } from '@/lib/api/google-drive-api';
import { MentionDropdown, type User as MentionUser } from '@/components/chat/MentionDropdown';
import { ScheduleMessageModal } from '@/components/chat/ScheduleMessageModal';
import { ScheduledMessagesPanel } from '@/components/chat/ScheduledMessagesPanel';
import { AIHistoryModal } from '@/components/chat/AIHistoryModal';
import { BookmarkedMessagesModal } from '@/components/chat/BookmarkedMessagesModal';
import { useScheduleMessage } from '@/lib/api/chat-api';
import { MessageSelectionAIToolbar, type SelectedMessage, type AIAction } from '@/components/chat/MessageSelectionAIToolbar';
import { AIActionResultModal } from '@/components/chat/AIActionResultModal';
import { PollCreator } from '@/components/chat/PollCreator';
import { PollMessage } from '@/components/chat/PollMessage';

// Video Call Integration
import { useVideoCallStore } from '@/stores/videoCallStore';
import { useChatStore } from '@/stores/chatStore';
import { toast } from 'sonner';
import { useRightSidebar } from '@/contexts/RightSidebarContext';

// AI API for message actions
import { aiApi } from '@/lib/api/ai-api';
// Files API for attachment downloads
import { fileApi } from '@/lib/api/files-api';
// Notes API for creating notes from AI results
import { notesApi } from '@/lib/api/notes-api';
// Calendar API for fetching event details
import { calendarApi } from '@/lib/api/calendar-api';
// Preview dialogs for linked content
import { FilePreviewDialog } from '@/components/files/FileOperationDialogs';
import { EventPreviewDialog } from '@/components/calendar/EventPreviewDialog';
import type { CalendarEventAPI } from '@/types/calendar';
import type { FileItem } from '@/types';

// Helper to strip HTML tags for plain text display (e.g., reply previews)
const stripHtml = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Type conversion helpers - needs workspace members for user lookup
const createMessageConverter = (workspaceMembers: any[], currentUser: any) => {
  return (msg: any): MessageItemMessage => {
    // Handle both camelCase and snake_case formats
    const userId = msg.userId || msg.user_id;
    const createdAt = msg.createdAt || msg.created_at;
    const updatedAt = msg.updatedAt || msg.updated_at;
    const parentId = msg.parentId || msg.parent_id;
    const isEdited = msg.isEdited || msg.is_edited;

    // Look up user info from workspace members or use current user
    let userInfo = msg.user;

    if (!userInfo && userId) {
      if (userId === currentUser?.id) {
        // It's the current user's message
        userInfo = {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl
        };
      } else {
        // Look up from workspace members
        const member = workspaceMembers.find(m => m.user_id === userId);
        if (member) {
          userInfo = member.user;
        }
      }
    }

    return {
      id: msg.id,
      body: msg.content_html || msg.contentHtml || msg.content, // Prefer HTML content for rich text/GIFs
      user: {
        id: userId,
        name: userInfo?.name || userInfo?.email || 'Unknown User',
        email: userInfo?.email || '',
        image: userInfo?.avatarUrl || userInfo?.avatar_url
      },
      timestamp: new Date(createdAt),
      attachments: msg.attachments?.map((att: any) => ({
        id: att.id,
        name: att.fileName || att.name || 'untitled',
        url: att.url,
        type: att.mimeType || att.type,
        size: att.fileSize || att.size || 0
      })) || [],
      linked_content: msg.linked_content?.map((item: any) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        subtitle: item.subtitle,
        // Include Drive-specific fields
        driveFileUrl: item.driveFileUrl,
        driveThumbnailUrl: item.driveThumbnailUrl,
        driveMimeType: item.driveMimeType,
        driveFileSize: item.driveFileSize,
        // Include Poll-specific fields
        poll: item.poll
      })) || [],
      reactions: Array.isArray(msg.reactions)
        ? msg.reactions.map((r: any) => ({
            id: r.id || `reaction-${Date.now()}`,
            value: r.value || r.emoji, // Backend returns 'value', fallback to 'emoji' for compatibility
            count: r.count || 1,
            memberIds: r.memberIds || (r.userId ? [r.userId] : [])
          }))
        : [],
      parentMessageId: parentId,
      isEdited: !!isEdited,
      updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      read_by_count: msg.read_by_count
    };
  };
};

// LocalStorage key for last accessed chat per workspace
const getLastAccessedChatKey = (workspaceId: string) => `deskive_last_chat_${workspaceId}`;

const ChatPage: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { workspaceId, channelId } = useParams<{ workspaceId: string; channelId?: string }>();
  const { user } = useAuth();
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '');
  const { data: bots = [] } = useBots(workspaceId || '');
  const queryClient = useQueryClient();

  // Redirect to last accessed chat if no channelId is provided
  useEffect(() => {
    if (!workspaceId || channelId) return; // Only redirect if on base chat URL

    const lastChatId = localStorage.getItem(getLastAccessedChatKey(workspaceId));
    if (lastChatId) {
      navigate(`/workspaces/${workspaceId}/chat/${lastChatId}`, { replace: true });
    }
  }, [workspaceId, channelId, navigate]);

  // Create message converter with workspace members and current user (memoized to prevent infinite re-renders)
  const convertServiceMessageToMessageItem = useMemo(() => {
    return createMessageConverter(workspaceMembers, user);
  }, [workspaceMembers, user]);

  // ============================================================================
  // VIDEO CALL INTEGRATION
  // ============================================================================
  const createCall = useCreateVideoCall();

  // ============================================================================
  // RIGHT SIDEBAR INTEGRATION
  // ============================================================================
  const { toggleMinimized, setChatData } = useRightSidebar();

  // ============================================================================
  // WEBSOCKET INTEGRATION
  // ============================================================================
  const { isConnected, joinRoom, leaveRoom, on, off, startTyping, stopTyping, addReaction, removeReaction } = useWebSocket();

  // ============================================================================
  // ZUSTAND STORE
  // ============================================================================
  const { channels: storeChannels, setChannels: setStoreChannels, updateChannel: updateStoreChannel, getChannel } = useChatStore();

  // Removed debug tracking - was causing performance issues

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Chat lists
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageItemMessage[]>([]);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);

  // Pagination state
  const [messageLimit] = useState(10); // Load 10 messages at a time
  const [messageOffset, setMessageOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Selected chat
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatType, setSelectedChatType] = useState<'channel' | 'conversation' | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('');

  // Fetch bots installed in the current channel/conversation
  const { data: installedBots = [] } = useQuery({
    queryKey: ['installed-bots', workspaceId, selectedChatId, selectedChatType],
    queryFn: async () => {
      if (!workspaceId || !selectedChatId) return [];

      try {
        // Fetch all bots in workspace
        const bots = await botsApi.getBots(workspaceId);

        // Fetch installations for each bot and filter by current channel/conversation
        const botsWithInstallations = await Promise.all(
          bots.map(async (bot) => {
            const installations = await botsApi.getInstallations(workspaceId, bot.id);
            const isInstalledHere = installations.some(installation =>
              (selectedChatType === 'channel' && installation.channelId === selectedChatId) ||
              (selectedChatType === 'conversation' && installation.conversationId === selectedChatId)
            );
            return isInstalledHere ? bot : null;
          })
        );

        return botsWithInstallations.filter(bot => bot !== null);
      } catch (error) {
        console.error('Failed to fetch installed bots:', error);
        return [];
      }
    },
    enabled: !!workspaceId && !!selectedChatId,
  });

  // Message input
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showScheduledMessagesPanel, setShowScheduledMessagesPanel] = useState(false);
  const [showAIHistoryModal, setShowAIHistoryModal] = useState(false);
  const [showBookmarkedModal, setShowBookmarkedModal] = useState(false);

  // Google Drive picker state
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // YouTube picker state
  const [showYoutubePicker, setShowYoutubePicker] = useState(false);
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);

  // Poll creator state
  const [showPollCreator, setShowPollCreator] = useState(false);

  // Linked content preview state
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [filePreviewData, setFilePreviewData] = useState<FileItem | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [eventPreviewOpen, setEventPreviewOpen] = useState(false);
  const [eventPreviewData, setEventPreviewData] = useState<CalendarEventAPI | null>(null);
  const [eventPreviewLoading, setEventPreviewLoading] = useState(false);

  // Loading states
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thread state
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadParentMessage, setThreadParentMessage] = useState<MessageItemMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageItemMessage[]>([]);

  // Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [showPinnedBar, setShowPinnedBar] = useState(false);

  // Bookmarked messages
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // AI Action Modal state
  const [showAIActionModal, setShowAIActionModal] = useState(false);
  const [aiAction, setAIAction] = useState<AIAction | null>(null);
  const [aiActionResult, setAIActionResult] = useState<string | null>(null);
  const [aiActionLoading, setAIActionLoading] = useState(false);
  const [aiActionError, setAIActionError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'multiple'; messageId?: string; count?: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reply context
  const [replyingTo, setReplyingTo] = useState<MessageItemMessage | null>(null);

  // Mention dropdown
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Typing indicator
  const [usersTyping, setUsersTyping] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]); // Array of message IDs
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  // Current user ID from auth context
  const currentUserId = user?.id || '';

  // Mutation hooks for bookmark and pin operations
  const bookmarkMutation = useBookmarkMessage();
  const removeBookmarkMutation = useRemoveBookmark();
  const pinMutation = usePinMessage();
  const unpinMutation = useUnpinMessage();
  const scheduleMessageMutation = useScheduleMessage();

  // Fetch pinned message for current conversation
  const { data: pinnedMessageData } = usePinnedMessage(
    workspaceId || '',
    selectedChatType === 'conversation' && selectedChatId ? selectedChatId : ''
  );

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<MessageInputRef>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);

  // ============================================================================
  // TANSTACK QUERY - FETCH MESSAGES WITH CACHING
  // ============================================================================

  // Fetch channel messages with caching
  const {
    data: channelMessagesData,
    isLoading: isLoadingChannelMessages,
    error: channelMessagesError,
  } = useChannelMessages(
    workspaceId || '',
    selectedChatId || '',
    selectedChatType === 'channel' && !!selectedChatId,
    messageLimit,
    messageOffset
  );

  // Fetch conversation messages with caching
  const {
    data: conversationMessagesData,
    isLoading: isLoadingConversationMessages,
    error: conversationMessagesError,
  } = useConversationMessagesQuery(
    workspaceId || '',
    selectedChatId || '',
    selectedChatType === 'conversation' && !!selectedChatId,
    messageLimit,
    messageOffset
  );

  // Fetch conversation members
  const {
    data: conversationMembers = [],
    isLoading: isLoadingConversationMembers,
  } = useConversationMembers(
    workspaceId || '',
    selectedChatId || '',
    selectedChatType === 'conversation' && !!selectedChatId
  );

  // Combine loading and error states
  const loadingMessagesFromQuery = selectedChatType === 'channel' ? isLoadingChannelMessages : isLoadingConversationMessages;
  const messagesErrorFromQuery = selectedChatType === 'channel' ? channelMessagesError : conversationMessagesError;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return intl.formatMessage({ id: 'modules.chat.messageTime.justNow' });
    if (diffMinutes < 60) return intl.formatMessage({ id: 'modules.chat.messageTime.minutesAgo' }, { count: diffMinutes });

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return intl.formatMessage({ id: 'modules.chat.messageTime.hoursAgo' }, { count: diffHours });

    return date.toLocaleDateString();
  };

  // ============================================================================
  // MEMBER INFO HELPER (for reaction tooltips)
  // ============================================================================

  /**
   * Get member info by user ID for displaying reaction tooltips
   */
  const getMemberInfo = useCallback((userId: string) => {
    // First try workspace members
    const workspaceMember = workspaceMembers.find((m: any) =>
      m.user_id === userId || m.userId === userId || m.id === userId
    );

    if (workspaceMember) {
      const name = (workspaceMember as any)?.user?.name ||
                   (workspaceMember as any)?.name ||
                   (workspaceMember as any)?.user?.email?.split('@')[0] ||
                   'Unknown';
      const avatarUrl = (workspaceMember as any)?.user?.avatarUrl ||
                        (workspaceMember as any)?.user?.avatar_url ||
                        (workspaceMember as any)?.avatarUrl;
      return { id: userId, name, avatarUrl };
    }

    // Try channel members
    const channelMember = channelMembers.find((m: any) =>
      m.user_id === userId || m.userId === userId || m.id === userId
    );

    if (channelMember) {
      const name = (channelMember as any)?.user?.name ||
                   (channelMember as any)?.name ||
                   'Unknown';
      const avatarUrl = (channelMember as any)?.user?.avatarUrl ||
                        (channelMember as any)?.avatarUrl;
      return { id: userId, name, avatarUrl };
    }

    // Try conversation members
    const convMember = conversationMembers.find((m: any) =>
      m.user_id === userId || m.userId === userId || m.id === userId
    );

    if (convMember) {
      const name = (convMember as any)?.user?.name ||
                   (convMember as any)?.name ||
                   'Unknown';
      const avatarUrl = (convMember as any)?.user?.avatarUrl ||
                        (convMember as any)?.avatarUrl;
      return { id: userId, name, avatarUrl };
    }

    return null;
  }, [workspaceMembers, channelMembers, conversationMembers]);

  // ============================================================================
  // VIDEO CALL HELPERS
  // ============================================================================

  /**
   * Start a call (audio or video) with the current DM participant
   * Uses the same pattern as VideoView - creates call and opens in new window
   */
  const handleStartCall = async (callType: 'audio' | 'video') => {
    // Only support 1-on-1 calls in DMs (conversations)
    if (selectedChatType !== 'conversation') {
      toast.error(intl.formatMessage({ id: 'modules.chat.calls.onlyDMCallsSupported', defaultMessage: 'Calls are only supported in direct messages' }));
      return;
    }

    if (!selectedChatId || !workspaceId || !user) {
      toast.error(intl.formatMessage({ id: 'modules.chat.calls.unableStartCall' }));
      return;
    }

    // Get the other participant from the conversation
    const conversation = conversations.find(c => c.id === selectedChatId);
    if (!conversation) {
      toast.error(intl.formatMessage({ id: 'modules.chat.calls.conversationNotFound' }));
      return;
    }

    // Get the remote user (participant who is not the current user)
    const remoteUserId = conversation.participants?.find(p => p !== user.id);
    if (!remoteUserId) {
      toast.error(intl.formatMessage({ id: 'modules.chat.calls.noParticipantFound' }));
      return;
    }

    // Find remote user info from workspace members
    const remoteMember = workspaceMembers.find(m => m.user_id === remoteUserId);
    const remoteUserName = remoteMember?.user?.name || remoteMember?.name || remoteMember?.email || 'User';

    try {
      toast.loading(`Starting ${callType} call...`);

      // Create call using the mutation hook (same as VideoView)
      const call = await createCall.mutateAsync({
        workspaceId,
        data: {
          title: `${callType === 'video' ? 'Video' : 'Audio'} Call with ${remoteUserName}`,
          description: `${callType === 'video' ? 'Video' : 'Audio'} call from chat`,
          call_type: callType,
          is_group_call: false,
          participant_ids: [user.id, remoteUserId],
          recording_enabled: false,
        }
      });

      toast.dismiss();
      toast.success(`${callType === 'video' ? 'Video' : 'Audio'} call started!`);

      // Open call in new window (same as VideoView)
      const callUrl = `/call/${workspaceId}/${call.id}`;
      const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no';
      window.open(callUrl, `video-call-${call.id}`, windowFeatures);

      console.log(`✅ [Chat] ${callType} call created and opened:`, call.id);
    } catch (error: any) {
      toast.dismiss();
      console.error(`❌ [Chat] Failed to start ${callType} call:`, error);
      toast.error(error.message || intl.formatMessage({ id: 'modules.chat.calls.failedStartCall', defaultMessage: 'Failed to start call' }));
    }
  };

  /**
   * Start an audio call with current DM participant
   */
  const handleStartAudioCall = () => handleStartCall('audio');

  /**
   * Start a video call with current DM participant
   */
  const handleStartVideoCall = () => handleStartCall('video');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchChannels = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoadingChannels(true);
      const channelsData = await chatService.getChannels(workspaceId);
      setChannels(channelsData);
      setStoreChannels(channelsData); // Update Zustand store

      // Don't auto-select first channel - let user choose from the list
      // When no channel is selected, show the "Select a conversation" empty state
    } catch (err) {
      console.error('Failed to fetch channels:', err);
      setError(intl.formatMessage({ id: 'modules.chat.errors.failedLoadChannels' }));
    } finally {
      setLoadingChannels(false);
    }
  }, [workspaceId]);

  const fetchConversations = async () => {
    if (!workspaceId) return;

    try {
      setLoadingConversations(true);
      const conversationsData = await chatService.getConversations(workspaceId);
      setConversations(conversationsData);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChatId || !selectedChatType || !workspaceId) return;

    try {
      setLoadingMessages(true);
      setError(null); // Clear any previous errors
      let messagesData: ServiceMessage[];

      if (selectedChatType === 'channel') {
        // Use workspace-scoped endpoint for channels
        const response = await chatService.getChannelMessages(workspaceId, selectedChatId, { limit: 100, offset: 0 });
        messagesData = response.data || [];
      } else {
        // For conversations, use workspace-scoped endpoint
        const response = await chatService.getConversationMessages(workspaceId, selectedChatId, { limit: 100, offset: 0 });
        messagesData = response.data || [];
      }

      const convertedMessages = messagesData.map(convertServiceMessageToMessageItem);
      setMessages(convertedMessages.reverse()); // Reverse to show oldest first
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError(intl.formatMessage({ id: 'modules.chat.errors.failedLoadMessages' }));
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchChannelMembers = async (channelId: string) => {
    if (!workspaceId) return;
    try {
      const members = await chatService.getChannelMembers(workspaceId, channelId);
      setChannelMembers(members);
    } catch (err) {
      console.error('Failed to fetch channel members:', err);
    }
  };

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================

  const handleInputChange = useCallback((value: string) => {
    setMessageInput(value);

    // Don't emit typing if no chat is selected
    if (!selectedChatId || !selectedChatType) {
      return;
    }

    // Start typing indicator when user types
    if (value.trim().length > 0) {
      // Emit typing_start event
      if (selectedChatType === 'channel') {
        startTyping(selectedChatId, undefined);
      } else if (selectedChatType === 'conversation') {
        startTyping(undefined, selectedChatId);
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedChatType === 'channel') {
          stopTyping(selectedChatId, undefined);
        } else if (selectedChatType === 'conversation') {
          stopTyping(undefined, selectedChatId);
        }
      }, 3000);
    } else {
      // Stop typing when input is cleared
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedChatType === 'channel') {
        stopTyping(selectedChatId, undefined);
      } else if (selectedChatType === 'conversation') {
        stopTyping(undefined, selectedChatId);
      }
    }
  }, [selectedChatId, selectedChatType, startTyping, stopTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Check Google Drive connection status
  useEffect(() => {
    const checkDriveConnection = async () => {
      if (!workspaceId) return;
      try {
        const connection = await googleDriveApi.getConnection(workspaceId);
        setIsDriveConnected(!!connection);
      } catch {
        setIsDriveConnected(false);
      }
    };
    checkDriveConnection();
  }, [workspaceId]);

  // Check YouTube connection status
  useEffect(() => {
    const checkYoutubeConnection = async () => {
      if (!workspaceId) return;
      try {
        const { default: youtubeApi } = await import('@/lib/api/youtube-api');
        const status = await youtubeApi.getStatus(workspaceId);
        setIsYoutubeConnected(status.connected);
      } catch {
        setIsYoutubeConnected(false);
      }
    };
    checkYoutubeConnection();
  }, [workspaceId]);

  // Update selected chat name when channel data changes in Zustand store
  useEffect(() => {
    if (selectedChatType === 'channel' && selectedChatId) {
      const channel = getChannel(selectedChatId);
      console.log('🔍 [ChatPage] Checking channel update:', {
        channelId: selectedChatId,
        foundChannel: channel,
        currentName: selectedChatName,
        newName: channel?.name
      });
      if (channel && channel.name !== selectedChatName) {
        console.log('✅ [ChatPage] Updating selectedChatName to:', channel.name);
        setSelectedChatName(channel.name);
      }
    }
  }, [storeChannels, selectedChatId, selectedChatType, selectedChatName, getChannel]);

  // ============================================================================
  // MESSAGE ACTIONS
  // ============================================================================

  // Handle poll creation - sends a message with the poll as linked_content
  const handleCreatePoll = useCallback((pollContent: LinkedContent) => {
    if (!selectedChatId || !selectedChatType || !workspaceId) return;

    // Send the poll as a message with the poll question as content
    const content = `📊 ${pollContent.poll?.question || 'Poll'}`;
    sendMessage(content, [], [pollContent as AttachedContent]);
  }, [selectedChatId, selectedChatType, workspaceId]);

  const sendMessage = async (content: string, files: File[], attachedContent?: AttachedContent[]) => {
    if ((!content.trim() && files.length === 0 && (!attachedContent || attachedContent.length === 0)) || !selectedChatId || !selectedChatType || !workspaceId) return;

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Create optimistic message with pending attachments
    const optimisticMessage: MessageItemMessage = {
      id: tempId,
      body: content.trim(),
      user: {
        id: user?.id || '',
        name: user?.name || user?.email || 'You',
        email: user?.email || '',
        image: user?.avatarUrl
      },
      timestamp: new Date(),
      attachments: files.map((file, index) => ({
        id: `temp-attachment-${index}`,
        name: file.name,
        url: '', // Empty URL indicates pending upload
        type: file.type,
        size: file.size,
        isPending: true // Custom flag to show skeleton
      })) as Attachment[],
      linked_content: attachedContent?.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        subtitle: item.subtitle,
        // Include Drive-specific fields
        driveFileUrl: item.driveFileUrl,
        driveThumbnailUrl: item.driveThumbnailUrl,
        driveMimeType: item.driveMimeType,
        driveFileSize: item.driveFileSize,
        // Include Poll-specific fields
        poll: item.poll
      })) || [],
      reactions: [],
      parentMessageId: replyingTo?.id, // Include parent for reply indicator
      isOptimistic: true // Custom flag to reduce opacity
    };

    try {
      setIsSending(true);
      setError(null);

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setTimeout(scrollToBottom, 100);

      // Upload files first if there are any
      let attachments: MessageAttachment[] = [];

      if (files.length > 0) {
        console.log(`Uploading ${files.length} file(s)...`);
        const uploadPromises = files.map(file => storageApi.uploadFile(file, workspaceId));
        const uploadResults = await Promise.all(uploadPromises);

        attachments = uploadResults.map(result => ({
          id: result.id,
          fileName: result.name,
          url: result.url,
          mimeType: result.mime_type,
          fileSize: result.size
        }));

        console.log('Files uploaded successfully:', attachments);

        // Update optimistic message with uploaded attachments
        setMessages(prev => prev.map(msg =>
          msg.id === tempId
            ? {
                ...msg,
                attachments: attachments.map(att => ({
                  id: att.id,
                  name: att.fileName,
                  url: att.url,
                  type: att.mimeType,
                  size: att.size,
                  isPending: false
                })) as Attachment[]
              }
            : msg
        ));
      }

      // Convert attachedContent to linked_content format
      const linkedContent: LinkedContent[] | undefined = attachedContent && attachedContent.length > 0
        ? attachedContent.map(item => ({
            id: item.id,
            title: item.title,
            name: item.name,
            type: item.type,
            subtitle: item.subtitle,
            url: item.url,
            thumbnail: item.thumbnail,
            metadata: item.metadata,
            // Include Drive-specific fields
            driveFileUrl: item.driveFileUrl,
            driveThumbnailUrl: item.driveThumbnailUrl,
            driveMimeType: item.driveMimeType,
            driveFileSize: item.driveFileSize,
            // Include Poll-specific fields
            poll: item.poll
          } as LinkedContent))
        : undefined;

      // Extract plain text from HTML for content field (used for search, previews)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainTextContent = tempDiv.textContent || tempDiv.innerText || '';

      const messageData: SendMessageData = {
        content: plainTextContent.trim() || '[GIF]', // Plain text fallback for GIF-only messages
        content_html: content.trim(), // Full HTML content with images/formatting
        type: files.length > 0 ? 'file' : 'text',
        attachments: attachments.length > 0 ? attachments : undefined,
        parentId: replyingTo?.id, // Include parentId if replying (camelCase for frontend)
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined, // Include mentioned user IDs
        linked_content: linkedContent
      };

      let realMessage: any;
      if (selectedChatType === 'channel') {
        // Use workspace-scoped endpoint for channels
        realMessage = await chatService.sendChannelMessage(workspaceId, selectedChatId, messageData);
        // Invalidate cache to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.messages(selectedChatId), workspaceId]
        });
      } else {
        realMessage = await chatService.sendConversationMessage(workspaceId, selectedChatId, messageData);
        // Invalidate cache to ensure fresh data
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.conversationMessages(selectedChatId), workspaceId]
        });
      }

      // Replace optimistic message with real message
      if (realMessage) {
        const convertedMessage = convertServiceMessageToMessageItem(realMessage);
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? convertedMessage : msg
        ));
      } else {
        // If no real message returned, remove optimistic flag
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? { ...msg, isOptimistic: false } : msg
        ));
      }

      setTimeout(scrollToBottom, 100);

      // Clear reply context and mentions after successful send
      setReplyingTo(null);
      setMentionedUserIds([]);

      // Stop typing indicator when message is sent
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedChatType === 'channel') {
        stopTyping(selectedChatId, undefined);
      } else if (selectedChatType === 'conversation') {
        stopTyping(undefined, selectedChatId);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(intl.formatMessage({ id: 'modules.chat.errors.failedSendMessage' }));
      toast.error(intl.formatMessage({ id: 'modules.chat.errors.failedSendMessage' }));

      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!selectedChatId || !workspaceId) return;

    try {
      await chatService.updateMessage(workspaceId, messageId, { content: newContent });

      // Invalidate cache
      if (selectedChatType === 'channel') {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.messages(selectedChatId), workspaceId]
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.conversationMessages(selectedChatId), workspaceId]
        });
      }

      // Update local state
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, body: newContent, isEdited: true, updatedAt: new Date() }
          : msg
      ));
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    // Show confirmation modal instead of browser confirm
    setDeleteTarget({ type: 'single', messageId });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteTarget || !selectedChatId || !workspaceId) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'single' && deleteTarget.messageId) {
        await chatService.deleteMessage(workspaceId, deleteTarget.messageId);

        // Invalidate cache
        if (selectedChatType === 'channel') {
          queryClient.invalidateQueries({
            queryKey: [...chatKeys.messages(selectedChatId), workspaceId]
          });
        } else {
          queryClient.invalidateQueries({
            queryKey: [...chatKeys.conversationMessages(selectedChatId), workspaceId]
          });
        }

        // Remove from local state
        setMessages(prev => prev.filter(msg => msg.id !== deleteTarget.messageId));
        toast.success(intl.formatMessage({ id: 'modules.chat.success.messageDeleted', defaultMessage: 'Message deleted' }));
      } else if (deleteTarget.type === 'multiple') {
        await Promise.all(
          Array.from(selectedMessageIds).map(id => chatService.deleteMessage(workspaceId, id))
        );

        setMessages(prev => prev.filter(msg => !selectedMessageIds.has(msg.id)));
        setSelectedMessageIds(new Set());
        setSelectionMode(false);
        toast.success(intl.formatMessage(
          { id: 'modules.chat.messagesDeleted', defaultMessage: '{count} messages deleted' },
          { count: deleteTarget.count }
        ));
      }
    } catch (err) {
      console.error('Failed to delete message(s):', err);
      toast.error(intl.formatMessage({ id: 'modules.chat.errors.deleteFailed' }, { defaultMessage: 'Failed to delete message(s)' }));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      // Use WebSocket for real-time reaction
      addReaction(messageId, emoji);

      // Update local state optimistically
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.value === emoji);

          if (existingReaction) {
            // Toggle reaction
            const userHasReacted = existingReaction.memberIds.includes(currentUserId);
            if (userHasReacted) {
              return {
                ...msg,
                reactions: reactions.map(r =>
                  r.value === emoji
                    ? {
                        ...r,
                        count: r.count - 1,
                        memberIds: r.memberIds.filter(id => id !== currentUserId)
                      }
                    : r
                ).filter(r => r.count > 0)
              };
            } else {
              return {
                ...msg,
                reactions: reactions.map(r =>
                  r.value === emoji
                    ? {
                        ...r,
                        count: r.count + 1,
                        memberIds: [...r.memberIds, currentUserId]
                      }
                    : r
                )
              };
            }
          } else {
            // Add new reaction
            return {
              ...msg,
              reactions: [
                ...reactions,
                {
                  id: `temp-${Date.now()}`,
                  value: emoji,
                  count: 1,
                  memberIds: [currentUserId]
                }
              ]
            };
          }
        }
        return msg;
      }));
    } catch (err) {
      console.error('Failed to react to message:', err);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    if (!workspaceId || !selectedChatId || selectedChatType !== 'conversation') {
      toast.error('Cannot pin message', {
        description: 'Pin is only available in direct messages'
      });
      return;
    }

    try {
      // Optimistic update
      setPinnedMessages(new Set([messageId]));
      setShowPinnedBar(true);

      await pinMutation.mutateAsync({
        workspaceId,
        conversationId: selectedChatId,
        messageId
      });

      toast.success('Message pinned');
    } catch (err: any) {
      // Revert optimistic update on error
      setPinnedMessages(new Set());
      toast.error('Failed to pin message', {
        description: err.message || 'Please try again'
      });
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    if (!workspaceId || !selectedChatId || selectedChatType !== 'conversation') {
      return;
    }

    try {
      // Optimistic update
      setPinnedMessages(new Set());
      setShowPinnedBar(false);

      await unpinMutation.mutateAsync({
        workspaceId,
        conversationId: selectedChatId,
        messageId
      });

      toast.success('Message unpinned');
    } catch (err: any) {
      toast.error('Failed to unpin message', {
        description: err.message || 'Please try again'
      });
    }
  };

  const handleBookmarkMessage = async (messageId: string) => {
    if (!workspaceId) return;

    try {
      // Optimistic update
      setBookmarkedMessages(prev => new Set([...prev, messageId]));

      await bookmarkMutation.mutateAsync({
        workspaceId,
        messageId
      });

      toast.success('Message bookmarked');
    } catch (err: any) {
      // Revert optimistic update on error
      setBookmarkedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      toast.error('Failed to bookmark message', {
        description: err.message || 'Please try again'
      });
    }
  };

  const handleUnbookmarkMessage = async (messageId: string) => {
    if (!workspaceId) return;

    try {
      // Optimistic update
      setBookmarkedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });

      await removeBookmarkMutation.mutateAsync({
        workspaceId,
        messageId
      });

      toast.success('Bookmark removed');
    } catch (err: any) {
      // Revert optimistic update on error
      setBookmarkedMessages(prev => new Set([...prev, messageId]));
      toast.error('Failed to remove bookmark', {
        description: err.message || 'Please try again'
      });
    }
  };

  const handleReply = (message: MessageItemMessage) => {
    console.log('💬 Replying to message:', message.id);
    setReplyingTo(message);
    messageInputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleOpenThread = (message: MessageItemMessage) => {
    setThreadParentMessage(message);

    // Filter thread messages
    const threadReplies = messages.filter(m => m.parentMessageId === message.id);
    setThreadMessages(threadReplies);

    setThreadOpen(true);
  };

  const handleCloseThread = useCallback(() => {
    setThreadOpen(false);
    setThreadParentMessage(null);
    setThreadMessages([]);
  }, []);

  // Handle clicking on linked content (notes, events, files)
  const handleLinkedContentClick = useCallback(async (content: MessageLinkedContent) => {
    if (!workspaceId) return;

    switch (content.type) {
      case 'notes':
        // Navigate to the specific note page
        navigate(`/workspaces/${workspaceId}/notes/${content.id}`);
        break;
      case 'events':
        // Open event preview dialog
        setEventPreviewOpen(true);
        setEventPreviewLoading(true);
        try {
          const eventData = await calendarApi.getEvent(workspaceId, content.id);
          setEventPreviewData(eventData);
        } catch (error) {
          console.error('Failed to fetch event:', error);
          toast.error('Failed to load event details');
          setEventPreviewOpen(false);
        } finally {
          setEventPreviewLoading(false);
        }
        break;
      case 'files':
        // Open file preview dialog
        setFilePreviewOpen(true);
        setFilePreviewLoading(true);
        try {
          const fileData = await fileApi.getFile(workspaceId, content.id);
          setFilePreviewData(fileData);
        } catch (error) {
          console.error('Failed to fetch file:', error);
          toast.error('Failed to load file details');
          setFilePreviewOpen(false);
        } finally {
          setFilePreviewLoading(false);
        }
        break;
      case 'drive':
        // Open Google Drive file in new tab
        if (content.driveFileUrl) {
          window.open(content.driveFileUrl, '_blank', 'noopener,noreferrer');
        } else {
          toast.error('Drive file URL not available');
        }
        break;
      default:
        console.log('Unknown content type:', content.type);
    }
  }, [workspaceId, navigate]);

  // Handle downloading attachment files using the files API
  const handleDownloadAttachment = useCallback(async (attachmentId: string, fileName: string) => {
    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    try {
      console.log(`📥 Downloading attachment: ${fileName} (${attachmentId})`);
      const blob = await fileApi.downloadFile(workspaceId, attachmentId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Downloaded: ${fileName}`);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      toast.error('Failed to download file', {
        description: 'Please try again'
      });
    }
  }, [workspaceId]);

  const handleSendThreadReply = async (content: string, files: File[]) => {
    if (!threadParentMessage || !selectedChatId || !selectedChatType || !workspaceId) return;

    try {
      // Upload files first if there are any
      let attachments: MessageAttachment[] = [];

      if (files.length > 0) {
        console.log(`Uploading ${files.length} file(s) for thread reply...`);
        const uploadPromises = files.map(file => storageApi.uploadFile(file, workspaceId));
        const uploadResults = await Promise.all(uploadPromises);

        attachments = uploadResults.map(result => ({
          id: result.id,
          fileName: result.name,
          url: result.url,
          mimeType: result.mime_type,
          fileSize: result.size
        }));

        console.log('Thread reply files uploaded successfully:', attachments);
      }

      // Extract plain text from HTML for content field
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainTextContent = tempDiv.textContent || tempDiv.innerText || '';

      const messageData: SendMessageData = {
        content: plainTextContent.trim() || '[GIF]',
        content_html: content.trim(),
        type: files.length > 0 ? 'file' : 'text',
        parentId: threadParentMessage.id,
        attachments: attachments.length > 0 ? attachments : undefined
      };

      if (selectedChatType === 'channel') {
        // Use workspace-scoped endpoint for channels
        await chatService.sendChannelMessage(workspaceId, selectedChatId, messageData);
      } else {
        await chatService.sendConversationMessage(workspaceId, selectedChatId, messageData);
      }

      // Don't add message here - let WebSocket handle it to prevent duplicates
    } catch (err) {
      console.error('Failed to send thread reply:', err);
      toast.error('Failed to send thread reply. Please try again.');
    }
  };

  // ============================================================================
  // SELECTION MODE
  // ============================================================================

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedMessageIds(new Set());
  }, []);

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    // Show confirmation modal for multiple messages
    setDeleteTarget({ type: 'multiple', count: selectedMessageIds.size });
    setShowDeleteConfirm(true);
  };

  // Get selected messages as SelectedMessage array for AI toolbar
  const getSelectedMessages = useCallback((): SelectedMessage[] => {
    return messages
      .filter(msg => selectedMessageIds.has(msg.id))
      .map(msg => ({
        id: msg.id,
        body: msg.body,
        user: msg.user,
        timestamp: msg.timestamp,
      }));
  }, [messages, selectedMessageIds]);

  // Handle AI actions on selected messages
  const handleAIAction = useCallback(async (
    action: AIAction,
    options?: { language?: string; customPrompt?: string }
  ) => {
    const selectedMsgs = getSelectedMessages();
    if (selectedMsgs.length === 0) return;

    setAIAction(action);
    setAIActionResult(null);
    setAIActionError(null);

    // For custom prompt, just open the modal to let user enter prompt
    if (action === 'custom_prompt' && !options?.customPrompt) {
      setShowAIActionModal(true);
      return;
    }

    // For copy_formatted, just copy to clipboard
    if (action === 'copy_formatted') {
      const formatted = selectedMsgs
        .map(msg => `[${msg.user.name}] ${msg.body.replace(/<[^>]*>/g, '')}`)
        .join('\n\n');
      await navigator.clipboard.writeText(formatted);
      toast.success('Messages copied to clipboard');
      return;
    }

    // For save_bookmark, bookmark all selected messages
    if (action === 'save_bookmark') {
      try {
        await Promise.all(
          selectedMsgs.map(msg => {
            if (!bookmarkedMessages.has(msg.id)) {
              setBookmarkedMessages(prev => new Set([...prev, msg.id]));
              return bookmarkMutation.mutateAsync({
                workspaceId: workspaceId!,
                messageId: msg.id,
              });
            }
            return Promise.resolve();
          })
        );
        toast.success(`Bookmarked ${selectedMsgs.length} messages`);
        setSelectedMessageIds(new Set());
        setSelectionMode(false);
      } catch (err) {
        console.error('Failed to bookmark messages:', err);
        toast.error('Failed to bookmark some messages');
      }
      return;
    }

    // For AI processing actions, show modal with loading state
    setShowAIActionModal(true);
    setAIActionLoading(true);

    try {
      // Prepare messages context for AI
      const messagesContext = selectedMsgs
        .map(msg => `${msg.user.name}: ${msg.body.replace(/<[^>]*>/g, '')}`)
        .join('\n');

      let aiContent = '';

      switch (action) {
        case 'create_note': {
          const response = await aiApi.generateText({
            prompt: `Create a well-formatted note from these chat messages. Include key points, decisions, and action items if any. Format with headers and bullet points where appropriate:\n\n${messagesContext}`,
            text_type: 'general',
            tone: 'professional',
          });
          aiContent = response.content;
          break;
        }
        case 'summarize': {
          const response = await aiApi.summarize({
            content: messagesContext,
            summary_type: 'bullet_points',
          });
          aiContent = response.summary;
          break;
        }
        case 'translate': {
          const response = await aiApi.translate({
            text: messagesContext,
            target_language: options?.language || 'en',
            preserve_formatting: true,
          });
          aiContent = response.translated_text;
          break;
        }
        case 'extract_tasks': {
          const response = await aiApi.generateText({
            prompt: `Extract all action items, tasks, and to-dos from these chat messages. List them clearly with any mentioned deadlines or assignees. Format as a checklist:\n\n${messagesContext}`,
            text_type: 'general',
            tone: 'professional',
          });
          aiContent = response.content;
          break;
        }
        case 'create_email': {
          const response = await aiApi.generateText({
            prompt: `Draft a professional email summarizing the key points from these chat messages. Include relevant details and maintain a clear, concise tone:\n\n${messagesContext}`,
            text_type: 'email',
            tone: 'professional',
          });
          aiContent = response.content;
          break;
        }
        case 'custom_prompt': {
          const response = await aiApi.generateText({
            prompt: `${options?.customPrompt}\n\nMessages:\n${messagesContext}`,
            text_type: 'general',
            tone: 'professional',
          });
          aiContent = response.content;
          break;
        }
        default:
          throw new Error('Unknown AI action');
      }

      setAIActionResult(aiContent);
    } catch (err) {
      console.error('AI action failed:', err);
      setAIActionError(err instanceof Error ? err.message : 'Failed to process with AI');
    } finally {
      setAIActionLoading(false);
    }
  }, [getSelectedMessages, workspaceId, bookmarkedMessages, bookmarkMutation]);

  // Handle creating a note from AI result
  const handleCreateNoteFromAI = useCallback(async (content: string, title: string) => {
    if (!workspaceId) return;

    try {
      // Create note directly via API
      const note = await notesApi.createNote(workspaceId, {
        title: title || 'AI Generated Note',
        content: content,
      });

      toast.success('Note created successfully!', {
        action: {
          label: 'View Note',
          onClick: () => navigate(`/workspaces/${workspaceId}/notes/${note.id}`),
        },
      });

      // Clear selection after successful note creation
      setSelectedMessageIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      console.error('Failed to create note:', err);
      toast.error('Failed to create note');
      throw err; // Re-throw so the modal knows it failed
    }
  }, [workspaceId, navigate]);

  // Handle custom prompt submission
  const handleCustomPromptSubmit = useCallback(async (prompt: string) => {
    await handleAIAction('custom_prompt', { customPrompt: prompt });
  }, [handleAIAction]);

  // ============================================================================
  // MENTION HANDLING
  // ============================================================================

  const handleMentionTrigger = (query: string, position: number) => {
    console.log('[Mention] Trigger called:', { query, position, mentionUsersCount: mentionUsers.length });
    setMentionQuery(query);
    setShowMentionDropdown(true);

    // Calculate position for dropdown
    // This is simplified - in production, you'd calculate based on cursor position
    setMentionPosition({ top: 100, left: 100 });
  };

  const handleMentionSelect = (user: MentionUser) => {
    // Use the ref to insert the mention via Quill editor
    if (messageInputRef.current) {
      messageInputRef.current.insertMention(user.name, mentionQuery.length);
    }

    // Track the mentioned user ID (avoid duplicates)
    // For @channel, we'll handle it specially in the backend
    if (!mentionedUserIds.includes(user.id)) {
      setMentionedUserIds(prev => [...prev, user.id]);
    }

    setShowMentionDropdown(false);
    setMentionQuery('');
  };

  const handleCloseMentionDropdown = () => {
    setShowMentionDropdown(false);
    setMentionQuery('');
  };

  // Handle Google Drive file selection
  const handleDriveFilesSelected = (files: AttachedContent[]) => {
    if (messageInputRef.current && files.length > 0) {
      messageInputRef.current.addAttachedContent(files);
    }
  };

  // Handle YouTube video selection
  const handleYoutubeVideoSelected = (videoUrl: string, videoData: any) => {
    if (messageInputRef.current) {
      messageInputRef.current.addAttachedContent([{
        id: videoData.id,
        type: 'youtube' as const,
        name: videoData.title,
        url: videoUrl,
        thumbnail: videoData.thumbnail,
        metadata: {
          channelTitle: videoData.channelTitle,
          description: videoData.description,
        },
      }]);
    }
  };

  // ============================================================================
  // CHAT SELECTION
  // ============================================================================

  const selectChat = (id: string, type: 'channel' | 'conversation', name: string) => {
    setSelectedChatId(id);
    setSelectedChatType(type);
    setSelectedChatName(name);
    setMessages([]);
    setError(null);
    setThreadOpen(false);
    setThreadParentMessage(null);
    setThreadMessages([]);
    setSelectionMode(false);
    setSelectedMessageIds(new Set());

    if (type === 'channel') {
      fetchChannelMembers(id);
    }
  };

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+S to toggle selection mode
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleToggleSelectionMode();
      }

      // Escape to close thread or exit selection mode
      if (e.key === 'Escape') {
        if (threadOpen) {
          handleCloseThread();
        } else if (selectionMode) {
          setSelectionMode(false);
          setSelectedMessageIds(new Set());
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [threadOpen, selectionMode, handleToggleSelectionMode, handleCloseThread]);

  // ============================================================================
  // SEARCH FUNCTIONALITY
  // ============================================================================

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Search through messages for matches
    const results: string[] = [];
    const lowerQuery = query.toLowerCase();

    messages.forEach((message) => {
      if (message.body.toLowerCase().includes(lowerQuery)) {
        results.push(message.id);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);

    // Scroll to first result
    if (results.length > 0) {
      scrollToMessage(results[0]);
    }
  }, [messages]);

  const scrollToMessage = useCallback((messageId: string) => {
    // Find the message element
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

    if (messageElement) {
      // Scroll to the message smoothly
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight animation
      messageElement.classList.add('search-highlight');
      setTimeout(() => {
        messageElement.classList.remove('search-highlight');
      }, 2000);
    }
  }, []);

  const handleNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;

    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchResults[nextIndex]);
  }, [searchResults, currentSearchIndex, scrollToMessage]);

  const handlePreviousSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;

    const prevIndex = currentSearchIndex === 0
      ? searchResults.length - 1
      : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchResults[prevIndex]);
  }, [searchResults, currentSearchIndex, scrollToMessage]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setIsSearching(false);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Update right sidebar chat data whenever key data changes
  // Using individual dependencies instead of memoized object to prevent infinite loops
  const lastSidebarUpdateRef = useRef<string>('');

  useEffect(() => {
    // Get channel data to include is_private in hash
    const channel = selectedChatType === 'channel' && selectedChatId
      ? getChannel(selectedChatId)
      : null;

    // Create a hash of the dependencies to check if they actually changed
    const currentHash = `${messages.length}-${selectedChatId}-${selectedChatType}-${selectedChatName}-${channelMembers.length}-${conversationMembers.length}-${channel?.is_private}`;

    if (currentHash === lastSidebarUpdateRef.current) {
      // Nothing changed, skip update
      return;
    }

    lastSidebarUpdateRef.current = currentHash;

    if (selectedChatId && selectedChatType) {
      // Get actual member count based on chat type
      const actualMemberCount = selectedChatType === 'channel'
        ? channelMembers.length
        : conversationMembers.length;

      setChatData({
        messages,
        hasSelectedChat: true,
        channelName: selectedChatName,
        channelDescription: channel?.description || undefined,
        isPrivate: channel?.is_private || false,
        memberCount: actualMemberCount > 0 ? actualMemberCount : undefined,
        chatType: selectedChatType, // Pass chat type to distinguish channels from conversations
        channelId: selectedChatType === 'channel' ? selectedChatId : undefined,
      });
    } else {
      // No chat selected
      setChatData({
        messages: [],
        hasSelectedChat: false,
      });
    }
    // Only depend on primitive values and lengths, not entire arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages.length,
    selectedChatId,
    selectedChatType,
    selectedChatName,
    channelMembers.length,
    conversationMembers.length,
    storeChannels, // Include store channels to react to channel updates (like is_private changes)
    // Don't include: messages, channels, channelMembers, conversationMembers, setChatData
  ]);

  // Initial data loading
  useEffect(() => {
    if (workspaceId) {
      fetchChannels();
      fetchConversations();
    }
  }, [workspaceId]);

  // Track the last processed chat to prevent re-processing the same data
  const lastProcessedChatRef = useRef<{ chatId?: string; chatType?: string; data?: any; offset?: number }>({});

  // Reset pagination when chat changes
  useEffect(() => {
    setMessageOffset(0);
    setHasMoreMessages(true);
    setMessages([]);
    setIsLoadingMore(false);
  }, [selectedChatId, selectedChatType]);

  // Update messages when query data changes or when switching chats
  useEffect(() => {
    // Determine which data to use based on selected chat type
    const currentData = selectedChatType === 'channel' ? channelMessagesData : conversationMessagesData;

    // Skip if no data available yet for current chat type
    if (!currentData) {
      return;
    }

    // Check if we're viewing the same chat with the same data and offset
    const sameChat = lastProcessedChatRef.current.chatId === selectedChatId &&
                     lastProcessedChatRef.current.chatType === selectedChatType;
    const sameData = lastProcessedChatRef.current.data === currentData;
    const sameOffset = lastProcessedChatRef.current.offset === messageOffset;

    if (sameChat && sameData && sameOffset) {
      // Same chat, data, and offset - skip processing to prevent duplicates
      return;
    }

    // Update the last processed chat reference
    lastProcessedChatRef.current = {
      chatId: selectedChatId || undefined,
      chatType: selectedChatType || undefined,
      data: currentData,
      offset: messageOffset
    };

    if (selectedChatType === 'channel' && channelMessagesData) {
      const messagesData = channelMessagesData.data || [];
      const convertedMessages = messagesData.map(convertServiceMessageToMessageItem);

      console.log('📦 [Channel] Processing messages:', {
        offset: messageOffset,
        count: messagesData.length,
        limit: messageLimit,
        isLoadingMore: isLoadingMoreRef.current
      });

      // Check if we have fewer messages than requested (indicates no more messages)
      if (messagesData.length < messageLimit) {
        console.log('⚠️ [Channel] No more messages (got', messagesData.length, '< limit', messageLimit, ')');
        setHasMoreMessages(false);
      }

      if (messageOffset === 0) {
        // Initial load - replace messages and scroll to bottom
        console.log('💬 [Channel] Initial load: Setting', convertedMessages.length, 'messages');
        setMessages(convertedMessages.reverse()); // Reverse to show oldest first
        setTimeout(scrollToBottom, 100);
      } else {
        // Loading older messages - prepend to beginning and preserve scroll position
        console.log('📥 [Channel] Loading older messages');
        // Get the viewport element
        const scrollAreaRoot = messagesContainerRef.current;
        const viewport = scrollAreaRoot?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;

        if (viewport && isLoadingMoreRef.current) {
          console.log('✅ [Channel] Prepending with scroll adjustment');
          // Store current scroll height before adding messages
          const previousScrollHeight = viewport.scrollHeight;
          const previousScrollTop = viewport.scrollTop;

          // Update messages
          setMessages(prev => [...convertedMessages.reverse(), ...prev]);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;

          // Restore scroll position after DOM update
          requestAnimationFrame(() => {
            const newScrollHeight = viewport.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeight;
            viewport.scrollTop = previousScrollTop + heightDifference;
            console.log('📐 Scroll adjusted:', { previousScrollHeight, newScrollHeight, heightDifference, newScrollTop: viewport.scrollTop });
          });
        } else {
          setMessages(prev => [...convertedMessages.reverse(), ...prev]);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        }
      }

      setError(null);

      // Sync bookmark status from server messages
      const bookmarked = new Set(
        messagesData.filter((msg: any) => msg.is_bookmarked).map((msg: any) => msg.id)
      );
      setBookmarkedMessages(bookmarked);
    } else if (selectedChatType === 'conversation' && conversationMessagesData) {
      const messagesData = conversationMessagesData.data || [];
      const convertedMessages = messagesData.map(convertServiceMessageToMessageItem);

      // Check if we have fewer messages than requested (indicates no more messages)
      if (messagesData.length < messageLimit) {
        setHasMoreMessages(false);
      }

      if (messageOffset === 0) {
        // Initial load - replace messages and scroll to bottom
        setMessages(convertedMessages.reverse()); // Reverse to show oldest first
        setTimeout(scrollToBottom, 100);
      } else {
        // Loading older messages - prepend to beginning and preserve scroll position
        // Get the viewport element
        const scrollAreaRoot = messagesContainerRef.current;
        const viewport = scrollAreaRoot?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;

        if (viewport && isLoadingMoreRef.current) {
          // Store current scroll height before adding messages
          const previousScrollHeight = viewport.scrollHeight;
          const previousScrollTop = viewport.scrollTop;

          // Update messages
          setMessages(prev => [...convertedMessages.reverse(), ...prev]);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;

          // Restore scroll position after DOM update
          requestAnimationFrame(() => {
            const newScrollHeight = viewport.scrollHeight;
            const heightDifference = newScrollHeight - previousScrollHeight;
            viewport.scrollTop = previousScrollTop + heightDifference;
            console.log('📐 Scroll adjusted:', { previousScrollHeight, newScrollHeight, heightDifference, newScrollTop: viewport.scrollTop });
          });
        } else {
          setMessages(prev => [...convertedMessages.reverse(), ...prev]);
          setIsLoadingMore(false);
          isLoadingMoreRef.current = false;
        }
      }

      setError(null);

      // Sync bookmark and pin status from server messages
      const bookmarked = new Set(
        messagesData.filter((msg: any) => msg.is_bookmarked).map((msg: any) => msg.id)
      );
      setBookmarkedMessages(bookmarked);

      const pinned = new Set(
        messagesData.filter((msg: any) => msg.is_pinned).map((msg: any) => msg.id)
      );
      setPinnedMessages(pinned);
      setShowPinnedBar(pinned.size > 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelMessagesData, conversationMessagesData, selectedChatType, selectedChatId, messageOffset]);

  // Handle query errors
  useEffect(() => {
    if (messagesErrorFromQuery) {
      // Don't show error for new conversations with no messages yet
      // Check if it's a 404 or empty response
      const isNewConversation = messages.length === 0 && selectedChatType === 'conversation';
      if (!isNewConversation) {
        setError('Failed to load messages');
      }
    } else {
      // Clear error when query succeeds
      setError(null);
    }
  }, [messagesErrorFromQuery, messages.length, selectedChatType]);

  // Sync pinned message from API
  useEffect(() => {
    if (pinnedMessageData?.data) {
      setPinnedMessages(new Set([pinnedMessageData.data.id]));
      setShowPinnedBar(true);
    } else {
      setPinnedMessages(new Set());
      setShowPinnedBar(false);
    }
  }, [pinnedMessageData]);

  // Handle channelId from URL params
  useEffect(() => {
    if (!channelId || !workspaceId) return;

    // Wait for data to load before determining type
    if (loadingConversations || loadingChannels) {
      return;
    }

    // Check if it's a conversation (DM)
    const conversation = conversations.find(c => c.id === channelId);

    if (conversation) {
      // It's a conversation - find the other participant's name
      setSelectedChatId(channelId);
      setSelectedChatType('conversation');

      // Find the other participant (not the current user)
      const otherParticipantId = conversation.participants.find((id: string) => id !== user?.id);
      let otherUser = workspaceMembers.find(m => m.user_id === otherParticipantId);

      // If not found in workspace members, check if it's a bot
      if (!otherUser) {
        const bot = bots.find(b => b.id === otherParticipantId);
        if (bot) {
          otherUser = {
            user: {
              name: bot.displayName || bot.name,
              email: `${bot.name}@bot.deskive.ai`
            }
          } as any;
        }
      }

      const displayName = otherUser?.user?.name || otherUser?.name || otherUser?.user?.email || 'Direct Message';
      setSelectedChatName(displayName);
    } else {
      // Not found in conversations list - check if it's a channel
      const channel = channels.find(c => c.id === channelId);

      if (channel) {
        // It's a channel
        setSelectedChatId(channelId);
        setSelectedChatType('channel');
        setSelectedChatName(channel.name);
        // Fetch channel members for mentions
        fetchChannelMembers(channelId);
      } else {
        // Not found in either list - could be a newly created conversation
        // Refresh conversations first (more likely to be a new conversation)
        console.log('⚠️ Chat not found in loaded data, refreshing conversations...');
        // Don't set selectedChatId until we confirm it exists - this prevents message queries from firing
        setSelectedChatName('Loading...');

        // Fetch fresh conversations data
        chatService.getConversations(workspaceId).then((freshConversations) => {
          setConversations(freshConversations);

          // Check if it's a conversation
          const updatedConversation = freshConversations.find(c => c.id === channelId);
          if (updatedConversation) {
            console.log('✅ Found as conversation after refresh');
            setSelectedChatId(channelId);
            setSelectedChatType('conversation');
            const otherParticipantId = updatedConversation.participants.find((id: string) => id !== user?.id);
            let otherUser = workspaceMembers.find(m => m.user_id === otherParticipantId);

            // If not found in workspace members, check if it's a bot
            if (!otherUser) {
              const bot = bots.find(b => b.id === otherParticipantId);
              if (bot) {
                otherUser = {
                  user: {
                    name: bot.displayName || bot.name,
                    email: `${bot.name}@bot.deskive.ai`
                  }
                } as any;
              }
            }

            const displayName = otherUser?.user?.name || otherUser?.name || otherUser?.user?.email || 'Direct Message';
            setSelectedChatName(displayName);
          } else {
            // Not a conversation, must be a channel - refresh channels
            console.log('⚠️ Not found in conversations, checking channels...');
            chatService.getChannels(workspaceId).then((freshChannels) => {
              setChannels(freshChannels);
              setStoreChannels(freshChannels); // Update Zustand store
              const updatedChannel = freshChannels.find(c => c.id === channelId);
              if (updatedChannel) {
                console.log('✅ Found as channel after refresh');
                setSelectedChatId(channelId);
                setSelectedChatType('channel');
                setSelectedChatName(updatedChannel.name);
                // Fetch channel members for mentions
                fetchChannelMembers(channelId);
              } else {
                // Chat doesn't exist - redirect to chat home
                console.error('❌ Chat not found in either conversations or channels, redirecting...');
                toast.error('Chat not found');
                // Clear selection state
                setSelectedChatId(null);
                setSelectedChatType(null);
                setSelectedChatName('');
                // Redirect to chat home
                navigate(`/workspaces/${workspaceId}/chat`, { replace: true });
              }
            }).catch((err) => {
              console.error('Failed to fetch channels:', err);
              toast.error('Failed to load chat');
              navigate(`/workspaces/${workspaceId}/chat`, { replace: true });
            });
          }
        }).catch((err) => {
          console.error('Failed to fetch conversations:', err);
          toast.error('Failed to load chat');
          navigate(`/workspaces/${workspaceId}/chat`, { replace: true });
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, workspaceId, conversations, channels, workspaceMembers, bots, user, loadingConversations, loadingChannels, navigate]);

  // Save last accessed chat to localStorage when a chat is selected
  useEffect(() => {
    if (workspaceId && selectedChatId) {
      localStorage.setItem(getLastAccessedChatKey(workspaceId), selectedChatId);
    }
  }, [workspaceId, selectedChatId]);

  // WebSocket: Join conversation/channel room and listen for real-time messages
  useEffect(() => {
    if (!selectedChatId || !selectedChatType || !isConnected) {
      return;
    }

    // Join the conversation/channel room
    const roomName = selectedChatType === 'conversation'
      ? `conversation:${selectedChatId}`
      : `channel:${selectedChatId}`;

    console.log('🚪 [WebSocket] Joining room:', roomName, {
      selectedChatType,
      selectedChatId,
      isConnected
    });
    joinRoom(roomName);

    // Listen for new messages (Backend emits 'message:new')
    const handleNewMessage = (data: any) => {
      console.log('🔔 [WebSocket] message:new event received:', {
        hasMessage: !!data.message,
        messageId: data.message?.id,
        hasAttachments: !!data.message?.attachments,
        attachmentsCount: data.message?.attachments?.length || 0,
        conversationId: data.conversation_id,
        channelId: data.channel_id,
        selectedChatId,
        selectedChatType,
        fullData: data
      });

      // Backend wraps message in data object with conversation_id/channel_id
      const messageData = data.message || data;

      // Invalidate cache for the relevant chat
      if (selectedChatType === 'conversation' && data.conversation_id) {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.conversationMessages(data.conversation_id), workspaceId]
        });
      } else if (selectedChatType === 'channel' && data.channel_id) {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.messages(data.channel_id), workspaceId]
        });
      }

      // Check if message belongs to current chat
      const isForCurrentChat = selectedChatType === 'conversation'
        ? data.conversation_id === selectedChatId
        : data.channel_id === selectedChatId;

      console.log('🔍 [WebSocket] Message check:', {
        isForCurrentChat,
        selectedChatType,
        selectedChatId,
        messageConversationId: data.conversation_id,
        messageChannelId: data.channel_id
      });

      if (isForCurrentChat) {
        const convertedMessage = convertServiceMessageToMessageItem(messageData);
        console.log('✅ [WebSocket] Message converted for current chat:', {
          id: convertedMessage.id,
          userId: convertedMessage.user.id,
          currentUserId,
          hasAttachments: (convertedMessage.attachments?.length || 0) > 0,
          attachments: convertedMessage.attachments
        });

        // Check if message already exists or is from current user (prevent duplicates from optimistic updates)
        setMessages(prev => {
          // Check if real message ID already exists
          const messageExists = prev.some(m => m.id === convertedMessage.id);
          if (messageExists) {
            console.log('⚠️ [WebSocket] Message already exists (real ID), skipping');
            return prev;
          }

          // Check if this is from the current user and we have a recent optimistic message
          const isFromCurrentUser = convertedMessage.user.id === currentUserId;
          if (isFromCurrentUser) {
            // Check if there's ANY optimistic message from current user (more lenient matching)
            // This handles cases where body content differs (e.g., content vs content_html)
            const optimisticIndex = prev.findIndex(m =>
              m.id.startsWith('temp-') &&
              m.isOptimistic &&
              m.user.id === currentUserId
            );

            if (optimisticIndex !== -1) {
              console.log('🔄 [WebSocket] Replacing optimistic message with real message');
              // Replace the optimistic message with the real one
              const newMessages = [...prev];
              newMessages[optimisticIndex] = convertedMessage;
              return newMessages;
            }
          }

          console.log('➕ [WebSocket] Adding new message to state');
          return [...prev, convertedMessage];
        });
        setTimeout(scrollToBottom, 100);
      } else {
        console.log('❌ [WebSocket] Message not for current chat, ignoring');
      }
    };

    const handleMessageUpdated = (data: any) => {
      console.log('✏️ [WebSocket] message:updated event received:', data);
      // Backend wraps message in data object
      const messageData = data.message || data;

      // Invalidate cache
      if (selectedChatType === 'conversation' && selectedChatId) {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.conversationMessages(selectedChatId), workspaceId]
        });
      } else if (selectedChatType === 'channel' && selectedChatId) {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.messages(selectedChatId), workspaceId]
        });
      }

      // Update message in UI
      setMessages(prev => prev.map(msg =>
        msg.id === messageData.id
          ? { ...convertServiceMessageToMessageItem(messageData), isEdited: true }
          : msg
      ));

      console.log(`✅ Message ${messageData.id} updated in UI`);
    };

    const handleMessageDeleted = (data: { messageId: string }) => {
      console.log('🗑️ [WebSocket] message:deleted event received:', data);

      // Invalidate cache
      if (selectedChatType === 'conversation' && selectedChatId) {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.conversationMessages(selectedChatId), workspaceId]
        });
      } else if (selectedChatType === 'channel' && selectedChatId) {
        queryClient.invalidateQueries({
          queryKey: [...chatKeys.messages(selectedChatId), workspaceId]
        });
      }

      // Remove message from UI
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== data.messageId);
        console.log(`✅ Message ${data.messageId} removed from UI`);
        return filtered;
      });
    };

    const handleReactionAdded = (data: any) => {
      // Skip if the current user is the one who reacted (already did optimistic update)
      if (data.userId === currentUserId) {
        console.log('⏭️ Skipping reaction_added for current user (already did optimistic update)');
        return;
      }

      // Update message reactions for other users
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.value === data.emoji);

          if (existingReaction) {
            // Only add if user hasn't already reacted
            if (!existingReaction.memberIds.includes(data.userId)) {
              return {
                ...msg,
                reactions: reactions.map(r =>
                  r.value === data.emoji
                    ? { ...r, count: r.count + 1, memberIds: [...r.memberIds, data.userId] }
                    : r
                )
              };
            }
            return msg; // User already in memberIds, no change needed
          } else {
            return {
              ...msg,
              reactions: [...reactions, {
                id: data.id || `reaction-${Date.now()}`,
                value: data.emoji,
                count: 1,
                memberIds: [data.userId]
              }]
            };
          }
        }
        return msg;
      }));
    };

    const handleReactionRemoved = (data: any) => {
      // Skip if the current user is the one who removed (already did optimistic update)
      if (data.userId === currentUserId) {
        return;
      }

      // Update message reactions for other users' removals
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          const reactions = msg.reactions || [];
          return {
            ...msg,
            reactions: reactions.map(r =>
              r.value === data.emoji
                ? {
                    ...r,
                    count: Math.max(0, r.count - 1),
                    memberIds: r.memberIds.filter(id => id !== data.userId)
                  }
                : r
            ).filter(r => r.count > 0)
          };
        }
        return msg;
      }));
    };

    const handleMessagesRead = (data: any) => {
      console.log('👁️ [WebSocket] messages:read event received:', data);
      const { messageIds, userId } = data;

      if (!messageIds || !Array.isArray(messageIds)) {
        console.warn('⚠️ Invalid messages:read event data');
        return;
      }

      // Increment read_by_count for all read messages
      setMessages(prev => prev.map(msg => {
        if (messageIds.includes(msg.id)) {
          const currentCount = msg.read_by_count || 0;
          console.log(`📊 Incrementing read count for message ${msg.id}: ${currentCount} -> ${currentCount + 1}`);
          return {
            ...msg,
            read_by_count: currentCount + 1
          };
        }
        return msg;
      }));
    };

    const handleUserTypingStart = (data: any) => {
      const { userId } = data;

      // Don't show typing indicator for current user
      if (userId === currentUserId) {
        return;
      }

      setUsersTyping(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);

        // Auto-scroll to bottom when typing indicator appears
        if (newSet.size > 0) {
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }

        return newSet;
      });
    };

    const handleUserTypingStop = (data: any) => {
      const { userId } = data;

      setUsersTyping(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleMessageBookmarked = (data: any) => {
      console.log('📚 [WebSocket] Message bookmark changed:', data);
      console.log('📚 [WebSocket] Full event data:', JSON.stringify(data, null, 2));
      const { messageId, bookmarked } = data;

      if (bookmarked) {
        console.log('✅ [WebSocket] Adding bookmark for message:', messageId);
        setBookmarkedMessages(prev => {
          const newSet = new Set([...prev, messageId]);
          console.log('📚 [WebSocket] Updated bookmarks:', Array.from(newSet));
          return newSet;
        });
      } else {
        console.log('❌ [WebSocket] Removing bookmark for message:', messageId);
        setBookmarkedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          console.log('📚 [WebSocket] Updated bookmarks:', Array.from(newSet));
          return newSet;
        });
      }
    };

    const handleMessagePinned = (data: any) => {
      console.log('📌 [WebSocket] Message pin changed:', data);
      const { messageId, pinned, previouslyPinnedMessages } = data;

      if (pinned) {
        // Remove any previously pinned messages
        if (previouslyPinnedMessages && Array.isArray(previouslyPinnedMessages)) {
          setPinnedMessages(new Set([messageId]));
        } else {
          setPinnedMessages(prev => new Set([...prev, messageId]));
        }
        setShowPinnedBar(true);
      } else {
        setPinnedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          if (newSet.size === 0) {
            setShowPinnedBar(false);
          }
          return newSet;
        });
      }
    };

    // Poll event handlers
    const handlePollVoted = (data: any) => {
      console.log('📊 [WebSocket] Poll voted:', data);
      const { messageId, pollId, poll } = data;

      // Update the message's linked_content with the updated poll
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.linked_content) {
          return {
            ...msg,
            linked_content: msg.linked_content.map(item => {
              if (item.type === 'poll' && item.poll?.id === pollId) {
                return { ...item, poll };
              }
              return item;
            })
          };
        }
        return msg;
      }));
    };

    const handlePollClosed = (data: any) => {
      console.log('📊 [WebSocket] Poll closed:', data);
      const { messageId, pollId, poll } = data;

      // Update the message's linked_content with the closed poll
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.linked_content) {
          return {
            ...msg,
            linked_content: msg.linked_content.map(item => {
              if (item.type === 'poll' && item.poll?.id === pollId) {
                return { ...item, poll };
              }
              return item;
            })
          };
        }
        return msg;
      }));
    };

    // Debug: Log all WebSocket events
    const handleAnyEvent = (eventName: string) => {
      return (data: any) => {
        if (eventName.includes('bookmark') || eventName.includes('pin')) {
          console.log(`🔔 [WebSocket] Event received: ${eventName}`, data);
        }
      };
    };

    // Register socket event listeners with CORRECT event names from backend
    console.log('📡 [WebSocket] Registering event listeners for room:', roomName);
    console.log('📡 [WebSocket] Available events:', ['message:new', 'message:updated', 'message:deleted', 'reaction_added', 'message:bookmarked', 'message:pinned', 'user_typing_start', 'user_typing_stop']);

    on('message:new', handleNewMessage);        // Backend emits message:new
    on('message:updated', handleMessageUpdated); // Backend emits message:updated
    on('message:deleted', handleMessageDeleted); // Backend emits message:deleted
    on('reaction_added', handleReactionAdded);
    on('reaction_removed', handleReactionRemoved);
    on('messages:read', handleMessagesRead);     // Backend emits messages:read
    on('message:bookmarked', handleMessageBookmarked); // Backend emits message:bookmarked
    on('message:pinned', handleMessagePinned);         // Backend emits message:pinned
    on('user_typing_start', handleUserTypingStart);    // Backend emits user_typing_start
    on('user_typing_stop', handleUserTypingStop);      // Backend emits user_typing_stop
    on('poll:voted', handlePollVoted);                 // Backend emits poll:voted
    on('poll:closed', handlePollClosed);               // Backend emits poll:closed

    console.log('✅ [WebSocket] All listeners registered successfully');

    // Keep old event names for backward compatibility (if backend changes)
    on('message_created', handleNewMessage);
    on('message_updated', handleMessageUpdated);
    on('message_deleted', handleMessageDeleted);

    // Cleanup: Leave room and remove listeners
    return () => {
      console.log('🚪 [WebSocket] Leaving room and cleaning up listeners:', roomName);
      leaveRoom(roomName);

      // Remove all event listeners
      off('message:new', handleNewMessage);
      off('message:updated', handleMessageUpdated);
      off('message:deleted', handleMessageDeleted);
      off('message_created', handleNewMessage);
      off('message_updated', handleMessageUpdated);
      off('message_deleted', handleMessageDeleted);
      off('reaction_added', handleReactionAdded);
      off('reaction_removed', handleReactionRemoved);
      off('messages:read', handleMessagesRead);
      off('message:bookmarked', handleMessageBookmarked);
      off('message:pinned', handleMessagePinned);
      off('user_typing_start', handleUserTypingStart);
      off('user_typing_stop', handleUserTypingStop);
      off('poll:voted', handlePollVoted);
      off('poll:closed', handlePollClosed);

      // Clear typing indicators when leaving room
      setUsersTyping(new Set());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatId, selectedChatType, isConnected]);

  // ============================================================================
  // AUTO MARK AS READ
  // ============================================================================

  // Mark channel/conversation as read when opened
  useEffect(() => {
    if (!selectedChatId || !workspaceId || !selectedChatType) return;

    const markAsRead = async () => {
      try {
        // Get the latest message ID to mark as read
        const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : undefined;

        if (selectedChatType === 'channel') {
          await chatService.markChannelAsReadWorkspace(workspaceId, selectedChatId, latestMessageId);
          console.log('✓ Channel marked as read:', selectedChatId);
        } else if (selectedChatType === 'conversation') {
          await chatService.markConversationAsRead(workspaceId, selectedChatId, latestMessageId);
          console.log('✓ Conversation marked as read:', selectedChatId);
        }

        // Invalidate queries to refresh unread counts in sidebar
        queryClient.invalidateQueries({ queryKey: chatKeys.channels() });
        queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    };

    // Mark as read after a short delay to ensure user has seen the messages
    const timeoutId = setTimeout(markAsRead, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedChatId, selectedChatType, workspaceId, messages.length, queryClient]);

  // NOTE: Workspace-wide notifications are now handled globally in WebSocketContext
  // This ensures notifications show on ALL pages, not just ChatPage

  // ============================================================================
  // INFINITE SCROLL - LOAD MORE MESSAGES
  // ============================================================================

  const handleScroll = useCallback((event: Event) => {
    const viewport = event.target as HTMLElement;

    if (!viewport) {
      console.log('📜 Scroll: No viewport');
      return;
    }

    if (isLoadingMore) {
      console.log('📜 Scroll: Already loading');
      return;
    }

    if (!hasMoreMessages) {
      console.log('📜 Scroll: No more messages');
      return;
    }

    // Check if scrolled to top (with 50px threshold)
    if (viewport.scrollTop < 50) {
      console.log('📜 Loading more messages... Current offset:', messageOffset, 'Limit:', messageLimit, 'hasMoreMessages:', hasMoreMessages);
      setIsLoadingMore(true);
      isLoadingMoreRef.current = true;
      setMessageOffset(prev => {
        const newOffset = prev + messageLimit;
        console.log('📜 Offset updated:', prev, '=>', newOffset);
        return newOffset;
      });
    }
  }, [isLoadingMore, hasMoreMessages, messageLimit, messageOffset]);

  // Attach scroll listener to ScrollArea viewport
  useEffect(() => {
    // Wait for messages to be loaded before attaching scroll listener
    if (messages.length === 0) {
      console.log('⏳ Waiting for messages before attaching scroll listener');
      return;
    }

    // Find the ScrollArea viewport element (Radix UI structure)
    const scrollAreaRoot = messagesContainerRef.current;
    if (!scrollAreaRoot) {
      console.log('⚠️ ScrollArea root not found');
      return;
    }

    // The viewport is a direct child with the data-radix-scroll-area-viewport attribute
    const viewport = scrollAreaRoot.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) {
      console.warn('⚠️ ScrollArea viewport not found');
      return;
    }

    console.log('✅ Scroll listener attached to viewport (messages count:', messages.length, ')');
    viewport.addEventListener('scroll', handleScroll);
    return () => {
      console.log('🔴 Scroll listener removed from viewport');
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, messages.length]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Get current channel's private status (outside useMemo to avoid getChannel function reference in deps)
  const currentChannel = selectedChatId && selectedChatType === 'channel' ? getChannel(selectedChatId) : null;
  const isPrivateChannel = currentChannel?.is_private || false;

  // Convert channel/workspace members to mention users
  const mentionUsers: MentionUser[] = useMemo(() => {
    const users: MentionUser[] = [];



    // Add @channel special mention for channels only
    if (selectedChatType === 'channel') {
      users.push({
        id: 'channel',
        name: 'channel',
        email: 'Notify all members in this channel',
        isSpecialMention: true
      });

      // Add installed bots as mentionable users
      installedBots.forEach(bot => {
        users.push({
          id: bot.id,
          name: bot.name,
          email: bot.displayName || bot.description || 'Bot',
          image: bot.avatarUrl,
          role: 'member',
          isOnline: bot.status === 'active',
          isSpecialMention: false
        });
      });

      

      if (isPrivateChannel) {
        // For private channels, use explicit channel members
        channelMembers.forEach(member => {
          // Don't add current user to mention list
          if (member.userId === user?.id) return;
          users.push({
            id: member.userId,
            name: member.user.name || member.user.email,
            email: member.user.email,
            image: member.user.avatarUrl,
            role: member.role === 'admin' ? 'admin' : member.role === 'moderator' ? 'moderator' : 'member',
            isOnline: member.user.status === 'online'
          });
        });
      } else {
        // For public channels, use all workspace members
        workspaceMembers.forEach(member => {
          // Don't add current user to mention list
          if (member.user_id === user?.id) return;
          users.push({
            id: member.user_id,
            name: member.user?.name || member.name || member.user?.email || member.email || 'User',
            email: member.user?.email || member.email || '',
            image: member.user?.avatar || member.avatar_url,
            role: member.role === 'admin' ? 'admin' : 'member',
            isOnline: false // Workspace members don't have online status
          });
        });
      }
    } else if (selectedChatType === 'conversation') {
      // Add installed bots in conversations
      installedBots.forEach(bot => {
        users.push({
          id: bot.id,
          name: bot.name,
          email: bot.displayName || bot.description || 'Bot',
          image: bot.avatarUrl,
          role: 'member',
          isOnline: bot.status === 'active',
          isSpecialMention: false
        });
      });

      // For conversations, use conversation members
      conversationMembers.forEach(member => {
        // Don't add current user to mention list
        if (member.userId === user?.id) return;
        users.push({
          id: member.userId,
          name: member.user?.name || member.user?.email || 'User',
          email: member.user?.email || '',
          image: member.user?.avatarUrl,
          isOnline: false
        });
      });
    }

    return users;
  }, [channelMembers, workspaceMembers, conversationMembers, selectedChatType, selectedChatId, isPrivateChannel, user?.id, installedBots]);

  return (
    <div className="h-full flex bg-background dark:bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChatId ? (
          <>
            {/* Chat Header */}
            <div className="bg-background dark:bg-background border-b border-border px-6 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedChatType === 'channel' ? (
                    // Show Lock icon for private channels, Hash for public channels
                    getChannel(selectedChatId)?.is_private ? (
                      <Lock className="w-6 h-6 text-foreground" />
                    ) : (
                      <Hash className="w-6 h-6 text-foreground" />
                    )
                  ) : (
                    <MessageSquare className="w-6 h-6 text-foreground" />
                  )}
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold text-foreground">
                      {selectedChatName}
                    </h1>
                    {/* <span className="text-sm text-muted-foreground">
                      {selectedChatType === 'channel' ? 'General discussions' : 'Direct Message'}
                    </span> */}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search Bar */}
                  <div className="relative w-64 flex items-center gap-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={intl.formatMessage({ id: 'modules.chat.search.searchMessages' })}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9 pr-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
                      />
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearSearch}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Search Results Navigation */}
                    {searchResults.length > 0 && (
                      <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {currentSearchIndex + 1} / {searchResults.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePreviousSearchResult}
                          className="h-7 w-7 p-0"
                          title={intl.formatMessage({ id: 'modules.chat.search.previousResult' })}
                        >
                          <ChevronDown className="w-4 h-4 rotate-180" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNextSearchResult}
                          className="h-7 w-7 p-0"
                          title={intl.formatMessage({ id: 'modules.chat.search.nextResult' })}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Call Buttons - Only show for DMs (conversations) */}
                  {selectedChatType === 'conversation' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-md hover:bg-muted"
                        title={intl.formatMessage({ id: 'modules.chat.calls.voiceCall', defaultMessage: 'Voice call' })}
                        onClick={handleStartAudioCall}
                      >
                        <Phone className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-md hover:bg-muted"
                        title={intl.formatMessage({ id: 'modules.chat.calls.videoCall', defaultMessage: 'Video call' })}
                        onClick={handleStartVideoCall}
                      >
                        <Video className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                  {/* Select Messages Button */}
                  <Button
                    variant={selectionMode ? "secondary" : "ghost"}
                    size="icon"
                    className={`h-9 w-9 rounded-md ${selectionMode ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'hover:bg-muted'}`}
                    title={selectionMode ? "Exit selection mode" : "Select messages"}
                    onClick={handleToggleSelectionMode}
                  >
                    <CheckSquare className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-md hover:bg-muted"
                    title={intl.formatMessage({ id: 'modules.chat.pinnedMessages.title' })}
                    onClick={() => setShowBookmarkedModal(true)}
                  >
                    <Bookmark className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-md hover:bg-muted"
                    title="Scheduled Messages"
                    onClick={() => setShowScheduledMessagesPanel(true)}
                  >
                    <Clock className="w-5 h-5" />
                  </Button>
                  {/* <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMinimized}
                    className="h-9 w-9 rounded-md hover:bg-muted"
                    title="Toggle AI Summaries"
                  >
                    <PanelRight className="w-5 h-5" />
                  </Button> */}
                </div>
              </div>
            </div>

            {/* Pinned Messages Bar */}
            {showPinnedBar && pinnedMessages.size > 0 && pinnedMessageData?.data && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
                <div className="flex items-start gap-3">
                  <Pin className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        Pinned message
                      </span>
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">
                        • {(pinnedMessageData.data as any).sender?.full_name || (pinnedMessageData.data as any).sender?.username || pinnedMessageData.data.user?.name || 'Unknown'}
                      </span>
                    </div>
                    <div
                      className="text-sm text-yellow-800 dark:text-yellow-200 line-clamp-2 prose prose-sm dark:prose-invert max-w-none [&>*]:m-0 [&_p]:m-0"
                      dangerouslySetInnerHTML={{
                        __html: pinnedMessageData.data.content || ''
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPinnedBar(false)}
                    className="h-6 w-6 p-0 flex-shrink-0 hover:bg-yellow-200 dark:hover:bg-yellow-900"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Selection Bar */}
            {selectionMode && selectedMessageIds.size > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 border-b border-blue-200 dark:border-blue-800 px-6 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {intl.formatMessage(
                      { id: 'modules.chat.selection.selected' },
                      { count: selectedMessageIds.size }
                    )}
                  </span>
                  {/* Divider */}
                  <div className="h-4 w-px bg-blue-200 dark:bg-blue-700" />
                  {/* AI Actions Toolbar */}
                  <MessageSelectionAIToolbar
                    selectedMessages={getSelectedMessages()}
                    onAIAction={handleAIAction}
                    isProcessing={aiActionLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {intl.formatMessage({ id: 'modules.chat.selection.deleteSelected' })}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedMessageIds(new Set());
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <ScrollArea ref={messagesContainerRef} className="flex-1 px-6 py-4">
              {error && (
                  <div className="mb-4 p-4 bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 dark:border-destructive/30 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 text-destructive mr-2" />
                    <span className="text-destructive">{error}</span>
                  </div>
                )}

                {loadingMessagesFromQuery && messageOffset === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading messages...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Load more indicator at top */}
                    {isLoadingMore && hasMoreMessages && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading older messages...</span>
                      </div>
                    )}

                    {!hasMoreMessages && messages.length > 0 && (
                      <div className="text-center py-2 text-xs text-muted-foreground">
                        No more messages
                      </div>
                    )}

                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>{intl.formatMessage({ id: 'modules.chat.page.emptyState', defaultMessage: 'No messages yet. Start the conversation!' })}</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                      <div
                        key={message.id}
                        data-message-id={message.id}
                        className={`transition-all duration-300 ${
                          searchResults.includes(message.id) && currentSearchIndex !== -1 && searchResults[currentSearchIndex] === message.id
                            ? 'ring-2 ring-primary ring-offset-2 rounded-lg'
                            : ''
                        }`}
                      >
                        <MessageItem
                          message={message}
                          messages={messages}
                          currentUserId={currentUserId}
                          isSelectionMode={selectionMode}
                          isSelected={selectedMessageIds.has(message.id)}
                          isPinned={pinnedMessages.has(message.id)}
                          isBookmarked={bookmarkedMessages.has(message.id)}
                          getMemberInfo={getMemberInfo}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onReact={handleReactToMessage}
                          onReply={handleReply}
                          onOpenThread={handleOpenThread}
                          onPin={handlePinMessage}
                          onUnpin={handleUnpinMessage}
                          onBookmark={handleBookmarkMessage}
                          onUnbookmark={handleUnbookmarkMessage}
                          onSelect={handleSelectMessage}
                          onLinkedContentClick={handleLinkedContentClick}
                          onDownloadAttachment={handleDownloadAttachment}
                        />
                      </div>
                    ))
                  )}

                  {/* Typing Indicator - WhatsApp/Messenger Style */}
                  {usersTyping.size > 0 && (
                    <div className="px-4 py-3 flex items-start gap-3">
                      {/* Avatar placeholder */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {(() => {
                          if (usersTyping.size === 1) {
                            const userId = Array.from(usersTyping)[0];
                            const member = [...channelMembers, ...workspaceMembers].find((m: any) => m.userId === userId || m.user_id === userId || m.id === userId);
                            const name = (member as any)?.user?.name || (member as any)?.name || 'U';
                            return name.charAt(0).toUpperCase();
                          }
                          return usersTyping.size > 1 ? usersTyping.size : '?';
                        })()}
                      </div>

                      {/* Typing bubble */}
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {(() => {
                            if (usersTyping.size === 1) {
                              const userId = Array.from(usersTyping)[0];
                              const member = [...channelMembers, ...workspaceMembers].find((m: any) => m.userId === userId || m.user_id === userId || m.id === userId);
                              const name = (member as any)?.user?.name || (member as any)?.name || 'Someone';
                              return name;
                            } else if (usersTyping.size === 2) {
                              const names = Array.from(usersTyping).slice(0, 2).map(userId => {
                                const member = [...channelMembers, ...workspaceMembers].find((m: any) => m.userId === userId || m.user_id === userId || m.id === userId);
                                return (member as any)?.user?.name || (member as any)?.name || 'Someone';
                              });
                              return names.join(' and ');
                            } else {
                              return `${usersTyping.size} people`;
                            }
                          })()}
                        </span>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                          <div className="flex gap-1">
                            <div
                              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                              style={{
                                animationDelay: '0ms',
                                animationDuration: '1.4s',
                                animationIterationCount: 'infinite'
                              }}
                            />
                            <div
                              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                              style={{
                                animationDelay: '0.2s',
                                animationDuration: '1.4s',
                                animationIterationCount: 'infinite'
                              }}
                            />
                            <div
                              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
                              style={{
                                animationDelay: '0.4s',
                                animationDuration: '1.4s',
                                animationIterationCount: 'infinite'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input Area */}
            {!selectionMode && (
              <div className="relative">
                {/* Mention dropdown - only available for channels, not conversations */}
                {selectedChatType === 'channel' && showMentionDropdown && mentionUsers.length > 0 && (
                  <MentionDropdown
                    users={mentionUsers}
                    searchQuery={mentionQuery}
                    position={{ top: 0, left: 0 }}
                    onSelect={handleMentionSelect}
                    onClose={handleCloseMentionDropdown}
                    className="absolute bottom-full mb-2 left-6 z-50"
                  />
                )}

                {/* Reply Banner */}
                {replyingTo && (
                  <div className="px-6 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CornerUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          Replying to <span className="font-medium text-foreground">{replyingTo.user.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {stripHtml(replyingTo.body)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelReply}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <MessageInput
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onSend={sendMessage}
                  onMentionTrigger={handleMentionTrigger}
                  placeholder={intl.formatMessage(
                    { id: 'modules.chat.input.placeholder' },
                    { chat: selectedChatName }
                  )}
                  isSending={isSending}
                  showAIMode={true}
                  isAIMode={isAIMode}
                  onAIModeToggle={() => setIsAIMode(!isAIMode)}
                  showScheduleOption={true}
                  onScheduleMessage={() => setShowScheduleModal(true)}
                  onShowAIHistory={() => setShowAIHistoryModal(true)}
                  showDrivePicker={isDriveConnected}
                  onOpenDrivePicker={() => setShowDrivePicker(true)}
                  showYoutubePicker={isYoutubeConnected}
                  onOpenYoutubePicker={() => setShowYoutubePicker(true)}
                  showPollButton={selectedChatType === 'channel'}
                  onOpenPollCreator={() => setShowPollCreator(true)}
                />
              </div>
            )}
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">{intl.formatMessage({ id: 'modules.chat.emptyState.title', defaultMessage: 'Select a channel or conversation' })}</h3>
              <p className="text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.emptyState.description', defaultMessage: 'Choose a channel or direct message to start chatting' })}</p>
            </div>
          </div>
        )}
      </div>

      {/* Thread Sidebar */}
      {threadOpen && threadParentMessage && (
        <ThreadSidebar
          isOpen={threadOpen}
          parentMessage={threadParentMessage}
          threadMessages={threadMessages}
          currentUserId={currentUserId}
          onClose={handleCloseThread}
          onSendReply={handleSendThreadReply}
          onReact={handleReactToMessage}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onDownloadAttachment={handleDownloadAttachment}
        />
      )}

      {/* Schedule Message Modal */}
      <ScheduleMessageModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={async (date: Date) => {
          // Get current message content from the input
          const editor = messageInputRef.current?.getEditor();
          const content = editor?.getText()?.trim() || '';
          const contentHtml = editor?.root?.innerHTML || '';

          if (!content) {
            toast.error('Please enter a message to schedule');
            return;
          }

          if (!workspaceId) {
            toast.error('Workspace not found');
            return;
          }

          try {
            await scheduleMessageMutation.mutateAsync({
              workspaceId,
              data: {
                content,
                contentHtml,
                channelId: selectedChatType === 'channel' && selectedChatId ? selectedChatId : undefined,
                conversationId: selectedChatType === 'conversation' && selectedChatId ? selectedChatId : undefined,
                scheduledAt: date.toISOString(),
                attachments: [],
                mentions: [],
              },
            });

            toast.success(`Message scheduled for ${date.toLocaleString()}`);
            // Clear input after scheduling
            if (editor) {
              editor.setText('');
            }
            setShowScheduleModal(false);
          } catch (error) {
            console.error('Failed to schedule message:', error);
            toast.error('Failed to schedule message');
          }
        }}
      />

      {/* Scheduled Messages Panel */}
      <ScheduledMessagesPanel
        open={showScheduledMessagesPanel}
        onClose={() => setShowScheduledMessagesPanel(false)}
        workspaceId={workspaceId || ''}
      />

      {/* AI History Modal */}
      <AIHistoryModal
        open={showAIHistoryModal}
        onClose={() => setShowAIHistoryModal(false)}
      />

      {/* Poll Creator Modal */}
      <PollCreator
        open={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onCreatePoll={handleCreatePoll}
        creatorId={currentUserId}
      />

      {/* Bookmarked Messages Modal - Only render when open */}
      {showBookmarkedModal && (
        <BookmarkedMessagesModal
          open={showBookmarkedModal}
          onClose={() => setShowBookmarkedModal(false)}
          workspaceId={workspaceId || ''}
          conversationId={selectedChatType === 'conversation' && selectedChatId ? selectedChatId : undefined}
          channelId={selectedChatType === 'channel' && selectedChatId ? selectedChatId : undefined}
        />
      )}

      {/* AI Action Result Modal */}
      <AIActionResultModal
        open={showAIActionModal}
        onClose={() => {
          setShowAIActionModal(false);
          setAIAction(null);
          setAIActionResult(null);
          setAIActionError(null);
        }}
        action={aiAction}
        result={aiActionResult}
        isLoading={aiActionLoading}
        selectedMessages={getSelectedMessages()}
        onCreateNote={handleCreateNoteFromAI}
        onSendCustomPrompt={handleCustomPromptSubmit}
        error={aiActionError}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => !isDeleting && setShowDeleteConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'multiple'
                ? intl.formatMessage({ id: 'modules.chat.deleteMessages.title', defaultMessage: 'Delete Messages' })
                : intl.formatMessage({ id: 'modules.chat.deleteMessage.title', defaultMessage: 'Delete Message' })
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'multiple'
                ? intl.formatMessage(
                    { id: 'modules.chat.deleteMessages.description', defaultMessage: 'Are you sure you want to delete {count} messages? This action cannot be undone.' },
                    { count: deleteTarget?.count || 0 }
                  )
                : intl.formatMessage({ id: 'modules.chat.deleteMessage.description', defaultMessage: 'Are you sure you want to delete this message? This action cannot be undone.' })
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMessage}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {intl.formatMessage({ id: 'common.deleting', defaultMessage: 'Deleting...' })}
                </span>
              ) : (
                intl.formatMessage({ id: 'common.delete', defaultMessage: 'Delete' })
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        isOpen={filePreviewOpen}
        onClose={() => {
          setFilePreviewOpen(false);
          setFilePreviewData(null);
        }}
        file={filePreviewData}
        isLoading={filePreviewLoading}
      />

      {/* Event Preview Dialog */}
      <EventPreviewDialog
        isOpen={eventPreviewOpen}
        onClose={() => {
          setEventPreviewOpen(false);
          setEventPreviewData(null);
        }}
        event={eventPreviewData}
        isLoading={eventPreviewLoading}
      />

      {/* Google Drive File Picker Modal */}
      <ChatDrivePickerModal
        open={showDrivePicker}
        onOpenChange={setShowDrivePicker}
        onSelectFiles={handleDriveFilesSelected}
      />

      {/* YouTube Video Picker Modal */}
      <YoutubeVideoPickerModal
        isOpen={showYoutubePicker}
        onClose={() => setShowYoutubePicker(false)}
        onSelect={handleYoutubeVideoSelected}
      />
    </div>
  );
};

export default ChatPage;
