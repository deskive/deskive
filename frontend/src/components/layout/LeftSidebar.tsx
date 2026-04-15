import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { cn } from '../../lib/utils'
import type { ViewType } from './NavigationRail'
import { Button } from '../ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { chatService, useDeleteChannel, useUpdateChannel, useStarConversation, useUnstarConversation } from '@/lib/api/chat-api'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { CalendarSidebar } from '../calendar/CalendarSidebar'
import { ProjectLeftSidebar } from '../projects/ProjectLeftSidebar'
import { CreateChannelModal } from '../chat/CreateChannelModal'
import { StartConversationModal } from '../chat/StartConversationModal'
import { BrowseChannelsModal } from '../chat/BrowseChannelsModal'
import { BrowseConversationsModal } from '../chat/BrowseConversationsModal'
import { NotesLeftSidebar } from '../notes/NotesLeftSidebar'
import { ConfirmationDialog } from '../shared/ConfirmationDialog'
import { useVideoCallStore } from '../../stores/videoCallStore'
import { ScheduleMeetingModal } from '@/components/video-call'
import { toast } from 'sonner'
import { videoCallApi } from '@/lib/api/video-call-api'
import { websocketService } from '@/lib/api/websocket-api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import {
  Plus,
  Hash,
  Lock,
  MessageSquare,
  Users,
  Settings,
  Building2,
  Check,
  ChevronDown,
  User,
  Shield,
  Bell,
  Upload,
  Wand2,
  Image,
  Video,
  Music,
  Search,
  FileText as Document,
  MoreVertical,
  Edit,
  Trash,
  Phone,
  LogOut,
  BarChart3,
  FolderOpen,
  Clock,
  Star,
  Trash2,
  FileText,
  ImageIcon,
  Table2,
  Film,
  FileAudio,
  FileType,
  Cloud,
  Users2,
  FolderPlus,
  HardDrive,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { filesService, useDashboardStats, useFilesAndFolders } from '@/lib/api/files-api'
import { useStorageStats } from '../../hooks/files/useStorageStats'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useBots } from '@/lib/api/bots-api'
import { useSearchHistory } from '../../hooks/search/useSearchHistory'
import { getSavedSearches, type SavedSearch } from '../../services/searchService'
import { useProjects, projectService } from '@/lib/api/projects-api'
import { calendarApi } from '@/lib/api/calendar-api'
import { CheckCircle, Mail, Briefcase } from 'lucide-react'

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface LeftSidebarProps {
  currentView: ViewType
  isCollapsed: boolean
  onNotesCreateNote?: (parentId?: string) => void
}

