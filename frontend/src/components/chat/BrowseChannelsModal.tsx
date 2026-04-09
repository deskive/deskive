import React, { useState, useEffect } from 'react';
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
import { Hash, Lock, Search, Loader2 } from 'lucide-react';
import { chatService, type SearchChannelResult } from '@/lib/api/chat-api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BrowseChannelsModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onChannelJoined?: (channelId: string) => void;
}

export function BrowseChannelsModal({
  open,
  onClose,
  workspaceId,
  onChannelJoined,
}: BrowseChannelsModalProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allChannels, setAllChannels] = useState<SearchChannelResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all channels when modal opens
  useEffect(() => {
    if (!open || !workspaceId) return;

    const fetchAllChannels = async () => {
      try {
        setLoading(true);
        const channels = await chatService.getChannels(workspaceId);
        // Convert Channel[] to SearchChannelResult[] format
        const channelResults: SearchChannelResult[] = channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          description: channel.description || '',
          is_private: channel.is_private,
          is_member: true, // These are user's channels, so they're a member
          member_count: channel.members?.length || 0,
          workspace_id: channel.workspace_id,
        }));
        setAllChannels(channelResults);
      } catch (error) {
        console.error('Failed to fetch channels:', error);
        toast.error(intl.formatMessage({ id: 'modules.chat.browseChannels.failedSearch' }));
      } finally {
        setLoading(false);
      }
    };

    fetchAllChannels();
  }, [open, workspaceId, intl]);

  // Filter channels based on search query
  const displayChannels = searchQuery.trim()
    ? allChannels.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allChannels;

  const handleChannelClick = (channelId: string) => {
    if (!workspaceId) return;

    // Navigate to the channel
    navigate(`/workspaces/${workspaceId}/chat/${channelId}`);

    // Close the modal
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setAllChannels([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[80vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Hash className="h-6 w-6" />
            {intl.formatMessage({ id: 'modules.chat.browseChannels.title', defaultMessage: 'Browse Channels' })}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {intl.formatMessage({ id: 'modules.chat.browseChannels.description', defaultMessage: 'View all your channels (public and private) and search to filter' })}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={intl.formatMessage({ id: 'modules.chat.search.searchChannels' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Channel List */}
        <ScrollArea className="flex-1 px-6 py-4 max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                {intl.formatMessage({ id: 'modules.chat.browseChannels.loading', defaultMessage: 'Loading channels...' })}
              </span>
            </div>
          ) : displayChannels.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground font-medium mb-1">
                {searchQuery.trim()
                  ? intl.formatMessage({ id: 'modules.chat.browseChannels.noChannelsFound', defaultMessage: 'No channels found' })
                  : intl.formatMessage({ id: 'modules.chat.browseChannels.noChannelsAvailable', defaultMessage: 'No channels available' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? intl.formatMessage({ id: 'modules.chat.browseChannels.tryDifferentSearch', defaultMessage: 'Try a different search term' })
                  : intl.formatMessage({ id: 'modules.chat.browseChannels.notMemberYet', defaultMessage: 'You are not a member of any channels yet' })}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayChannels.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  onClick={handleChannelClick}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage(
              { id: 'modules.chat.search.channelsAvailable' },
              {
                count: displayChannels.length,
                plural: displayChannels.length === 1 ? '' : 's'
              }
            )}
          </p>
          <Button variant="outline" onClick={handleClose}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultItemProps {
  result: SearchChannelResult;
  onClick: (channelId: string) => void;
  workspaceId: string;
}

function SearchResultItem({ result, onClick, workspaceId }: SearchResultItemProps) {
  const intl = useIntl();
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        "hover:bg-muted/50 hover:border-primary/20"
      )}
      onClick={() => onClick(result.id)}
    >
      {/* Channel Icon */}
      <div className="mt-1">
        {result.is_private ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Hash className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Channel Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground">{result.name}</h4>
          {result.is_private && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.browseChannels.private' })}</span>
          )}
        </div>
        {result.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {result.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {intl.formatMessage({ id: 'modules.chat.browseChannels.clickToOpen', defaultMessage: 'Click to open channel' })}
        </p>
      </div>
    </div>
  );
}
