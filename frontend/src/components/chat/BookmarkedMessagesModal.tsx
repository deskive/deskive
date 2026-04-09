import React from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bookmark, X, Loader2 } from 'lucide-react';
import { useBookmarkedMessages } from '@/lib/api/chat-api';
import { formatDistanceToNow } from 'date-fns';
import { MessageRenderer } from './MessageRenderer';

interface BookmarkedMessagesModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  conversationId?: string;
  channelId?: string;
}

export function BookmarkedMessagesModal({ open, onClose, workspaceId, conversationId, channelId }: BookmarkedMessagesModalProps) {
  const intl = useIntl();
  // Determine which chat ID to use
  const chatId = conversationId || channelId || '';
  const chatType = conversationId ? 'conversation' : channelId ? 'channel' : null;

  // Fetch bookmarked messages - all at once, no pagination
  const { data, isLoading, error } = useBookmarkedMessages(
    workspaceId,
    chatId,
    chatType
  );

  const bookmarkedMessages = data?.data || [];
  const total = data?.total || 0;

  console.log('📚 BookmarkedMessagesModal:', {
    open,
    workspaceId,
    conversationId,
    channelId,
    chatId,
    chatType,
    isLoading,
    bookmarkedCount: bookmarkedMessages.length,
    total,
    queryEnabled: !!workspaceId && !!chatId
  });

  // Show message if no chat selected
  if (!chatId && open) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-6 w-6" />
              Bookmarked Messages
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Please open a channel or conversation to view bookmarks.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Bookmark className="h-6 w-6" />
            Bookmarked Messages
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading bookmarked messages...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <X className="w-16 h-16 text-destructive/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Failed to load bookmarks
              </h3>
              <p className="text-muted-foreground max-w-md">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          ) : bookmarkedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <Bookmark className="w-16 h-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No bookmarks yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Bookmark messages to save them for later reference
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarkedMessages.map((message: any) => (
                <div
                  key={message.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.user?.avatarUrl || message.user?.avatar} />
                      <AvatarFallback>
                        {message.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">
                          {message.user?.name || message.user?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.created_at ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <MessageRenderer
                        text={message.content || ''}
                        className="text-sm"
                      />
                      {message.bookmarked_at && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Bookmark className="h-3 w-3" />
                          <span>Bookmarked {formatDistanceToNow(new Date(message.bookmarked_at), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {total > 0 ? (
                <span>{total} bookmarked {total === 1 ? 'message' : 'messages'}</span>
              ) : (
                <span>No bookmarks</span>
              )}
            </div>
            <Button onClick={onClose} variant="default">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
