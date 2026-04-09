import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Search, Loader2, X } from 'lucide-react';
import { chatService } from '@/lib/api/chat-api';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  participants: string[];
  unreadCount?: number;
  lastMessage?: {
    content: string;
    timestamp: Date;
  };
}

interface BrowseConversationsModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function BrowseConversationsModal({
  open,
  onClose,
  workspaceId,
}: BrowseConversationsModalProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch workspace members for user details
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId);

  // Fetch conversations when modal opens
  useEffect(() => {
    if (!open || !workspaceId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const conversationsData = await chatService.getConversations(workspaceId);
        setConversations(conversationsData);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
        toast.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [open, workspaceId]);

  // Get user details for a participant
  const getUserDetails = (participantId: string) => {
    const member = workspaceMembers.find(m => m.user_id === participantId);
    if (!member) return null;

    return {
      id: participantId,
      name: member.user?.name || member.name || member.user?.email || 'Unknown',
      email: member.email || member.user?.email || '',
      avatar: member.user?.avatar || member.avatar_url,
    };
  };

  // Filter and enrich conversations
  const displayConversations = useMemo(() => {
    return conversations
      .map(conversation => {
        // Find the other participant (not the current user)
        const otherParticipantId = conversation.participants.find(
          (id: string) => id !== user?.id
        );

        if (!otherParticipantId) return null;

        const otherUser = getUserDetails(otherParticipantId);
        if (!otherUser) return null;

        return {
          ...conversation,
          otherUser,
        };
      })
      .filter(Boolean)
      .filter(conversation => {
        if (!searchQuery.trim()) return true;

        const searchLower = searchQuery.toLowerCase().trim();
        const name = conversation?.otherUser?.name?.toLowerCase() || '';
        const email = conversation?.otherUser?.email?.toLowerCase() || '';

        return name.includes(searchLower) || email.includes(searchLower);
      });
  }, [conversations, searchQuery, user?.id, workspaceMembers]);

  const handleConversationClick = (conversationId: string) => {
    if (!workspaceId) return;

    // Navigate to the conversation
    navigate(`/workspaces/${workspaceId}/chat/${conversationId}`);

    // Close the modal
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 max-h-[80vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-6 w-6" />
            {intl.formatMessage({ id: 'modules.chat.browseConversations.title', defaultMessage: 'Browse Conversations' })}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {intl.formatMessage({
              id: 'modules.chat.browseConversations.description',
              defaultMessage: 'Search and browse your direct message conversations'
            })}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={intl.formatMessage({
                id: 'modules.chat.browseConversations.searchPlaceholder',
                defaultMessage: 'Search by name...'
              })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-6 py-4 max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                {intl.formatMessage({
                  id: 'modules.chat.browseConversations.loading',
                  defaultMessage: 'Loading conversations...'
                })}
              </span>
            </div>
          ) : displayConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground font-medium mb-1">
                {searchQuery.trim()
                  ? intl.formatMessage({
                      id: 'modules.chat.browseConversations.noResults',
                      defaultMessage: 'No conversations found'
                    })
                  : intl.formatMessage({
                      id: 'modules.chat.browseConversations.empty',
                      defaultMessage: 'No conversations yet'
                    })}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? intl.formatMessage({
                      id: 'modules.chat.browseConversations.tryDifferent',
                      defaultMessage: 'Try a different search term'
                    })
                  : intl.formatMessage({
                      id: 'modules.chat.browseConversations.startNew',
                      defaultMessage: 'Start a new conversation to begin chatting'
                    })}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayConversations.map((conversation) => (
                <ConversationItem
                  key={conversation!.id}
                  conversation={conversation!}
                  onClick={handleConversationClick}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage(
              {
                id: 'modules.chat.browseConversations.count',
                defaultMessage: '{count} conversation{plural}'
              },
              {
                count: displayConversations.length,
                plural: displayConversations.length === 1 ? '' : 's'
              }
            )}
          </p>
          <Button variant="outline" onClick={handleClose}>
            {intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConversationItemProps {
  conversation: {
    id: string;
    unreadCount?: number;
    otherUser: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  };
  onClick: (conversationId: string) => void;
}

function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { otherUser, unreadCount } = conversation;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        "hover:bg-muted/50 hover:border-primary/20",
        unreadCount && unreadCount > 0 && "bg-primary/5 border-primary/20"
      )}
      onClick={() => onClick(conversation.id)}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarImage src={otherUser.avatar} alt={otherUser.name} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {otherUser.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground truncate">{otherUser.name}</h4>
          {unreadCount && unreadCount > 0 && (
            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {otherUser.email && (
          <p className="text-sm text-muted-foreground truncate">
            {otherUser.email}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}
