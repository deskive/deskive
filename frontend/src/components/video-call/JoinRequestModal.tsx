/**
 * Join Request Modal Component
 * Shows when a user tries to join a call they weren't invited to
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Video, Mic } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface JoinRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestJoin: (displayName: string, message: string) => Promise<void>;
  callType: 'audio' | 'video';
  roomName?: string;
}

export const JoinRequestModal: React.FC<JoinRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestJoin,
  callType,
  roomName,
}) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || user?.email || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: Log when modal component mounts
  React.useEffect(() => {
    console.log('🔴 [JoinRequestModal] Component MOUNTED - isOpen:', isOpen);
    return () => {
      console.log('🔵 [JoinRequestModal] Component UNMOUNTED');
    };
  }, []);

  // Debug: Log when modal state changes
  React.useEffect(() => {
    if (isOpen) {
      console.log('🚨 [JoinRequestModal] Modal isOpen=TRUE - this should only happen for unauthorized users!');
    } else {
      console.log('✅ [JoinRequestModal] Modal isOpen=FALSE - correctly hidden');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onRequestJoin(displayName, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {callType === 'video' ? (
              <Video className="h-5 w-5 text-blue-500" />
            ) : (
              <Mic className="h-5 w-5 text-blue-500" />
            )}
            Request to Join Call
          </DialogTitle>
          <DialogDescription>
            {roomName ? (
              <>You're requesting to join <strong>{roomName}</strong></>
            ) : (
              'You need permission to join this call'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Avatar and Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {(user?.name || user?.email || 'U').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.name || user?.email}</p>
              <p className="text-xs text-gray-500">Requesting to join</p>
            </div>
          </div>

          {/* Display Name Input */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              required
              maxLength={50}
            />
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Input
              id="message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why would you like to join?"
              maxLength={200}
            />
            <p className="text-xs text-gray-500">
              The host will see this when deciding to accept your request
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                'Request to Join'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
