import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Clock, MoreVertical, Pencil, Trash2, Loader2, Calendar, Hash, MessageSquare } from 'lucide-react';
import { useScheduledMessages, useCancelScheduledMessage } from '@/lib/api/chat-api';
import type { ScheduledMessage } from '@/lib/api/chat-api';
import { format, formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EditScheduledMessageModal } from './EditScheduledMessageModal';
import { MessageRenderer } from './MessageRenderer';

interface ScheduledMessagesPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function ScheduledMessagesPanel({ open, onClose, workspaceId }: ScheduledMessagesPanelProps) {
  const queryClient = useQueryClient();
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [cancellingMessageId, setCancellingMessageId] = useState<string | null>(null);

  // Fetch pending scheduled messages
  const { data, isLoading, error } = useScheduledMessages(workspaceId, 'pending');
  const cancelMutation = useCancelScheduledMessage();

  const scheduledMessages = data?.data || [];

  const handleCancelMessage = async () => {
    if (!cancellingMessageId) return;

    try {
      await cancelMutation.mutateAsync({
        workspaceId,
        messageId: cancellingMessageId,
      });
      toast.success('Scheduled message cancelled');
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages', workspaceId] });
    } catch (error) {
      toast.error('Failed to cancel scheduled message');
      console.error('Failed to cancel scheduled message:', error);
    } finally {
      setCancellingMessageId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Sent</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Cancelled</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDestinationIcon = (destinationType?: 'channel' | 'conversation') => {
    if (destinationType === 'channel') {
      return <Hash className="h-4 w-4 text-muted-foreground" />;
    }
    return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Clock className="h-6 w-6" />
              Scheduled Messages
            </DialogTitle>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading scheduled messages...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-24 h-24 mb-6 flex items-center justify-center">
                  <Clock className="w-16 h-16 text-destructive/50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Failed to load scheduled messages
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </p>
              </div>
            ) : scheduledMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-24 h-24 mb-6 flex items-center justify-center">
                  <Clock className="w-16 h-16 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No scheduled messages
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Schedule messages to send them at a specific time. Click the clock icon when composing a message.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledMessages.map((message) => (
                  <div
                    key={message.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Destination and Status */}
                        <div className="flex items-center gap-2 mb-2">
                          {getDestinationIcon(message.destinationType)}
                          <span className="font-medium text-sm">
                            {message.destinationType === 'channel' ? '#' : ''}
                            {message.destinationName || 'Unknown'}
                          </span>
                          {getStatusBadge(message.status)}
                        </div>

                        {/* Message Content Preview */}
                        <div className="text-sm text-foreground mb-2 line-clamp-2">
                          <MessageRenderer text={message.content || ''} className="text-sm" />
                        </div>

                        {/* Scheduled Time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Scheduled for {format(new Date(message.scheduledAt), 'MMM d, yyyy')} at {format(new Date(message.scheduledAt), 'h:mm a')}
                          </span>
                          <span className="text-muted-foreground/70">
                            ({formatDistanceToNow(new Date(message.scheduledAt), { addSuffix: true })})
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {message.status === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMessage(message)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setCancellingMessageId(message.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
                {scheduledMessages.length > 0 ? (
                  <span>{scheduledMessages.length} pending {scheduledMessages.length === 1 ? 'message' : 'messages'}</span>
                ) : (
                  <span>No pending messages</span>
                )}
              </div>
              <Button onClick={onClose} variant="default">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editingMessage && (
        <EditScheduledMessageModal
          open={!!editingMessage}
          onClose={() => setEditingMessage(null)}
          workspaceId={workspaceId}
          message={editingMessage}
        />
      )}

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancellingMessageId} onOpenChange={() => setCancellingMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel scheduled message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will not be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep scheduled</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel message'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
