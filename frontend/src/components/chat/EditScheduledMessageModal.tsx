import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Loader2, Calendar, Hash, MessageSquare } from 'lucide-react';
import { useUpdateScheduledMessage } from '@/lib/api/chat-api';
import type { ScheduledMessage } from '@/lib/api/chat-api';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditScheduledMessageModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  message: ScheduledMessage;
}

export function EditScheduledMessageModal({
  open,
  onClose,
  workspaceId,
  message,
}: EditScheduledMessageModalProps) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateScheduledMessage();

  // Parse the scheduled date/time
  const scheduledDate = new Date(message.scheduledAt);

  const [content, setContent] = useState(message.content);
  const [date, setDate] = useState(format(scheduledDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(scheduledDate, 'HH:mm'));

  // Reset form when message changes
  useEffect(() => {
    const newScheduledDate = new Date(message.scheduledAt);
    setContent(message.content);
    setDate(format(newScheduledDate, 'yyyy-MM-dd'));
    setTime(format(newScheduledDate, 'HH:mm'));
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Message content is required');
      return;
    }

    if (!date || !time) {
      toast.error('Please select a date and time');
      return;
    }

    // Combine date and time
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const newScheduledAt = new Date(year, month - 1, day, hours, minutes);

    // Validate it's in the future
    if (newScheduledAt <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        workspaceId,
        messageId: message.id,
        data: {
          content: content.trim(),
          scheduledAt: newScheduledAt.toISOString(),
        },
      });
      toast.success('Scheduled message updated');
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages', workspaceId] });
      onClose();
    } catch (error) {
      toast.error('Failed to update scheduled message');
      console.error('Failed to update scheduled message:', error);
    }
  };

  const getDestinationIcon = (destinationType?: 'channel' | 'conversation') => {
    if (destinationType === 'channel') {
      return <Hash className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6" />
            Edit Scheduled Message
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Destination Info */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            {getDestinationIcon(message.destinationType)}
            <span className="text-sm">
              Sending to{' '}
              <span className="font-medium">
                {message.destinationType === 'channel' ? '#' : ''}
                {message.destinationName || 'Unknown'}
              </span>
            </span>
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-base font-semibold">
              Message
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Date/Time */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Time
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm text-muted-foreground">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm text-muted-foreground">
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="px-6">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !content.trim() || !date || !time}
              className="px-6 btn-gradient-primary"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
