/**
 * CommentSection Component
 * Comment display and submission for blog posts
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, Reply, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { 
  blogService, 
  type BlogComment, 
  type CreateCommentData,
  type PaginatedResponse 
} from '@/lib/api/blog-api';

interface CommentSectionProps {
  postId: string;
  className?: string;
}

interface CommentItemProps {
  comment: BlogComment;
  onReply: (parentId: string) => void;
  isReplying: boolean;
  replyingTo?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  isReplying,
  replyingTo,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex space-x-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
          <AvatarFallback>
            {comment.author.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{comment.content}</div>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="text-xs h-auto p-1 text-muted-foreground hover:text-foreground"
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
          </div>
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              isReplying={isReplying && replyingTo === reply.id}
              replyingTo={replyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentFormProps {
  onSubmit: (data: CreateCommentData) => Promise<void>;
  parentId?: string;
  onCancel?: () => void;
  placeholder?: string;
  buttonText?: string;
  isSubmitting: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  parentId,
  onCancel,
  placeholder = "Share your thoughts...",
  buttonText = "Post Comment",
  isSubmitting,
}) => {
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!authorName.trim()) newErrors.authorName = 'Name is required';
    if (!authorEmail.trim()) newErrors.authorEmail = 'Email is required';
    if (!content.trim()) newErrors.content = 'Comment is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({
        authorName: authorName.trim(),
        authorEmail: authorEmail.trim(),
        content: content.trim(),
        parentId,
      });
      
      // Reset form
      setContent('');
      if (!parentId) { // Only reset name/email for main comments, not replies
        setAuthorName('');
        setAuthorEmail('');
      }
      setErrors({});
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!parentId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="authorName">Name *</Label>
            <Input
              id="authorName"
              value={authorName}
              onChange={(e) => {
                setAuthorName(e.target.value);
                if (errors.authorName) setErrors(prev => ({ ...prev, authorName: '' }));
              }}
              placeholder="Your name"
              className={errors.authorName ? 'border-red-500' : ''}
            />
            {errors.authorName && (
              <p className="text-red-500 text-xs mt-1">{errors.authorName}</p>
            )}
          </div>
          <div>
            <Label htmlFor="authorEmail">Email *</Label>
            <Input
              id="authorEmail"
              type="email"
              value={authorEmail}
              onChange={(e) => {
                setAuthorEmail(e.target.value);
                if (errors.authorEmail) setErrors(prev => ({ ...prev, authorEmail: '' }));
              }}
              placeholder="your@email.com"
              className={errors.authorEmail ? 'border-red-500' : ''}
            />
            {errors.authorEmail && (
              <p className="text-red-500 text-xs mt-1">{errors.authorEmail}</p>
            )}
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="content">Comment *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (errors.content) setErrors(prev => ({ ...prev, content: '' }));
          }}
          placeholder={placeholder}
          rows={4}
          className={errors.content ? 'border-red-500' : ''}
        />
        {errors.content && (
          <p className="text-red-500 text-xs mt-1">{errors.content}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4 mr-2" />}
          {buttonText}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  className = '',
}) => {
  const [comments, setComments] = useState<PaginatedResponse<BlogComment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [postId, currentPage]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await blogService.getComments(postId, currentPage, 10);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (data: CreateCommentData) => {
    try {
      setSubmitting(true);
      await blogService.createComment(postId, data);
      
      toast({
        title: 'Comment Posted!',
        description: 'Your comment has been submitted and is pending approval.',
      });
      
      // Refresh comments
      await fetchComments();
      setReplyingTo(undefined);
    } catch (error) {
      toast({
        title: 'Comment Failed',
        description: 'Unable to post your comment. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(replyingTo === parentId ? undefined : parentId);
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  if (loading && !comments) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          Comments ({comments?.pagination.total || 0})
        </CardTitle>
        <CardDescription>
          Share your thoughts and join the conversation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment Form */}
        <CommentForm
          onSubmit={handleCommentSubmit}
          isSubmitting={submitting}
        />

        {/* Comments List */}
        {comments && comments.data.length > 0 ? (
          <div className="space-y-6">
            {comments.data.map((comment) => (
              <div key={comment.id} className="space-y-3">
                <CommentItem
                  comment={comment}
                  onReply={handleReply}
                  isReplying={replyingTo === comment.id}
                  replyingTo={replyingTo}
                />
                
                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="ml-11">
                    <CommentForm
                      onSubmit={handleCommentSubmit}
                      parentId={comment.id}
                      onCancel={() => setReplyingTo(undefined)}
                      placeholder="Write a reply..."
                      buttonText="Post Reply"
                      isSubmitting={submitting}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Load More Button */}
            {comments.pagination.page < comments.pagination.totalPages && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Load More Comments'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">No comments yet</h3>
            <p className="text-muted-foreground text-sm">
              Be the first to share your thoughts!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};