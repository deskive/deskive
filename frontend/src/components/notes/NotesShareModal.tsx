/**
 * Notes Share Modal
 * Share notes with workspace members
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { notesApi } from '@/lib/api/notes-api';

interface NotesShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
}

export function NotesShareModal({
  isOpen,
  onClose,
  noteId,
  noteTitle,
}: NotesShareModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);

  // Fetch workspace members
  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId || '');

  // Filter members based on search query and exclude current user
  const filteredMembers = members.filter(member => {
    // Exclude logged-in user
    if (member.user_id === user?.id) {
      return false;
    }

    const userName = member.user?.name || member.user?.email || '';
    const userEmail = member.user?.email || '';
    const query = searchQuery.toLowerCase();
    return userName.toLowerCase().includes(query) || userEmail.toLowerCase().includes(query);
  });

  const handleToggleShare = (userId: string) => {
    setSharedWith(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleShare = async () => {
    if (sharedWith.size === 0) {
      toast.error('Please select at least one member to share with');
      return;
    }

    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    try {
      setIsSharing(true);

      // Call API to share note with selected users
      const result = await notesApi.shareNote(workspaceId, noteId, {
        user_ids: Array.from(sharedWith),
        permission: 'read',
      });

      console.log('Share note result:', result);

      // Extract shared_count safely
      const sharedCount = typeof result === 'object' && result !== null && 'shared_count' in result
        ? result.shared_count
        : sharedWith.size;

      const successMessage = `Successfully shared "${noteTitle}" with ${sharedCount} member${sharedCount > 1 ? 's' : ''}`;
      console.log('Success message:', successMessage);

      toast.success(successMessage);

      // Reset state
      setSharedWith(new Set());
      setSearchQuery('');

      onClose();
    } catch (error: any) {
      console.error('Failed to share note:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to share note. Please try again.';
      toast.error(String(errorMessage));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{noteTitle}"</DialogTitle>
          <DialogDescription>
            Share this note with workspace members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-[300px] rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No members found</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredMembers.map((member) => {
                  const userId = member.user_id;
                  const isShared = sharedWith.has(userId);

                  return (
                    <button
                      key={userId}
                      onClick={() => handleToggleShare(userId)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar} />
                        <AvatarFallback>
                          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">
                          {member.user?.name || member.user?.email}
                        </p>
                        {member.user?.email && member.user?.name && (
                          <p className="text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {member.role}
                        </Badge>
                        {isShared && (
                          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count */}
          {sharedWith.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {sharedWith.size} member{sharedWith.size > 1 ? 's' : ''} selected
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSharing}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={sharedWith.size === 0 || isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Share
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
