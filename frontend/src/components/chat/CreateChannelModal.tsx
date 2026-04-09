import React, { useState } from 'react';
import { useIntl } from 'react-intl';
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
import { Switch } from '@/components/ui/switch';
import { Hash, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { useAuth } from '@/contexts/AuthContext';
import { useChannelMembers } from '@/lib/api/chat-api';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreateChannel: (channelData: {
    name: string;
    description: string;
    type: 'channel' | 'dm';
    is_private: boolean;
    member_ids?: string[];
  }) => void;
  editMode?: boolean;
  channelId?: string; // Add channelId for fetching members in edit mode
  initialData?: {
    name: string;
    description: string;
    is_private: boolean;
  };
}

export function CreateChannelModal({
  open,
  onClose,
  onCreateChannel,
  editMode = false,
  channelId,
  initialData
}: CreateChannelModalProps) {
  const intl = useIntl();
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const [channelName, setChannelName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch workspace members using React Query hook
  const { data: workspaceMembers = [], isLoading: loadingMembers } = useWorkspaceMembers(
    workspaceId || ''
  );

  // Fetch existing channel members in edit mode
  const { data: existingMembers = [], isLoading: loadingExistingMembers } = useChannelMembers(
    workspaceId || '',
    channelId || '',
    editMode && !!channelId // Only fetch when in edit mode and channelId exists
  );

  // Update state when initialData changes (for edit mode)
  React.useEffect(() => {
    if (editMode && initialData) {
      setChannelName(initialData.name);
      setDescription(initialData.description);
      setIsPrivate(initialData.is_private);
    }
  }, [editMode, initialData]);

  // Populate selected members from existing members in edit mode
  // Exclude workspace owners from selected members
  React.useEffect(() => {
    if (editMode && existingMembers.length > 0 && workspaceMembers.length > 0) {
      // Filter out workspace owners from selected members
      const memberIds = existingMembers
        .filter(existingMember => {
          // Find the corresponding workspace member
          const workspaceMember = workspaceMembers.find(
            wm => wm.user_id === existingMember.userId
          );
          // Exclude if they are a workspace owner
          return workspaceMember?.role !== 'owner';
        })
        .map(m => m.userId);

      setSelectedMembers(memberIds);
    }
  }, [editMode, existingMembers, workspaceMembers]);

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter members: exclude current user, workspace owner (in edit mode), and apply search query
  const filteredMembers = workspaceMembers.filter(member => {
    // Skip if member doesn't have user data
    if (!member.user) {
      return false;
    }

    // Exclude the current user (they will be added as admin automatically)
    if (user && member.user_id === user.id) {
      return false;
    }

    // In edit mode, exclude workspace owners (they can't be removed from channels)
    if (editMode && member.role === 'admin') {
      return false;
    }

    // Apply search filter
    if (searchQuery) {
      return (
        member.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return true;
  });

  const handleCreate = () => {
    if (!channelName.trim()) {
      return;
    }

    onCreateChannel({
      name: channelName,
      description,
      type: 'channel',
      is_private: isPrivate,
      member_ids: isPrivate ? selectedMembers : undefined,
    });

    // Reset form
    setChannelName('');
    setDescription('');
    setIsPrivate(false);
    setSelectedMembers([]);
    setSearchQuery('');
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setChannelName('');
    setDescription('');
    setIsPrivate(false);
    setSelectedMembers([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Hash className="h-6 w-6" />
            {editMode ? intl.formatMessage({ id: 'modules.chat.createChannel.editTitle' }) : intl.formatMessage({ id: 'modules.chat.createChannel.title' })}
          </DialogTitle>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="px-6 pb-6 space-y-5 overflow-y-auto flex-1">
          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="channel-name" className="text-base font-medium">
              {intl.formatMessage({ id: 'modules.chat.createChannel.channelName' })}
            </Label>
            <Input
              id="channel-name"
              placeholder={intl.formatMessage({ id: 'modules.chat.createChannel.channelNamePlaceholder' })}
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-medium">
              {intl.formatMessage({ id: 'modules.chat.createChannel.description' })}
            </Label>
            <Textarea
              id="description"
              placeholder=""
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Make Private Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1">
              <Label htmlFor="make-private" className="text-base font-medium cursor-pointer">
                {intl.formatMessage({ id: 'modules.chat.createChannel.makePrivate' })}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isPrivate
                  ? intl.formatMessage({ id: 'modules.chat.createChannel.onlySelectedMembers' })
                  : intl.formatMessage({ id: 'modules.chat.createChannel.allWorkspaceMembers' })}
              </p>
            </div>
            <Switch
              id="make-private"
              checked={isPrivate}
              onCheckedChange={(checked) => {
                setIsPrivate(checked);
                if (!checked) {
                  setSelectedMembers([]);
                }
              }}
            />
          </div>

          {/* Member Selection - Show when private (both create and edit mode) */}
          {isPrivate && (
            <div className="space-y-3 pt-2">
              <Label className="text-base font-medium">
                {editMode ? intl.formatMessage({ id: 'modules.chat.createChannel.channelMembers' }) : intl.formatMessage({ id: 'modules.chat.createChannel.addMembers' })}
              </Label>

              {/* Search input */}
              <Input
                placeholder={intl.formatMessage({ id: 'modules.chat.createChannel.searchMembers' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10"
              />

              {/* Selected members tags */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {selectedMembers.map(userId => {
                    const member = workspaceMembers.find(m => m.user_id === userId);
                    if (!member || !member.user) return null;
                    return (
                      <div
                        key={userId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                      >
                        <span>{member.user.name}</span>
                        <button
                          onClick={() => toggleMemberSelection(userId)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Members list - Always show */}
              <div className="border rounded-md">
                {loadingMembers ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {intl.formatMessage({ id: 'modules.chat.createChannel.loadingMembers' })}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? intl.formatMessage({ id: 'modules.chat.createChannel.noMembersFound' }) : intl.formatMessage({ id: 'modules.chat.createChannel.noMembers' })}
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {filteredMembers.map(member => (
                      <div
                        key={member.user_id}
                        onClick={() => toggleMemberSelection(member.user_id)}
                        className={`flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0 transition-colors ${
                          selectedMembers.includes(member.user_id) ? 'bg-accent' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.user_id)}
                          onChange={() => {}}
                          className="rounded"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {member.user?.avatar ? (
                            <img
                              src={member.user.avatar}
                              alt={member.user.name || 'User'}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium flex-shrink-0">
                              {member.user?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="px-6 pb-6 pt-4 border-t shrink-0 flex items-center justify-end gap-3 bg-background">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="min-w-[100px]"
          >
            {intl.formatMessage({ id: 'modules.chat.createChannel.cancel' })}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!channelName.trim()}
            className="min-w-[100px] btn-gradient-primary"
          >
            {editMode ? intl.formatMessage({ id: 'modules.chat.createChannel.update' }) : intl.formatMessage({ id: 'modules.chat.createChannel.create' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