export const LeftSidebar = React.memo(function LeftSidebar({ currentView, isCollapsed, onNotesCreateNote }: LeftSidebarProps) {
  const intl = useIntl()
  const navigate = useNavigate()
  const location = useLocation()
  const { workspaceId } = useParams<{ workspaceId: string }>()

  // All hooks restored - using websocketService directly instead of useWebSocket to avoid re-renders
  const { currentWorkspace, workspaces, members } = useWorkspace()
  const startCall = useVideoCallStore((state) => state.startCall)
  const { user } = useAuth()
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')
  const { data: bots = [] } = useBots(workspaceId || '')

  // Use websocketService directly instead of useWebSocket hook to avoid subscribing to context updates
  const on = React.useCallback((event: any, callback: any) => {
    const connectionState = websocketService.getConnectionState();
    console.log(`[LeftSidebar] Registering event listener for: ${event} (connected: ${connectionState.isConnected})`);
    websocketService.on(event, callback);
  }, [])
  const off = React.useCallback((event: any, callback: any) => {
    console.log(`[LeftSidebar] Unregistering event listener for: ${event}`);
    websocketService.off(event, callback);
  }, [])

  

  // Get current user's role in the workspace - memoize to prevent re-computing on every render
  const currentUserMembership = React.useMemo(() =>
    members.find(m => m.user_id === user?.id),
    [members, user?.id]
  )
  const isOwnerOrAdmin = React.useMemo(() =>
    currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin',
    [currentUserMembership?.role]
  )

  // Search history hook
  const { recentSearches } = useSearchHistory()

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [loadingSavedSearches, setLoadingSavedSearches] = useState(false)

  // Dashboard tab state
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview')

  // Dashboard stats state
  const [dashboardTasksCount, setDashboardTasksCount] = useState(0)
  const [dashboardEventsCount, setDashboardEventsCount] = useState(0)
  const [dashboardMessagesCount, setDashboardMessagesCount] = useState(0)

  // Files category state
  const [selectedCategory, setSelectedCategory] = useState('all-files')
  const [files, setFiles] = useState<any[]>([])

  // Settings section state - sync with URL parameter
  // Memoize to prevent creating new URLSearchParams on every render
  const tabFromUrl = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('tab') || 'profile'
  }, [location.search])
  const [activeSettingsSection, setActiveSettingsSection] = useState(tabFromUrl)

  // Modal states
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false)
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false)
  const [showStartConversationModal, setShowStartConversationModal] = useState(false)
  const [showBrowseChannelsModal, setShowBrowseChannelsModal] = useState(false)

  // Channel management state
  const [selectedChannelForEdit, setSelectedChannelForEdit] = useState<any | null>(null)
  const [channelToLeave, setChannelToLeave] = useState<any | null>(null)
  const [isLeavingChannel, setIsLeavingChannel] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<any | null>(null)
  const [isDeletingChannel, setIsDeletingChannel] = useState(false)

  // Chat state
  const [channels, setChannels] = useState<any[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [showBrowseConversationsModal, setShowBrowseConversationsModal] = useState(false)

  // Channel mutation hooks
  const deleteChannelMutation = useDeleteChannel()
  const updateChannelMutation = useUpdateChannel()

  // Conversation star mutation hooks
  const starConversationMutation = useStarConversation()
  const unstarConversationMutation = useUnstarConversation()

  // Sync selectedCategory with URL for files view
  useEffect(() => {
    if (currentView === 'files') {
      const pathParts = location.pathname.split('/files/').pop()?.split('/') || [];
      const fileView = pathParts[0];
      if (fileView && ['all-files', 'recent', 'starred', 'shared-with-me', 'trash', 'documents', 'pdfs', 'images', 'spreadsheets', 'videos', 'audio'].includes(fileView)) {
        setSelectedCategory(fileView);
      }
    }
  }, [location.pathname, currentView]);

  // Sync activeSettingsSection with URL for settings view
  useEffect(() => {
    if (currentView === 'settings') {
      const urlParams = new URLSearchParams(location.search);
      const tab = urlParams.get('tab') || 'profile';
      setActiveSettingsSection(tab);
    }
  }, [location.search, currentView]);

  // Fetch files for storage stats (fallback)
  useEffect(() => {
    if (currentView === 'files' && workspaceId) {
      filesService.getFiles(workspaceId)
        .then(response => setFiles(response))
        .catch(err => console.error('Error fetching files:', err))
    }
  }, [currentView, workspaceId])

  // Fetch saved searches when on search view
  useEffect(() => {
    if (currentView === 'search' && workspaceId) {
      setLoadingSavedSearches(true);
      getSavedSearches(workspaceId)
        .then(response => {
          setSavedSearches(response.data || []);
        })
        .catch(err => console.error('Error fetching saved searches:', err))
        .finally(() => setLoadingSavedSearches(false));
    }
  }, [currentView, workspaceId])

  // Fetch channels when on chat view
  useEffect(() => {
   

    if (currentView === 'chat' && workspaceId) {
      console.log('📡 Fetching channels for workspace:', workspaceId);
      setLoadingChannels(true);
      chatService.getChannels(workspaceId)
        .then(async (channelsData) => {
          console.log('📦 Channels received:', channelsData?.length || 0, 'channels', channelsData);

          if (!channelsData || channelsData.length === 0) {
            console.warn('⚠️ No channels returned from API');
            setChannels([]);
            return;
          }

          // Fetch unread count for each channel
          console.log('🔢 Starting to fetch unread counts for', channelsData.length, 'channels');
          const channelsWithUnread = await Promise.all(
            channelsData.map(async (channel) => {
              try {
                console.log('📞 Calling getChannelUnreadCount for channel:', channel.id, channel.name);
                const unreadCount = await chatService.getChannelUnreadCount(workspaceId, channel.id);
                console.log('✅ Channel unread count fetched:', { channelId: channel.id, channelName: channel.name, unreadCount });
                return { ...channel, unreadCount };
              } catch (error) {
                console.error('❌ Failed to fetch unread count for channel:', channel.id, channel.name, error);
                return { ...channel, unreadCount: 0 };
              }
            })
          );
          console.log('📋 All channels with unread counts:', channelsWithUnread);
          setChannels(channelsWithUnread);
        })
        .catch(err => {
          console.error('❌❌ CRITICAL: Failed to fetch channels:', err);
          console.error('Error details:', err.message, err.stack);
        })
        .finally(() => {
          console.log('✅ Channel loading finished');
          setLoadingChannels(false);
        });
    }
  }, [currentView, workspaceId]);

  // Fetch conversations when on chat view
  useEffect(() => {
    if (currentView === 'chat' && workspaceId) {
      setLoadingConversations(true);
      chatService.getConversations(workspaceId)
        .then(async (conversationsData) => {
          // Fetch unread count for each conversation
          const conversationsWithUnread = await Promise.all(
            conversationsData.map(async (conversation) => {
              try {
                const unreadCount = await chatService.getConversationUnreadCount(workspaceId, conversation.id);
                console.log('✅ Conversation unread count fetched:', { conversationId: conversation.id, unreadCount });
                return { ...conversation, unreadCount };
              } catch (error) {
                console.error('❌ Failed to fetch unread count for conversation:', conversation.id, error);
                return { ...conversation, unreadCount: 0 };
              }
            })
          );
          console.log('📋 All conversations with unread counts:', conversationsWithUnread);
          setConversations(conversationsWithUnread);
        })
        .catch(err => console.error('Failed to fetch conversations:', err))
        .finally(() => setLoadingConversations(false));
    }
  }, [currentView, workspaceId]);

  // Get currently open chat ID from URL - memoized
  const getCurrentChatId = useCallback((): string | null => {
    const pathParts = location.pathname.split('/chat/');
    if (pathParts.length > 1) {
      return pathParts[1].split('/')[0]; // Get the chat ID from URL
    }
    return null;
  }, [location.pathname]);

  // Handle workspace-level message events (for unread count updates) - memoized
  const handleWorkspaceMessage = useCallback(async (data: any) => {
    console.log('📬📬📬 [LeftSidebar] MESSAGE EVENT RECEIVED - THIS TRIGGERS RE-RENDER:', {
      channelId: data.channel_id,
      conversationId: data.conversation_id,
      type: data.type,
      currentPath: location.pathname
    });

    const currentChatId = getCurrentChatId();
    const messageChannelId = data.channel_id;
    const messageConversationId = data.conversation_id;

    // If message is for a channel
    if (data.type === 'channel' && messageChannelId) {
      // Only update unread count if this channel is NOT currently open
      if (currentChatId !== messageChannelId) {
        console.log(`📊 Incrementing unread count for channel ${messageChannelId}`);
        setChannels(prev => prev.map(channel => {
          if (channel.id === messageChannelId) {
            const newUnreadCount = (channel.unreadCount || 0) + 1;
            console.log(`✅ Channel ${channel.name} unread count: ${channel.unreadCount || 0} → ${newUnreadCount}`);
            return { ...channel, unreadCount: newUnreadCount };
          }
          return channel;
        }));
      } else {
        console.log(`⏭️ Skipping unread update - channel ${messageChannelId} is currently open`);
      }
    }

    // If message is for a conversation
    if (data.type === 'conversation' && messageConversationId) {
      // Only update unread count if this conversation is NOT currently open
      if (currentChatId !== messageConversationId) {
        console.log(`📊 Incrementing unread count for conversation ${messageConversationId}`);
        setConversations(prev => prev.map(conversation => {
          if (conversation.id === messageConversationId) {
            const newUnreadCount = (conversation.unreadCount || 0) + 1;
            console.log(`✅ Conversation unread count: ${conversation.unreadCount || 0} → ${newUnreadCount}`);
            return { ...conversation, unreadCount: newUnreadCount };
          }
          return conversation;
        }));
      } else {
        console.log(`⏭️ Skipping unread update - conversation ${messageConversationId} is currently open`);
      }
    }
  }, [getCurrentChatId, location.pathname]);

  // Listen for read events to reset unread counts - memoized
  const handleChannelRead = useCallback((data: any) => {
    console.log('✓ [LeftSidebar] channel:read event received:', data);
    if (data.channelId) {
      setChannels(prev => prev.map(channel =>
        channel.id === data.channelId ? { ...channel, unreadCount: 0 } : channel
      ));
    }
  }, []);

  const handleConversationRead = useCallback((data: any) => {
    console.log('✓ [LeftSidebar] conversation:read event received:', data);
    if (data.conversationId) {
      setConversations(prev => prev.map(conversation =>
        conversation.id === data.conversationId ? { ...conversation, unreadCount: 0 } : conversation
      ));
    }
  }, []);

  // Real-time unread count updates via WebSocket
  useEffect(() => {
    if (currentView !== 'chat' || !workspaceId) {
      console.log('[LeftSidebar] Skipping WebSocket listener registration - not on chat view or no workspaceId');
      return;
    }

    console.log('[LeftSidebar] Registering WebSocket event listeners for workspace:', workspaceId);

    // Register event listeners - Socket.IO will handle them once connected
    on('message:new:workspace', handleWorkspaceMessage);
    on('channel:read', handleChannelRead);
    on('conversation:read', handleConversationRead);

    return () => {
      console.log('[LeftSidebar] Cleaning up WebSocket event listeners');
      // Cleanup listeners
      off('message:new:workspace', handleWorkspaceMessage);
      off('channel:read', handleChannelRead);
      off('conversation:read', handleConversationRead);
    };
  }, [currentView, workspaceId, on, off, handleWorkspaceMessage, handleChannelRead, handleConversationRead]);

  // Reset unread count when user opens a channel/conversation
  useEffect(() => {
    if (currentView !== 'chat' || !workspaceId) return;

    const pathParts = location.pathname.split('/chat/');
    if (pathParts.length > 1) {
      const openChatId = pathParts[1].split('/')[0];

      // Reset unread count for the opened channel
      setChannels(prev => prev.map(channel =>
        channel.id === openChatId ? { ...channel, unreadCount: 0 } : channel
      ));

      // Reset unread count for the opened conversation
      setConversations(prev => prev.map(conversation =>
        conversation.id === openChatId ? { ...conversation, unreadCount: 0 } : conversation
      ));
    }
  }, [currentView, workspaceId, location.pathname]);

  // Fetch dashboard stats from API (preferred source)
  const { data: dashboardStats } = useDashboardStats(workspaceId || '', {
    enabled: !!workspaceId && (currentView === 'files' || currentView === 'dashboard'),
  })

  // Fetch projects for dashboard stats
  const { data: projectsResponse } = useProjects(workspaceId || '')
  const dashboardProjects = React.useMemo(() => {
    if (!projectsResponse || currentView !== 'dashboard') return []
    return Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || [])
  }, [projectsResponse, currentView])

  // Fetch files for dashboard stats
  const { data: dashboardFiles = [] } = useFilesAndFolders(workspaceId || '', null)

  // Fetch tasks count for dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' || !workspaceId || dashboardProjects.length === 0) {
      return
    }
    Promise.all(
      dashboardProjects.map((project: any) => projectService.getTasks(workspaceId, project.id))
    ).then(taskArrays => {
      const allTasks = taskArrays.flat()
      setDashboardTasksCount(allTasks.length)
    }).catch(err => {
      console.error('Failed to fetch tasks:', err)
      setDashboardTasksCount(0)
    })
  }, [currentView, workspaceId, dashboardProjects.length])

  // Fetch events count for dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' || !workspaceId) return
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    calendarApi.getEvents(workspaceId, {
      start: start.toISOString(),
      end: end.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).then(events => {
      setDashboardEventsCount(events.length)
    }).catch(err => {
      console.error('Failed to fetch events:', err)
      setDashboardEventsCount(0)
    })
  }, [currentView, workspaceId])

  // Fetch messages count for dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' || !workspaceId) return
    chatService.getConversations(workspaceId)
      .then(conversations => {
        if (conversations.length === 0) {
          setDashboardMessagesCount(0)
          return
        }
        Promise.all(
          conversations.map((conversation: any) =>
            chatService.getConversationMessages(workspaceId, conversation.id, { limit: 1000 })
          )
        ).then(messagesArrays => {
          const totalMessages = messagesArrays.reduce((total: number, response: any) => {
            const messages = response.data || []
            return total + messages.length
          }, 0)
          setDashboardMessagesCount(totalMessages)
        }).catch(err => {
          console.error('Failed to fetch messages:', err)
          setDashboardMessagesCount(0)
        })
      })
      .catch(err => {
        console.error('Failed to fetch conversations:', err)
        setDashboardMessagesCount(0)
      })
  }, [currentView, workspaceId])

  // Calculate storage stats from files (fallback)
  const storageStats = useStorageStats(files)

  // Prefer API stats over client-side calculations
  const displayStats = {
    totalSize: dashboardStats?.storage_used_bytes ?? storageStats.totalSize,
    maxStorage: dashboardStats?.storage_total_bytes ?? storageStats.maxStorage,
    usagePercentage: dashboardStats?.storage_percentage_used ?? storageStats.usagePercentage,
    availableSpace: dashboardStats
      ? (dashboardStats.storage_total_bytes - dashboardStats.storage_used_bytes)
      : storageStats.availableSpace,
    totalFiles: dashboardStats?.total_files ?? files.length,
    fileTypeCounts: dashboardStats?.file_type_breakdown ?? storageStats.fileTypeCounts,
    planName: dashboardStats?.plan?.name ?? 'Free',
    planMaxStorageGb: dashboardStats?.plan?.max_storage_gb ?? 1,
  }

  // Get actual workspace members for video calls
  const getWorkspaceMembers = () => {
    if (!user) return [];

    return workspaceMembers
      .filter(m => m.user_id !== user.id) // Exclude current user
      .map(m => ({
        id: m.user_id,
        name: m.user?.name || m.user?.email || 'Unknown',
        avatar: m.user?.avatar || m.avatar_url,
        email: m.user?.email || '',
        status: 'online' as const, // TODO: Implement real status
      }));
  };

  // Function to refresh channels list
  const refreshChannels = async () => {
    if (!workspaceId) return;
    try {
      setLoadingChannels(true);
      const channelsData = await chatService.getChannels(workspaceId);
      setChannels(channelsData);
    } catch (err) {
      console.error('Failed to refresh channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId)
    if (workspace) {
      navigate(`/workspaces/${workspaceId}/dashboard`)
    }
  }

  const handleCreateWorkspace = () => {
    navigate('/create-workspace')
  }

  const navigateToSettingsSection = (section: string) => {
    setActiveSettingsSection(section)
    // Navigate to settings with tab query parameter
    navigate(`/workspaces/${workspaceId}/settings?tab=${section}`)
  }

  const handleCreateChannel = async (channelData: {
    name: string;
    description: string;
    type: 'channel' | 'dm';
    is_private: boolean;
  }) => {
    if (!workspaceId) return;

    try {
      // Call API to create channel
      const newChannel = await chatService.createChannel(workspaceId, channelData);

      // Close modal
      setShowCreateChannelModal(false);

      // Refresh channels list and wait for it to complete
      await refreshChannels();

      // Show success message
      toast.success(`Channel "${channelData.name}" created successfully!`);

      // Small delay to ensure state is updated
      setTimeout(() => {
        navigate(`/workspaces/${workspaceId}/chat/${newChannel.id}`);
      }, 100);
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create channel. Please try again.');
    }
  }

  const handleStartConversation = async (selectedMemberIds: string[]) => {
    if (!workspaceId || selectedMemberIds.length === 0) return;

    try {
      toast.info('Creating conversation...');

      // Call API to create conversation
      const conversation = await chatService.createConversation(workspaceId, selectedMemberIds);

      console.log('✅ Conversation created:', conversation);

      // Close modal immediately
      setShowStartConversationModal(false);

      // Refresh conversations list from server FIRST to ensure it's in the list
      try {
        const updatedConversations = await chatService.getConversations(workspaceId);
        setConversations(updatedConversations);
        console.log('✅ Conversations list refreshed with new conversation');
      } catch (refreshError) {
        console.warn('Failed to refresh conversations list, using optimistic update:', refreshError);
        // Fallback: optimistically add to conversations list if refresh fails
        setConversations(prev => {
          // Check if already exists
          const exists = prev.some(c => c.id === conversation.id);
          return exists ? prev : [...prev, conversation];
        });
      }

      // Show success message
      toast.success('Conversation created successfully!');

      // Navigate to the created conversation AFTER refresh completes
      navigate(`/workspaces/${workspaceId}/chat/${conversation.id}`);
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      toast.error(error?.message || 'Failed to create conversation. Please try again.');
    }
  }

  const handleDeleteChannel = (channel: any) => {
    // Open confirmation modal
    setChannelToDelete(channel);
  }

  const confirmDeleteChannel = async () => {
    if (!workspaceId || !channelToDelete) return;

    try {
      setIsDeletingChannel(true);

      // Call API to delete channel
      await deleteChannelMutation.mutateAsync({ workspaceId, channelId: channelToDelete.id });

      // Remove from local state
      setChannels(prev => prev.filter(c => c.id !== channelToDelete.id));

      // Show success message
      toast.success(`Channel "${channelToDelete.name}" deleted successfully!`);

      // If currently viewing this channel, navigate to chat home
      const pathParts = location.pathname.split('/chat/');
      if (pathParts.length > 1 && pathParts[1].startsWith(channelToDelete.id)) {
        navigate(`/workspaces/${workspaceId}/chat`);
      }
    } catch (error: any) {
      console.error('Failed to delete channel:', error);
      toast.error(error?.message || 'Failed to delete channel. Please try again.');
    } finally {
      setIsDeletingChannel(false);
      setChannelToDelete(null);
    }
  }

  const handleLeaveChannel = (channel: any) => {
    // Open confirmation modal
    setChannelToLeave(channel);
  }

  const confirmLeaveChannel = async () => {
    if (!workspaceId || !channelToLeave) return;

    try {
      setIsLeavingChannel(true);

      // Call API to leave channel (workspace-scoped)
      await chatService.leaveChannelWorkspace(workspaceId, channelToLeave.id);

      // Remove from local state
      setChannels(prev => prev.filter(c => c.id !== channelToLeave.id));

      // Show success message
      toast.success(`You have left the channel "${channelToLeave.name}"`);

      // If currently viewing this channel, navigate to chat home
      const pathParts = location.pathname.split('/chat/');
      if (pathParts.length > 1 && pathParts[1].startsWith(channelToLeave.id)) {
        navigate(`/workspaces/${workspaceId}/chat`);
      }

      // Close modal
      setChannelToLeave(null);
    } catch (error: any) {
      console.error('Failed to leave channel:', error);
      toast.error(error?.message || 'Failed to leave channel. Please try again.');
    } finally {
      setIsLeavingChannel(false);
    }
  }

  const handleUpdateChannel = async (channelData: {
    name: string;
    description: string;
    type: 'channel' | 'dm';
    is_private: boolean;
    member_ids?: string[];
  }) => {
    if (!selectedChannelForEdit || !workspaceId) return;

    try {
      toast.info('Updating channel...');

      // Prepare update data - include member_ids for private channels
      const updateData = {
        name: channelData.name,
        description: channelData.description,
        is_private: channelData.is_private,
        ...(channelData.is_private && channelData.member_ids ? { member_ids: channelData.member_ids } : {})
      };

      // Call API to update channel
      await updateChannelMutation.mutateAsync({
        workspaceId,
        channelId: selectedChannelForEdit.id,
        data: updateData
      });

      // Update local state
      setChannels(prev => prev.map(c =>
        c.id === selectedChannelForEdit.id
          ? { ...c, name: channelData.name, description: channelData.description, is_private: channelData.is_private }
          : c
      ));

      // Close modal and reset selection
      setSelectedChannelForEdit(null);

      // Show success message
      toast.success(`Channel "${channelData.name}" updated successfully!`);

      // Refresh channels list to get latest data
      await refreshChannels();
    } catch (error: any) {
      console.error('Failed to update channel:', error);
      toast.error(error?.message || 'Failed to update channel. Please try again.');
    }
  }

  const getSidebarContent = () => {
    switch (currentView) {
      case 'dashboard':
        // Dashboard view doesn't need a left sidebar - stats are shown in main content
        return null
      
      case 'chat':
        return (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {intl.formatMessage({ id: 'modules.chat.channels.title', defaultMessage: 'Channels' })}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => setShowBrowseChannelsModal(true)}
                  title={intl.formatMessage({ id: 'modules.chat.channels.browse', defaultMessage: 'Browse Channels' })}
                >
                  <Search className="h-3 w-3" />
                </Button>
                {isOwnerOrAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted"
                    onClick={() => setShowCreateChannelModal(true)}
                    title={intl.formatMessage({ id: 'modules.chat.channels.create', defaultMessage: 'Create Channel' })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {loadingChannels ? (
              <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="w-4 h-4 bg-muted animate-pulse rounded" />
                    <div className="flex-1 h-4 bg-muted animate-pulse rounded" style={{ width: `${60 + (i * 10)}%` }} />
                  </div>
                ))}
              </div>
            ) : channels.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.channels.empty', defaultMessage: 'No channels yet' })}</div>
              </div>
            ) : (
              channels.map((channel) => {
                // Check if current user is workspace owner
                const isWorkspaceOwner = currentWorkspace?.owner_id === user?.id;
                // Check if this is the default "general" channel (users shouldn't leave general)
                const isGeneralChannel = channel.name?.toLowerCase() === 'general';

                return (
                  <div key={channel.id} className="flex items-center gap-1 group">
                    <div className="flex-1">
                      <SidebarItem
                        icon={channel.is_private ? <Lock className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                        label={channel.name}
                        badge={channel.unreadCount && channel.unreadCount > 0 ? String(channel.unreadCount) : undefined}
                        onClick={() => navigate(`/workspaces/${workspaceId}/chat/${channel.id}`)}
                      />
                    </div>

                    {/* Channel context menu - show for everyone */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {/* Owner/Admin options */}
                        {isOwnerOrAdmin && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChannelForEdit(channel);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {intl.formatMessage({ id: 'modules.chat.channels.edit', defaultMessage: 'Edit Channel' })}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChannel(channel);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              {intl.formatMessage({ id: 'modules.chat.channels.delete', defaultMessage: 'Delete Channel' })}
                            </DropdownMenuItem>
                          </>
                        )}
                        {/* Member leave option - not for general channel or workspace owner */}
                        {!isGeneralChannel && !isWorkspaceOwner && (
                          <>
                            {isOwnerOrAdmin && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLeaveChannel(channel);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              {intl.formatMessage({ id: 'modules.chat.channels.leave', defaultMessage: 'Leave Channel' })}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}

            <div className="flex items-center justify-between mb-2 mt-6">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {intl.formatMessage({ id: 'modules.chat.directMessages.title', defaultMessage: 'Direct Messages' })}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => setShowBrowseConversationsModal(true)}
                  title={intl.formatMessage({ id: 'modules.chat.conversations.browse', defaultMessage: 'Browse conversations' })}
                >
                  <Search className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => setShowStartConversationModal(true)}
                  title={intl.formatMessage({ id: 'modules.chat.conversations.start', defaultMessage: 'Start conversation' })}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {loadingConversations ? (
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="w-6 h-6 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 h-4 bg-muted animate-pulse rounded" style={{ width: `${50 + (i * 15)}%` }} />
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.directMessages.empty', defaultMessage: 'No conversations yet' })}</div>
              </div>
            ) : (
              conversations.map((conversation) => {
                // Find the other participant (not the current user)
                const otherParticipantId = conversation.participants.find((id: string) => {
                  return id !== user?.id;
                });

                // Find the member details from workspace members OR bots
                let otherUser = workspaceMembers.find(m => m.user_id === otherParticipantId);

                // If not found in workspace members, check if it's a bot
                if (!otherUser) {
                  const bot = bots.find(b => b.id === otherParticipantId);
                  if (bot) {
                    // Create a user-like object for the bot
                    otherUser = {
                      id: bot.id,
                      user_id: bot.id,
                      name: bot.displayName || bot.name,
                      email: `${bot.name}@bot.deskive.ai`,
                      avatar_url: bot.avatarUrl,
                      user: {
                        name: bot.displayName || bot.name,
                        email: `${bot.name}@bot.deskive.ai`,
                        avatar: bot.avatarUrl
                      }
                    } as any;
                  }
                }

                if (!otherUser) {
                  console.warn('⚠️ Could not find user or bot details for participant:', otherParticipantId);
                  return null;
                }

                const displayName = otherUser.user?.name || otherUser.name || otherUser.user?.email || 'Unknown';
                const avatarUrl = otherUser.user?.avatar || otherUser.avatar_url;
                const isStarred = conversation.isStarred === true;

                const handleToggleStar = async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!workspaceId) return;

                  // Helper function to sort conversations (starred first, then by updated_at)
                  const sortConversations = (convs: any[]) => {
                    return [...convs].sort((a, b) => {
                      if (a.isStarred && !b.isStarred) return -1;
                      if (!a.isStarred && b.isStarred) return 1;
                      if (a.isStarred && b.isStarred) {
                        const aTime = a.starredAt ? new Date(a.starredAt).getTime() : 0;
                        const bTime = b.starredAt ? new Date(b.starredAt).getTime() : 0;
                        return bTime - aTime;
                      }
                      const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                      const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                      return bUpdated - aUpdated;
                    });
                  };

                  try {
                    if (isStarred) {
                      await unstarConversationMutation.mutateAsync({ workspaceId, conversationId: conversation.id });
                      // Optimistically update local state and re-sort
                      setConversations(prev => sortConversations(prev.map(c =>
                        c.id === conversation.id ? { ...c, isStarred: false, starredAt: null } : c
                      )));
                    } else {
                      await starConversationMutation.mutateAsync({ workspaceId, conversationId: conversation.id });
                      // Optimistically update local state and re-sort
                      setConversations(prev => sortConversations(prev.map(c =>
                        c.id === conversation.id ? { ...c, isStarred: true, starredAt: new Date().toISOString() } : c
                      )));
                    }
                  } catch (error) {
                    console.error('Failed to toggle star:', error);
                    toast.error('Failed to update star status');
                  }
                };

                return (
                  <div key={conversation.id} className="flex items-center gap-1 group">
                    <div className="flex-1">
                      <SidebarItem
                        icon={<MessageSquare className="h-3 w-3" />}
                        label={displayName}
                        badge={conversation.unreadCount > 0 ? conversation.unreadCount.toString() : undefined}
                        showAvatar={true}
                        userImage={avatarUrl}
                        userName={otherUser.user?.name || otherUser.name || otherUser.email}
                        onClick={() => navigate(`/workspaces/${workspaceId}/chat/${conversation.id}`)}
                      />
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 w-6 p-0 transition-opacity",
                              isStarred ? "opacity-100 text-yellow-500" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-yellow-500"
                            )}
                            onClick={handleToggleStar}
                            disabled={starConversationMutation.isPending || unstarConversationMutation.isPending}
                          >
                            <Star className={cn("h-3 w-3", isStarred && "fill-current")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{isStarred ? 'Remove from starred' : 'Add to starred'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })
            )}
          </>
        )
      
      case 'projects':
        return (
          <ProjectLeftSidebar
            workspaceId={workspaceId || ''}
            onProjectSelect={(projectId) => {
              navigate(`/workspaces/${workspaceId}/projects/${projectId}`)
            }}
          />
        )

      case 'calendar':
        return <CalendarSidebar 
          onSettingsClick={() => {
            window.dispatchEvent(new CustomEvent('openCalendarSettings'))
          }}
        />

      case 'files':
        return (
          <>
            <div className="mb-4">
              <Button
                className="w-full justify-start btn-gradient-primary"
                onClick={() => {
                  console.log('Upload button clicked');
                  window.dispatchEvent(new CustomEvent('openFileUpload'));
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: 'modules.files.buttons.upload', defaultMessage: 'Upload' })}
              </Button>
            </div>

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Wand2 className="inline-block w-3 h-3 mr-1" />
              {intl.formatMessage({ id: 'modules.files.ai.heading', defaultMessage: 'AI ACTIONS' })}
            </div>
            <SidebarItem
              icon={<Image className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.ai.image', defaultMessage: 'AI Image' })}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAICreation', { detail: { type: 'image' } }));
              }}
            />
            <SidebarItem
              icon={<Video className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.ai.video', defaultMessage: 'AI Video' })}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAICreation', { detail: { type: 'video' } }));
              }}
            />
            <SidebarItem
              icon={<Music className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.ai.audio', defaultMessage: 'AI Audio' })}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAICreation', { detail: { type: 'audio' } }));
              }}
            />
            <SidebarItem
              icon={<Document className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.ai.document', defaultMessage: 'AI Documents' })}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAICreation', { detail: { type: 'document' } }));
              }}
            />

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">
              {intl.formatMessage({ id: 'modules.files.fileManager', defaultMessage: 'FILE MANAGER' })}
            </div>
            <SidebarItem
              icon={<FolderOpen className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.views.allFiles', defaultMessage: 'All Files' })}
              active={selectedCategory === 'all-files'}
              onClick={() => {
                setSelectedCategory('all-files');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'all-files' } }));
              }}
            />
            <SidebarItem
              icon={<Clock className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.views.recent', defaultMessage: 'Recent' })}
              active={selectedCategory === 'recent'}
              onClick={() => {
                setSelectedCategory('recent');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'recent' } }));
              }}
            />
            <SidebarItem
              icon={<Star className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.views.starred', defaultMessage: 'Starred' })}
              active={selectedCategory === 'starred'}
              onClick={() => {
                setSelectedCategory('starred');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'starred' } }));
              }}
            />
            <SidebarItem
              icon={<Trash2 className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.views.trash', defaultMessage: 'Trash' })}
              active={selectedCategory === 'trash'}
              onClick={() => {
                setSelectedCategory('trash');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'trash' } }));
              }}
            />

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">
              {intl.formatMessage({ id: 'modules.files.fileTypes.heading', defaultMessage: 'FILE TYPES' })}
            </div>
            <SidebarItem
              icon={<FileText className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.fileTypes.documents', defaultMessage: 'Documents' })}
              badge={displayStats.fileTypeCounts.documents > 0 ? displayStats.fileTypeCounts.documents.toString() : undefined}
              active={selectedCategory === 'documents'}
              onClick={() => {
                setSelectedCategory('documents');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'documents' } }));
              }}
            />
            <SidebarItem
              icon={<ImageIcon className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.fileTypes.images', defaultMessage: 'Images' })}
              badge={displayStats.fileTypeCounts.images > 0 ? displayStats.fileTypeCounts.images.toString() : undefined}
              active={selectedCategory === 'images'}
              onClick={() => {
                setSelectedCategory('images');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'images' } }));
              }}
            />
            <SidebarItem
              icon={<Table2 className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.fileTypes.spreadsheets', defaultMessage: 'Spreadsheets' })}
              badge={displayStats.fileTypeCounts.spreadsheets > 0 ? displayStats.fileTypeCounts.spreadsheets.toString() : undefined}
              active={selectedCategory === 'spreadsheets'}
              onClick={() => {
                setSelectedCategory('spreadsheets');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'spreadsheets' } }));
              }}
            />
            <SidebarItem
              icon={<Film className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.fileTypes.videos', defaultMessage: 'Videos' })}
              badge={displayStats.fileTypeCounts.videos > 0 ? displayStats.fileTypeCounts.videos.toString() : undefined}
              active={selectedCategory === 'videos'}
              onClick={() => {
                setSelectedCategory('videos');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'videos' } }));
              }}
            />
            <SidebarItem
              icon={<FileAudio className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.fileTypes.audio', defaultMessage: 'Audio' })}
              badge={displayStats.fileTypeCounts.audio > 0 ? displayStats.fileTypeCounts.audio.toString() : undefined}
              active={selectedCategory === 'audio'}
              onClick={() => {
                setSelectedCategory('audio');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'audio' } }));
              }}
            />
            <SidebarItem
              icon={<FileType className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.fileTypes.pdfs', defaultMessage: 'PDFs' })}
              badge={displayStats.fileTypeCounts.pdfs > 0 ? displayStats.fileTypeCounts.pdfs.toString() : undefined}
              active={selectedCategory === 'pdfs'}
              onClick={() => {
                setSelectedCategory('pdfs');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'pdfs' } }));
              }}
            />

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">
              {intl.formatMessage({ id: 'modules.files.storageHeading', defaultMessage: 'STORAGE' })}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="px-2 mb-3 cursor-pointer">
                    <div className="text-sm mb-2">
                      <div className="flex justify-between text-xs">
                        <span>{intl.formatMessage({ id: 'modules.files.storage.used', defaultMessage: 'Used' })}</span>
                        <span>{formatFileSize(displayStats.totalSize)} / {formatFileSize(displayStats.maxStorage)}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            displayStats.usagePercentage < 60 && "bg-green-600",
                            displayStats.usagePercentage >= 60 && displayStats.usagePercentage < 80 && "bg-yellow-600",
                            displayStats.usagePercentage >= 80 && "bg-red-600"
                          )}
                          style={{ width: `${Math.min(displayStats.usagePercentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className={cn(
                          "font-medium",
                          displayStats.usagePercentage < 60 && "text-green-600",
                          displayStats.usagePercentage >= 60 && displayStats.usagePercentage < 80 && "text-yellow-600",
                          displayStats.usagePercentage >= 80 && "text-red-600"
                        )}>
                          {intl.formatMessage({ id: 'modules.files.storage.percentUsed', defaultMessage: '{percent}% used' }, { percent: displayStats.usagePercentage.toFixed(0) })}
                        </span>
                        <span className="text-muted-foreground">
                          {formatFileSize(displayStats.availableSpace)} {intl.formatMessage({ id: 'modules.files.storage.free', defaultMessage: 'Free' }).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="w-64">
                  <div className="space-y-2">
                    <div className="font-semibold">Storage Details</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Files:</span>
                        <span className="font-medium">{displayStats.totalFiles.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Used Space:</span>
                        <span className="font-medium">{formatFileSize(displayStats.totalSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available:</span>
                        <span className="font-medium text-green-600">{formatFileSize(displayStats.availableSpace)}</span>
                      </div>
                    </div>
                    {displayStats.usagePercentage > 80 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-yellow-600">
                          <strong>Warning:</strong> You're using {displayStats.usagePercentage.toFixed(0)}% of your storage.
                        </p>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <SidebarItem icon={<Cloud className="h-3 w-3" />} label={intl.formatMessage({ id: 'modules.files.storage.upgradeStorage', defaultMessage: 'Upgrade Storage' })} />

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">
              {intl.formatMessage({ id: 'modules.files.shared.heading', defaultMessage: 'SHARED' })}
            </div>
            <SidebarItem
              icon={<Users2 className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'modules.files.shared.sharedWithMe', defaultMessage: 'Shared with me' })}
              active={selectedCategory === 'shared-with-me'}
              onClick={() => {
                setSelectedCategory('shared-with-me');
                window.dispatchEvent(new CustomEvent('filesCategoryChanged', { detail: { category: 'shared-with-me' } }));
              }}
            />
          </>
        )

      case 'notes':
        return (
          <NotesLeftSidebar />
        )

      case 'video':
        return (
          <>
            {/* Quick Actions - Commented out as per user request */}
            {/* <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Actions
            </div>
            <SidebarItem
              icon="📹"
              label="Start Video Call"
              active
              onClick={async () => {
                try {
                  // Get actual workspace members for video call
                  const members = getWorkspaceMembers()

                  if (members.length === 0) {
                    toast.error('No other workspace members available for call')
                    return
                  }

                  const participants = members.map(member => ({
                    id: member.id,
                    user_id: member.id,
                    name: member.name,
                    avatar: member.avatar,
                    email: member.email,
                    role: 'participant' as const,
                    // Frontend style
                    isAudioMuted: false,
                    isVideoMuted: false,
                    isScreenSharing: false,
                    isHandRaised: false,
                    isSpeaking: false,
                    // Backend style (same values)
                    is_audio_muted: false,
                    is_video_muted: false,
                    is_screen_sharing: false,
                    is_hand_raised: false,
                    // Optional backend fields
                    video_call_id: undefined,
                    created_at: new Date().toISOString()
                  }))

                  await startCall(workspaceId || '', participants, 'video', participants.length > 1)
                  console.log('Video call started with participants:', participants)
                } catch (error) {
                  console.error('Failed to start video call:', error)
                  toast.error('Failed to start video call')
                }
              }}
            />
            <SidebarItem
              icon="📞"
              label="Audio Call"
              onClick={async () => {
                try {
                  // Get actual workspace members for audio call
                  const members = getWorkspaceMembers()

                  if (members.length === 0) {
                    toast.error('No other workspace members available for call')
                    return
                  }

                  const participants = members.map(member => ({
                    id: member.id,
                    user_id: member.id,
                    name: member.name,
                    avatar: member.avatar,
                    email: member.email,
                    role: 'participant' as const,
                    // Frontend style
                    isAudioMuted: false,
                    isVideoMuted: true, // Audio call, so video is disabled
                    isScreenSharing: false,
                    isHandRaised: false,
                    isSpeaking: false,
                    // Backend style (same values)
                    is_audio_muted: false,
                    is_video_muted: true,
                    is_screen_sharing: false,
                    is_hand_raised: false,
                    // Optional backend fields
                    video_call_id: undefined,
                    created_at: new Date().toISOString()
                  }))

                  await startCall(workspaceId || '', participants, 'audio', participants.length > 1)
                  console.log('Audio call started with participants:', participants)
                } catch (error) {
                  console.error('Failed to start audio call:', error)
                  toast.error('Failed to start audio call')
                }
              }}
            />
            <SidebarItem
              icon="📅"
              label="Schedule Meeting"
              onClick={() => {
                console.log('Opening schedule meeting modal')
                setShowScheduleMeetingModal(true)
              }}
            /> */}

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Workspace Members
            </div>
            {workspaceMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/70 dark:hover:bg-muted mb-1 group">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user?.avatar || member.avatar_url} alt={member.user?.name} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    {(member.user?.name || member.user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user?.name || member.user?.email || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}
                  </p>
                </div>
                {member.user_id !== user?.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const memberName = member.user?.name || member.user?.email || 'Unknown'
                        try {
                          toast.loading(`Starting audio call with ${memberName}...`)

                          // Create call via API
                          const call = await videoCallApi.createCall(workspaceId || '', {
                            title: `Audio Call with ${memberName}`,
                            description: `Instant audio call`,
                            call_type: 'audio',
                            is_group_call: false,
                            participant_ids: [member.user_id],
                            recording_enabled: false,
                          })

                          toast.dismiss()
                          toast.success(`Call started!`)

                          // Open call in new window
                          const callUrl = `/call/${workspaceId}/${call.id}`
                          const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
                          window.open(callUrl, `video-call-${call.id}`, windowFeatures)
                        } catch (error) {
                          toast.dismiss()
                          console.error('Failed to start audio call:', error)
                          toast.error('Failed to start audio call')
                        }
                      }}
                      title="Start audio call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const memberName = member.user?.name || member.user?.email || 'Unknown'
                        try {
                          toast.loading(`Starting video call with ${memberName}...`)

                          // Create call via API
                          const call = await videoCallApi.createCall(workspaceId || '', {
                            title: `Video Call with ${memberName}`,
                            description: `Instant video call`,
                            call_type: 'video',
                            is_group_call: false,
                            participant_ids: [member.user_id],
                            recording_enabled: false,
                          })

                          toast.dismiss()
                          toast.success(`Call started!`)

                          // Open call in new window
                          const callUrl = `/call/${workspaceId}/${call.id}`
                          const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
                          window.open(callUrl, `video-call-${call.id}`, windowFeatures)
                        } catch (error) {
                          toast.dismiss()
                          console.error('Failed to start video call:', error)
                          toast.error('Failed to start video call')
                        }
                      }}
                      title="Start video call"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Commented out for now - AI Features will be implemented later */}
            {/* <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">
              AI Features
            </div>
            <SidebarItem icon="🤖" label="Real-time Transcription" />
            <SidebarItem icon="🌐" label="Live Translation" />
            <SidebarItem icon="📝" label="Meeting Notes" /> */}
          </>
        )
      
      case 'search':
        return (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {intl.formatMessage({ id: 'modules.search.recentSearches', defaultMessage: 'RECENT SEARCHES' })}
            </div>
            {recentSearches.length > 0 ? (
              recentSearches.slice(0, 5).map((search, index) => (
                <SidebarItem
                  key={index}
                  icon={<Search className="h-3 w-3" />}
                  label={search.query}
                  onClick={() => navigate(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(search.query)}`)}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground px-3 py-2">
                {intl.formatMessage({ id: 'modules.search.noRecentSearches', defaultMessage: 'No recent searches' })}
              </div>
            )}

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
              {intl.formatMessage({ id: 'modules.search.savedSearches', defaultMessage: 'SAVED SEARCHES' })}
            </div>
            {loadingSavedSearches ? (
              <div className="text-sm text-muted-foreground px-3 py-2">
                Loading...
              </div>
            ) : savedSearches.length > 0 ? (
              savedSearches.slice(0, 5).map((saved) => (
                <SidebarItem
                  key={saved.id}
                  icon={<Star className="h-3 w-3" />}
                  label={saved.name}
                  badge={saved.result_count?.toString()}
                  onClick={() => navigate(`/workspaces/${workspaceId}/search?savedSearchId=${saved.id}`)}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground px-3 py-2">
                {intl.formatMessage({ id: 'modules.search.noSavedSearches', defaultMessage: 'No saved searches' })}
              </div>
            )}

            {/*<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
              Quick Filters
            </div>
            <SidebarItem icon="📅" label="Last 7 Days" />
            <SidebarItem icon="📅" label="Last 30 Days" />
            <SidebarItem icon="📅" label="This Year" />
            <SidebarItem icon="👤" label="Created by Me" />
            <SidebarItem icon="⭐" label="Starred Items" />*/}
          </>
        )

      case 'settings':
        return (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {intl.formatMessage({ id: 'sidebar.settings.title' })}
            </div>
            <SidebarItem
              icon={<User className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'sidebar.settings.profile' })}
              active={activeSettingsSection === 'profile'}
              onClick={() => navigateToSettingsSection('profile')}
            />
            <SidebarItem
              icon={<Shield className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'sidebar.settings.security' })}
              active={activeSettingsSection === 'security'}
              onClick={() => navigateToSettingsSection('security')}
            />
            <SidebarItem
              icon={<Bell className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'sidebar.settings.notifications' })}
              active={activeSettingsSection === 'notifications'}
              onClick={() => navigateToSettingsSection('notifications')}
            />
            <SidebarItem
              icon={<MessageSquare className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'sidebar.settings.feedback', defaultMessage: 'Feedback' })}
              active={activeSettingsSection === 'feedback'}
              onClick={() => navigateToSettingsSection('feedback')}
            />
            <SidebarItem
              icon={<Users className="h-3 w-3" />}
              label={intl.formatMessage({ id: 'sidebar.settings.team' })}
              active={activeSettingsSection === 'team'}
              onClick={() => navigateToSettingsSection('team')}
            />
            {/* Workspace Settings - Only for owner/admin */}
            {isOwnerOrAdmin && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
                  {intl.formatMessage({ id: 'sidebar.settings.workspaceSection', defaultMessage: 'WORKSPACE' })}
                </div>
                <SidebarItem
                  icon={<Building2 className="h-3 w-3" />}
                  label={intl.formatMessage({ id: 'sidebar.settings.workspace', defaultMessage: 'Workspace Settings' })}
                  active={activeSettingsSection === 'workspace'}
                  onClick={() => navigateToSettingsSection('workspace')}
                />
              </>
            )}
          </>
        )

      case 'integrations':
        return (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {intl.formatMessage({ id: 'navigation.integrations', defaultMessage: 'INTEGRATIONS' })}
            </div>
            <SidebarItem
              icon="🛒"
              label={intl.formatMessage({ id: 'modules.integrations.marketplace', defaultMessage: 'Marketplace' })}
              active
            />
            <SidebarItem
              icon="✅"
              label={intl.formatMessage({ id: 'modules.integrations.installed', defaultMessage: 'Installed' })}
            />

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
              {intl.formatMessage({ id: 'modules.integrations.categories', defaultMessage: 'CATEGORIES' })}
            </div>
            <SidebarItem
              icon="💬"
              label={intl.formatMessage({ id: 'modules.integrations.category.communication', defaultMessage: 'Communication' })}
            />
            <SidebarItem
              icon="📋"
              label={intl.formatMessage({ id: 'modules.integrations.category.projectManagement', defaultMessage: 'Project Management' })}
            />
            <SidebarItem
              icon="📁"
              label={intl.formatMessage({ id: 'modules.integrations.category.fileStorage', defaultMessage: 'File Storage' })}
            />
            <SidebarItem
              icon="📅"
              label={intl.formatMessage({ id: 'modules.integrations.category.calendar', defaultMessage: 'Calendar' })}
            />
            <SidebarItem
              icon="💻"
              label={intl.formatMessage({ id: 'modules.integrations.category.development', defaultMessage: 'Development' })}
            />
            <SidebarItem
              icon="📊"
              label={intl.formatMessage({ id: 'modules.integrations.category.crm', defaultMessage: 'CRM' })}
            />
          </>
        )

      case 'email':
        // Email has its own sidebar built into EmailPage
        return null

      case 'apps':
        // Check if user is inside Google Drive browser
        const isInsideGoogleDrive = location.pathname.includes('google-drive');

        if (isInsideGoogleDrive) {
          // Show Google Drive specific options
          return (
            <>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {intl.formatMessage({ id: 'modules.apps.quickActions', defaultMessage: 'QUICK ACTIONS' })}
              </div>
              <SidebarItem
                icon={<Upload className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.uploadFile', defaultMessage: 'Upload File' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?action=upload`)}
              />
              <SidebarItem
                icon={<FolderPlus className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.createFolder', defaultMessage: 'Create Folder' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?action=new-folder`)}
              />

              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
                {intl.formatMessage({ id: 'modules.apps.googleDrive', defaultMessage: 'GOOGLE DRIVE' })}
              </div>
              <SidebarItem
                icon={<HardDrive className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.myDrive', defaultMessage: 'My Drive' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive`)}
              />
              <SidebarItem
                icon={<Users className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.sharedDrives', defaultMessage: 'Shared Drives' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?view=shared-drives`)}
              />
              <SidebarItem
                icon={<Users className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.sharedWithMe', defaultMessage: 'Shared with me' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?view=shared`)}
              />
              <SidebarItem
                icon={<Clock className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.recent', defaultMessage: 'Recent' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?view=recent`)}
              />
              <SidebarItem
                icon={<Star className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.starred', defaultMessage: 'Starred' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?view=starred`)}
              />
              <SidebarItem
                icon={<Trash2 className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'modules.apps.trash', defaultMessage: 'Trash' })}
                onClick={() => navigate(`/workspaces/${workspaceId}/apps/google-drive?view=trash`)}
              />
            </>
          )
        }

        // Apps page manages its own content, no sidebar needed
        return null

      case 'more':
        // More page manages its own content, no sidebar needed
        return null

      default:
        return (
          <div className="text-center text-muted-foreground mt-8">
            {currentView} content coming soon...
          </div>
        )
    }
  }

  return (
    <aside
      className={cn(
        "bg-card/80 backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 z-40",
        isCollapsed ? "w-0 overflow-hidden" : "w-60"
      )}
    >
      {/* Content */}
      <div className={cn(
        "flex-1 overflow-y-auto sidebar-scroll",
        (currentView === 'calendar' || currentView === 'projects' || currentView === 'notes') ? "p-0" : "p-4"
      )}>
        {getSidebarContent()}
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal
        open={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onCreateChannel={handleCreateChannel}
      />

      {/* Edit Channel Modal */}
      {selectedChannelForEdit && (
        <CreateChannelModal
          open={!!selectedChannelForEdit}
          onClose={() => setSelectedChannelForEdit(null)}
          onCreateChannel={handleUpdateChannel}
          editMode
          channelId={selectedChannelForEdit.id}
          initialData={{
            name: selectedChannelForEdit.name,
            description: selectedChannelForEdit.description || '',
            is_private: selectedChannelForEdit.is_private || false,
          }}
        />
      )}

      {/* Browse Channels Modal */}
      <BrowseChannelsModal
        open={showBrowseChannelsModal}
        onClose={() => setShowBrowseChannelsModal(false)}
        workspaceId={workspaceId || ''}
        onChannelJoined={async (channelId) => {
          // Refresh channels list and wait for it to complete
          await refreshChannels();
          // Small delay to ensure state is updated
          setTimeout(() => {
            navigate(`/workspaces/${workspaceId}/chat/${channelId}`);
          }, 100);
        }}
      />

      {/* Browse Conversations Modal */}
      <BrowseConversationsModal
        open={showBrowseConversationsModal}
        onClose={() => setShowBrowseConversationsModal(false)}
        workspaceId={workspaceId || ''}
      />

      {/* Start Conversation Modal */}
      <StartConversationModal
        open={showStartConversationModal}
        onClose={() => setShowStartConversationModal(false)}
        onStartConversation={handleStartConversation}
        members={(() => {
          if (!user) {
            console.warn('⚠️ User not loaded, showing all members');
            const members = workspaceMembers.map(m => ({
              id: m.user_id || m.id,
              name: m.name || m.user?.name || m.email || 'Unknown',
              email: m.email || m.user?.email || '',
              avatar: m.avatar_url || m.user?.avatar,
              status: m.status === 'active' ? 'online' as const : 'offline' as const
            }));

            // Add activated bots
            const activeBots = bots
              .filter(bot => bot.botType === 'prebuilt' && bot.status === 'active')
              .map(bot => ({
                id: bot.id,
                name: bot.displayName || bot.name,
                email: `${bot.name}@bot.deskive.ai`,
                avatar: bot.avatarUrl,
                status: 'online' as const
              }));

            return [...members, ...activeBots];
          }

          // Get list of user IDs who already have conversations with the current user
          const existingConversationUserIds = new Set<string>();

          conversations.forEach(conv => {
            try {
              // Parse participants from JSON string or use as-is if already an array
              const participants: string[] = typeof conv.participants === 'string'
                ? JSON.parse(conv.participants)
                : conv.participants || [];

              // For 1-on-1 conversations (2 participants), add the other user's ID
              if (participants.length === 2) {
                const otherUserId = participants.find(id => id !== user.id);
                if (otherUserId) {
                  existingConversationUserIds.add(otherUserId);
                }
              }
            } catch (err) {
              console.error('Error parsing conversation participants:', err);
            }
          });

          // Filter out current user and users with existing conversations
          const members = workspaceMembers
            .filter(m => {
              const memberId = m.user_id || m.id;
              return memberId !== user.id && !existingConversationUserIds.has(memberId);
            })
            .map(m => ({
              id: m.user_id || m.id,
              name: m.name || m.user?.name || m.email || 'Unknown',
              email: m.email || m.user?.email || '',
              avatar: m.avatar_url || m.user?.avatar,
              status: m.status === 'active' ? 'online' as const : 'offline' as const
            }));

          // Add activated bots (filter out bots with existing conversations)
          const activeBots = bots
            .filter(bot => bot.botType === 'prebuilt' && bot.status === 'active' && !existingConversationUserIds.has(bot.id))
            .map(bot => ({
              id: bot.id,
              name: bot.displayName || bot.name,
              email: `${bot.name}@bot.deskive.ai`,
              avatar: bot.avatarUrl,
              status: 'online' as const
            }));

          return [...members, ...activeBots];
        })()}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        open={showScheduleMeetingModal}
        onOpenChange={setShowScheduleMeetingModal}
      />

      {/* Leave Channel Confirmation Modal */}
      <ConfirmationDialog
        open={!!channelToLeave}
        onOpenChange={(open) => !open && setChannelToLeave(null)}
        title={intl.formatMessage({ id: 'modules.chat.channels.leaveConfirmTitle', defaultMessage: 'Leave Channel' })}
        description={intl.formatMessage(
          { id: 'modules.chat.channels.leaveConfirmDescription', defaultMessage: 'Are you sure you want to leave "{channelName}"? You will no longer receive messages from this channel.' },
          { channelName: channelToLeave?.name || '' }
        )}
        confirmText={intl.formatMessage({ id: 'modules.chat.channels.leaveConfirmButton', defaultMessage: 'Leave Channel' })}
        cancelText={intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        onConfirm={confirmLeaveChannel}
        isLoading={isLeavingChannel}
        variant="destructive"
      />

      {/* Delete Channel Confirmation Modal */}
      <ConfirmationDialog
        open={!!channelToDelete}
        onOpenChange={(open) => !open && setChannelToDelete(null)}
        title={intl.formatMessage({ id: 'modules.chat.channels.deleteConfirmTitle', defaultMessage: 'Delete Channel' })}
        description={intl.formatMessage(
          { id: 'modules.chat.channels.deleteConfirmDescription', defaultMessage: 'Are you sure you want to delete "{channelName}"? This action cannot be undone and all messages will be permanently deleted.' },
          { channelName: channelToDelete?.name || '' }
        )}
        confirmText={intl.formatMessage({ id: 'modules.chat.channels.deleteConfirmButton', defaultMessage: 'Delete Channel' })}
        cancelText={intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        onConfirm={confirmDeleteChannel}
        isLoading={isDeletingChannel}
        variant="destructive"
      />
    </aside>
  )
}) // Close React.memo

interface SidebarItemProps {
  icon: string | React.ReactNode
  label: string
  active?: boolean
  badge?: string | number
  onClick?: () => void
  userImage?: string
  userName?: string
  showAvatar?: boolean
}

function SidebarItem({ 
  icon, 
  label, 
  active, 
  badge, 
  onClick, 
  userImage, 
  userName, 
  showAvatar = false,
}: SidebarItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 mb-1 group relative",
        !active && "hover:bg-muted/70 dark:hover:bg-muted",
        active && "gradient-primary-active !text-white shadow-md ring-1 ring-emerald-500/20"
      )}
      onClick={onClick}
    >
      <div className="relative">
        {showAvatar ? (
          <Avatar className="h-6 w-6">
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback className="text-xs">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
        ) : typeof icon === 'string' ? (
          <span className="text-sm">{icon}</span>
        ) : (
          <div className={cn(
            "transition-colors",
            active ? "text-white" : "text-muted-foreground group-hover:text-foreground"
          )}>{icon}</div>
        )}
      </div>
      <span className={cn(
        "text-sm flex-1 truncate transition-colors",
        active ? "text-white font-medium" : "text-foreground"
      )}>{label}</span>
      
      {badge && (
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-full font-medium",
          badge === 'Important' 
            ? "bg-orange-500 text-white" 
            : "bg-red-500 text-white"
        )}>
          {badge}
        </span>
      )}
    </div>
  )
}