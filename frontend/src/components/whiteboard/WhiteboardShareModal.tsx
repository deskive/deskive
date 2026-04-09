/**
 * Whiteboard Share Modal
 * Share whiteboards with workspace members
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { whiteboardApi } from '@/lib/api/whiteboard-api';
import type { WhiteboardCollaborator } from '@/lib/api/whiteboard-api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  UserPlus,
  Check,
  Loader2,
  Link,
  Copy,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface WhiteboardShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  whiteboardId: string;
  whiteboardName: string;
}

export function WhiteboardShareModal({
  isOpen,
  onClose,
  whiteboardId,
  whiteboardName,
}: WhiteboardShareModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [existingCollaborators, setExistingCollaborators] = useState<WhiteboardCollaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  // Fetch workspace members
  const { data: members = [], isLoading: isLoadingMembers } = useWorkspaceMembers(workspaceId || '');

  // Fetch existing collaborators when modal opens
  useEffect(() => {
    if (isOpen && workspaceId && whiteboardId) {
      setIsLoadingCollaborators(true);
      whiteboardApi
        .getCollaborators(workspaceId, whiteboardId)
        .then((collaborators) => {
          setExistingCollaborators(collaborators);
        })
        .catch((error) => {
          console.error('Failed to fetch collaborators:', error);
        })
        .finally(() => {
          setIsLoadingCollaborators(false);
        });
    }
  }, [isOpen, workspaceId, whiteboardId]);

  // Get set of existing collaborator user IDs
  const existingCollaboratorIds = new Set(existingCollaborators.map((c) => c.userId));

  // Filter members based on search query and exclude current user and existing collaborators
  const filteredMembers = members.filter((member) => {
    // Exclude logged-in user
    if (member.user_id === user?.id) {
      return false;
    }

    // Exclude existing collaborators
    if (existingCollaboratorIds.has(member.user_id)) {
      return false;
    }

    const userName = member.user?.name || member.user?.email || '';
    const userEmail = member.user?.email || '';
    const query = searchQuery.toLowerCase();
    return userName.toLowerCase().includes(query) || userEmail.toLowerCase().includes(query);
  });

  const handleToggleSelect = (userId: string) => {
    setSelectedUsers((prev) => {
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
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one member to share with');
      return;
    }

    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    try {
      setIsSharing(true);

      const result = await whiteboardApi.shareWhiteboard(workspaceId, whiteboardId, {
        user_ids: Array.from(selectedUsers),
        permission: 'edit',
      });

      const sharedCount = result?.shared_count || selectedUsers.size;

      toast.success(
        `Successfully shared "${whiteboardName}" with ${sharedCount} member${sharedCount > 1 ? 's' : ''}`,
      );

      // Update existing collaborators list
      if (result?.collaborators) {
        setExistingCollaborators((prev) => [...prev, ...result.collaborators]);
      }

      // Reset selection
      setSelectedUsers(new Set());
      setSearchQuery('');
    } catch (error: any) {
      console.error('Failed to share whiteboard:', error);
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to share whiteboard. Please try again.';
      toast.error(String(errorMessage));
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorUserId: string) => {
    if (!workspaceId) return;

    try {
      await whiteboardApi.removeCollaborator(workspaceId, whiteboardId, collaboratorUserId);
      setExistingCollaborators((prev) => prev.filter((c) => c.userId !== collaboratorUserId));
      toast.success('Collaborator removed');
    } catch (error: any) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/${workspaceId}/whiteboard/${whiteboardId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{whiteboardName}"</DialogTitle>
          <DialogDescription>Share this whiteboard with workspace members or get a link</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link className="h-4 w-4 mr-2" />
              Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4 mt-4">
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

            {/* Existing Collaborators */}
            {existingCollaborators.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Already shared with</p>
                <div className="flex flex-wrap gap-2">
                  {existingCollaborators.map((collab) => (
                    <Badge
                      key={collab.id}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span>{collab.user?.name || collab.user?.email || collab.userId}</span>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.userId)}
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Members List */}
            <ScrollArea className="h-[250px] rounded-md border">
              {isLoadingMembers || isLoadingCollaborators ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <p className="text-sm text-muted-foreground">Loading members...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No members found' : 'All members already have access'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredMembers.map((member) => {
                    const userId = member.user_id;
                    const isSelected = selectedUsers.has(userId);

                    return (
                      <button
                        key={userId}
                        onClick={() => handleToggleSelect(userId)}
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
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {member.role}
                          </Badge>
                          {isSelected && (
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
            {selectedUsers.size > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedUsers.size} member{selectedUsers.size > 1 ? 's' : ''} selected
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSharing}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={selectedUsers.size === 0 || isSharing}>
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
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view the whiteboard if they have access to the workspace.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/${workspaceId}/whiteboard/${whiteboardId}`}
                  className="flex-1"
                />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
