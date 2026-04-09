/**
 * File Comments Panel
 * Displays and manages comments on a file
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useFileComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useResolveComment,
} from '@/lib/api/files-api';
import type { FileComment } from '@/lib/api/files-api';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
  MessageSquare,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  Reply,
  Loader2,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileCommentsPanelProps {
  fileId: string;
  fileName?: string;
}

export function FileCommentsPanel({ fileId, fileName }: FileCommentsPanelProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const { joinRoom, leaveRoom, on, off, isConnected } = useWebSocket();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: comments, isLoading, refetch } = useFileComments(workspaceId!, fileId);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const resolveComment = useResolveComment();

  // Join and leave file comments room for real-time updates
  useEffect(() => {
    if (!isConnected || !fileId) return;

    const room = `file:${fileId}:comments`;

    // Join the room
    joinRoom(room);

    // Event handlers
    const handleCommentCreated = (data: any) => {
      if (data.fileId === fileId) {
        refetch();
      }
    };

    const handleCommentUpdated = (data: any) => {
      if (data.fileId === fileId) {
        refetch();
      }
    };

    const handleCommentDeleted = (data: any) => {
      if (data.fileId === fileId) {
        refetch();
      }
    };

    const handleCommentResolved = (data: any) => {
      if (data.fileId === fileId) {
        refetch();
      }
    };

    // Subscribe to events
    on('file:comment:created' as any, handleCommentCreated);
    on('file:comment:updated' as any, handleCommentUpdated);
    on('file:comment:deleted' as any, handleCommentDeleted);
    on('file:comment:resolved' as any, handleCommentResolved);

    // Cleanup
    return () => {
      leaveRoom(room);
      off('file:comment:created' as any, handleCommentCreated);
      off('file:comment:updated' as any, handleCommentUpdated);
      off('file:comment:deleted' as any, handleCommentDeleted);
      off('file:comment:resolved' as any, handleCommentResolved);
    };
  }, [isConnected, fileId, refetch, joinRoom, leaveRoom, on, off]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !workspaceId) return;

    try {
      await createComment.mutateAsync({
        workspaceId,
        fileId,
        data: { content: newComment.trim() },
      });
      setNewComment('');
      toast.success('Comment added');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add comment');
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !workspaceId) return;

    try {
      await createComment.mutateAsync({
        workspaceId,
        fileId,
        data: { content: replyContent.trim(), parent_id: parentId },
      });
      setReplyingTo(null);
      setReplyContent('');
      toast.success('Reply added');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add reply');
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim() || !workspaceId) return;

    try {
      await updateComment.mutateAsync({
        workspaceId,
        fileId,
        commentId,
        data: { content: editContent.trim() },
      });
      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!workspaceId) return;

    try {
      await deleteComment.mutateAsync({
        workspaceId,
        fileId,
        commentId,
      });
      toast.success('Comment deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete comment');
    }
  };

  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    if (!workspaceId) return;

    try {
      await resolveComment.mutateAsync({
        workspaceId,
        fileId,
        commentId,
        isResolved,
      });
      toast.success(isResolved ? 'Comment resolved' : 'Comment reopened');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update comment');
    }
  };

  const renderComment = (comment: FileComment, isReply = false) => {
    const isAuthor = comment.userId === user?.id;
    const isEditing = editingComment === comment.id;

    return (
      <div
        key={comment.id}
        className={cn(
          'p-3 rounded-lg border',
          isReply ? 'ml-8 bg-muted/30' : 'bg-card',
          comment.isResolved && 'opacity-60'
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author?.avatarUrl} />
            <AvatarFallback>
              {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.author?.name || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
                {comment.isResolved && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolved
                  </span>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isReply && (
                    <DropdownMenuItem onClick={() => setReplyingTo(comment.id)}>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                  )}
                  {!isReply && (
                    <DropdownMenuItem
                      onClick={() => handleResolveComment(comment.id, !comment.isResolved)}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {comment.isResolved ? 'Reopen' : 'Resolve'}
                    </DropdownMenuItem>
                  )}
                  {isAuthor && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {isAuthor && (
                    <DropdownMenuItem
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your comment..."
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateComment(comment.id)}
                    disabled={updateComment.isPending || !editContent.trim()}
                  >
                    {updateComment.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
            )}
          </div>
        </div>

        {/* Reply input */}
        {replyingTo === comment.id && (
          <div className="mt-3 ml-11 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSubmitReply(comment.id)}
                disabled={createComment.isPending || !replyContent.trim()}
              >
                {createComment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Reply
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">Comments</h3>
        {comments && comments.length > 0 && (
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        )}
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1 p-4">
        {!comments || comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">
              Be the first to comment on this file
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </ScrollArea>

      {/* New comment input */}
      <div className="p-4 border-t space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmitComment();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Press Cmd+Enter to send
          </span>
          <Button
            onClick={handleSubmitComment}
            disabled={createComment.isPending || !newComment.trim()}
          >
            {createComment.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
