import React, { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Users,
  Hash,
  Lock,
  Settings,
  ChevronDown,
  FileText,
  Image,
  Film,
  Music,
  Download,
  Sparkles,
  X,
  File,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChannelMembers, useUpdateChannel } from '@/lib/api/chat-api';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import { useMemberProfile } from '@/hooks/useMemberProfile';
import { useWorkspaceMembers } from '@/lib/api/workspace-api';
import { fileApi } from '@/lib/api/files-api';

interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  timestamp?: Date;
  userName?: string;
}

interface ChatRightSidebarProps {
  channelName?: string;
  channelDescription?: string;
  isPrivate?: boolean;
  memberCount?: number;
  onSettingsClick?: () => void;
  isCollapsed?: boolean;
  messages?: any[]; // Array of messages with attachments
  hasSelectedChat?: boolean; // Whether a chat is selected
  chatType?: 'channel' | 'conversation'; // Type of chat (channel or conversation)
  channelId?: string; // Channel ID for fetching members
  workspaceId?: string; // Workspace ID for API calls
}

export function ChatRightSidebar({
  channelName = 'general',
  channelDescription = 'Team discussions and general updates',
  isPrivate = false,
  memberCount = 5,
  onSettingsClick,
  isCollapsed = false,
  messages = [],
  hasSelectedChat = false,
  chatType = 'channel',
  channelId,
  workspaceId,
}: ChatRightSidebarProps) {
  const intl = useIntl();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { openMemberProfile } = useMemberProfile();
  const updateChannelMutation = useUpdateChannel();

  // Fetch workspace members to get full member data
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '');

  // Fetch channel members only for private channels
  const { data: channelMembers = [], isLoading: loadingMembers } = useChannelMembers(
    workspaceId || '',
    channelId || '',
    isPrivate && !!channelId && !!workspaceId && chatType === 'channel'
  );

  // Check if current user is workspace owner/admin
  const isWorkspaceOwnerOrAdmin = currentWorkspace?.owner_id === user?.id;

  // Handle remove member
  const handleRemoveMember = async (memberUserId: string) => {
    if (!channelId || !workspaceId || !isPrivate) return;

    try {
      // Get current member IDs excluding the one to remove
      const updatedMemberIds = channelMembers
        .filter(m => m.userId !== memberUserId)
        .map(m => m.userId);

      await updateChannelMutation.mutateAsync({
        workspaceId,
        channelId,
        data: {
          is_private: true, // Required for backend to process member updates
          member_ids: updatedMemberIds,
        },
      });

      toast.success('Member removed from channel');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };
  const handleDownload = async (fileId: string, fileName: string) => {
    if (!workspaceId) {
      toast.error('Workspace not found');
      return;
    }

    try {
      console.log(`📥 Downloading file: ${fileName} (${fileId})`);
      const blob = await fileApi.downloadFile(workspaceId, fileId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Downloaded: ${fileName}`);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file', {
        description: 'Please try again'
      });
    }
  };

  // Process attachments from messages
  const attachmentsByType = useMemo(() => {
    const result: {
      images: MessageAttachment[];
      videos: MessageAttachment[];
      audio: MessageAttachment[];
      documents: MessageAttachment[];
    } = {
      images: [],
      videos: [],
      audio: [],
      documents: [],
    };

    messages.forEach((message) => {
      if (message.attachments && Array.isArray(message.attachments)) {
        message.attachments.forEach((att: any) => {
          const attachment: MessageAttachment = {
            id: att.id,
            name: att.name || att.fileName || 'untitled',
            url: att.url,
            type: att.type || att.mimeType || 'unknown',
            size: att.size || att.fileSize || 0,
            timestamp: message.timestamp,
            userName: message.user?.name,
          };

          const mimeType = attachment.type.toLowerCase();
          if (mimeType.startsWith('image/')) {
            result.images.push(attachment);
          } else if (mimeType.startsWith('video/')) {
            result.videos.push(attachment);
          } else if (mimeType.startsWith('audio/')) {
            result.audio.push(attachment);
          } else {
            result.documents.push(attachment);
          }
        });
      }
    });

    return result;
  }, [messages]);

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return 'Unknown time';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Collapsed view - "AI Summaries" style
  if (isCollapsed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-start p-6 bg-card/80 backdrop-blur-xl border-l border-border">
        <div className="text-center mt-20">
          <div className="mb-6">
            <Sparkles className="h-16 w-16 text-gray-400 mx-auto" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">{intl.formatMessage({ id: 'modules.chat.rightSidebar.noSummaries' })}</h3>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            {intl.formatMessage({ id: 'modules.chat.rightSidebar.aiSummaryPrompt' })}
          </p>
        </div>
      </div>
    );
  }

  // No chat selected view
  if (!hasSelectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-card/80 backdrop-blur-xl border-l border-border">
        <div className="text-center">
          <div className="mb-6">
            <Hash className="h-16 w-16 text-gray-400 mx-auto" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-3">{intl.formatMessage({ id: 'modules.chat.rightSidebar.noChatSelected', defaultMessage: 'No chat selected' })}</h3>
          <p className="text-sm text-muted-foreground max-w-[250px]">
            {intl.formatMessage({ id: 'modules.chat.rightSidebar.selectPrompt', defaultMessage: 'Select a channel or conversation to view details and shared media' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Channel Info */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {/* Show Lock icon for private channels, Hash for public channels, no icon for conversations */}
            {chatType === 'channel' && (
              isPrivate ? <Lock className="h-5 w-5" /> : <Hash className="h-5 w-5" />
            )}
            {channelName}
          </h3>
          {onSettingsClick && (
            <Button variant="ghost" size="sm" onClick={onSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Show description only for channels, not conversations */}
        {chatType === 'channel' && channelDescription && (
          <div className="text-sm text-muted-foreground mb-4">
            {channelDescription}
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          {/* Only show member count for conversations (DMs), not channels */}
          {/* {chatType === 'conversation' && memberCount !== undefined && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Badge>
          )} */}
          {isPrivate && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Private
            </Badge>
          )}
        </div>
      </div>

      {/* Members Section - Only for private channels */}
      {isPrivate && chatType === 'channel' && channelId && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.chat.members.title' })}
          </h3>

          {loadingMembers ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.rightSidebar.loadingMembers' })}</p>
            </div>
          ) : channelMembers.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.rightSidebar.noMembers' })}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {channelMembers.map((member) => {
                // Find full workspace member data
                const fullMemberData = workspaceMembers.find(m =>
                  m.user_id === member.userId || m.id === member.userId
                )

                return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer group"
                    onClick={() => fullMemberData && openMemberProfile(fullMemberData)}
                  >
                    {member.user?.avatarUrl ? (
                      <Avatar className="h-8 w-8 group-hover:ring-2 group-hover:ring-primary transition-all">
                        <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                        <AvatarFallback>{member.user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium group-hover:ring-2 group-hover:ring-primary transition-all">
                        {member.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{member.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                    </div>
                  </div>

                  {/* Show remove button only for workspace owner/admin and not for themselves */}
                  {isWorkspaceOwnerOrAdmin && member.userId !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={updateChannelMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Media Files */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">{intl.formatMessage({ id: 'modules.chat.rightSidebar.mediaFiles' })}</h3>

        {attachmentsByType.images.length === 0 &&
         attachmentsByType.videos.length === 0 &&
         attachmentsByType.audio.length === 0 &&
         attachmentsByType.documents.length === 0 ? (
          <div className="text-center py-8">
            <File className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.chat.rightSidebar.noSharedFiles' })}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Images */}
            {attachmentsByType.images.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 text-left">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">{intl.formatMessage({ id: 'modules.chat.rightSidebar.images' })}</span>
                    <Badge variant="secondary" className="text-xs">{attachmentsByType.images.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2 pl-6">
                  {attachmentsByType.images.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-xs font-bold text-white">
                        {getFileExtension(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.userName && `Shared by ${file.userName} • `}{formatTimestamp(file.timestamp)} • {formatFileSize(file.size)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownload(file.id, file.name)}
                        title={`Download ${file.name}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Videos */}
            {attachmentsByType.videos.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 text-left">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-sm">{intl.formatMessage({ id: 'modules.chat.rightSidebar.videos' })}</span>
                    <Badge variant="secondary" className="text-xs">{attachmentsByType.videos.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2 pl-6">
                  {attachmentsByType.videos.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-xs font-bold text-white">
                        {getFileExtension(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.userName && `Shared by ${file.userName} • `}{formatTimestamp(file.timestamp)} • {formatFileSize(file.size)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownload(file.id, file.name)}
                        title={`Download ${file.name}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Audio */}
            {attachmentsByType.audio.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 text-left">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">{intl.formatMessage({ id: 'modules.chat.rightSidebar.audio' })}</span>
                    <Badge variant="secondary" className="text-xs">{attachmentsByType.audio.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2 pl-6">
                  {attachmentsByType.audio.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-xs font-bold text-white">
                        {getFileExtension(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.userName && `Shared by ${file.userName} • `}{formatTimestamp(file.timestamp)} • {formatFileSize(file.size)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownload(file.id, file.name)}
                        title={`Download ${file.name}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Documents */}
            {attachmentsByType.documents.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 text-left">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-sm">{intl.formatMessage({ id: 'modules.chat.rightSidebar.documents' })}</span>
                    <Badge variant="secondary" className="text-xs">{attachmentsByType.documents.length}</Badge>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2 pl-6">
                  {attachmentsByType.documents.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted">
                      <div className="w-8 h-8 bg-gray-500 rounded flex items-center justify-center text-xs font-bold text-white">
                        {getFileExtension(file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.userName && `Shared by ${file.userName} • `}{formatTimestamp(file.timestamp)} • {formatFileSize(file.size)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownload(file.id, file.name)}
                        title={`Download ${file.name}`}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
