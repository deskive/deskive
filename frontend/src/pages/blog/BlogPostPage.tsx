import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Star, Calendar, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import 'react-quill-new/dist/quill.snow.css';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { PageSEO } from '../../components/seo';
import {
  useBlogPost,
  useBlogComments,
  useCreateComment,
  useBlogRatings,
  useUserRating,
  useCreateRating,
  useRelatedPosts
} from '@/lib/api/blog-api';
import { BlogHeader } from '../../components/blog/BlogHeader';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl } from 'react-intl';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const intl = useIntl();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(true);

  // Comment form state
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Rating form state
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingReview, setRatingReview] = useState('');

  // Fetch post data
  const { data: post, isLoading: isLoadingPost } = useBlogPost(slug || '');
  const { data: commentsData } = useBlogComments(post?.id || '', 1, 20);
  const { data: ratings = [] } = useBlogRatings(post?.id || '');
  const { data: userRating } = useUserRating(post?.id || '');
  const { data: relatedPosts = [] } = useRelatedPosts(post?.id || '', 3);

  const createCommentMutation = useCreateComment();
  const createRatingMutation = useCreateRating();

  const comments = commentsData?.data || [];
  const images = post?.images && post.images.length > 0 ? post.images : (post?.featuredImage ? [post.featuredImage] : []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleSubmitComment = async () => {
    if (!post || !commentText.trim()) {
      toast({ title: 'Please write a comment', variant: 'destructive' });
      return;
    }

    if (!isAuthenticated) {
      toast({ title: 'Please login to comment', variant: 'destructive' });
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        postId: post.id,
        data: {
          content: commentText,
          authorName: user?.name || user?.email || 'Anonymous',
          authorEmail: user?.email || '',
        },
      });
      toast({ title: 'Comment posted successfully!' });
      setCommentText('');
    } catch (error) {
      toast({ title: 'Failed to post comment', variant: 'destructive' });
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!post || !replyText.trim()) {
      toast({ title: 'Please write a reply', variant: 'destructive' });
      return;
    }

    if (!isAuthenticated) {
      toast({ title: 'Please login to reply', variant: 'destructive' });
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        postId: post.id,
        data: {
          content: replyText,
          authorName: user?.name || user?.email || 'Anonymous',
          authorEmail: user?.email || '',
          parentId,
        },
      });
      toast({ title: 'Reply posted successfully!' });
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    }
  };

  const handleSubmitRating = async () => {
    if (!post || selectedRating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }

    if (!isAuthenticated) {
      toast({ title: 'Please login to submit a rating', variant: 'destructive' });
      return;
    }

    try {
      await createRatingMutation.mutateAsync({
        postId: post.id,
        data: {
          rating: selectedRating,
          review: ratingReview || undefined,
          userName: user?.name || user?.email,
          userEmail: user?.email,
        },
      });
      toast({ title: 'Rating submitted successfully!' });
      setSelectedRating(0);
      setRatingReview('');
    } catch (error) {
      toast({ title: 'Failed to submit rating', variant: 'destructive' });
    }
  };

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratings.filter(r => r.rating === star).length,
    percentage: ratings.length > 0 ? (ratings.filter(r => r.rating === star).length / ratings.length) * 100 : 0,
  }));

  if (isLoadingPost) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Post not found</p>
      </div>
    );
  }

  const averageRating = post.ratingAverage || 0;
  const ratingCount = post.ratingCount || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageSEO
        title={post.title}
        description={post.excerpt || ''}
      />

      {/* Public Header */}
      <BlogHeader />

      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/blog')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'blog.post.backToBlog', defaultMessage: 'Back to Blog' })}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
            {/* Featured Image Slider */}
            {images.length > 0 && (
              <div className="relative mb-8 rounded-xl overflow-hidden bg-gray-100">
                <div className="relative h-96">
                  <img
                    src={images[currentImageIndex]}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Post Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>

              <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                {post.categories?.[0] && (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                    {post.categories[0].name}
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm">
                    {post.author?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="font-medium text-gray-900">{post.author?.name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="prose prose-lg max-w-none mb-12">
              <div
                className="text-gray-700 leading-relaxed blog-post-content"
                dangerouslySetInnerHTML={{
                  __html: post.content
                    .replace(/<p>/gi, '')
                    .replace(/<\/p>/gi, ' ')
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/\n/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .replace(/(##\s+[^<]+)/g, '<h2>$1</h2>')
                    .trim()
                }}
              />
            </div>

            <style>{`
              .blog-post-content {
                white-space: normal !important;
                line-height: 1.8;
                font-size: 1.125rem;
              }
              .blog-post-content br {
                display: none !important;
              }
              .blog-post-content h1,
              .blog-post-content h2,
              .blog-post-content h3 {
                margin-top: 2em;
                margin-bottom: 0.75em;
                font-weight: 600;
                display: block;
                line-height: 1.3;
              }
              .blog-post-content h2 {
                font-size: 1.875rem;
                margin-top: 2.5em;
              }
              .blog-post-content h3 {
                font-size: 1.5rem;
              }
              .blog-post-content ul,
              .blog-post-content ol {
                margin: 1.5em 0;
                padding-left: 2em;
                display: block;
              }
              .blog-post-content li {
                margin-bottom: 0.5em;
                display: list-item;
              }
              .blog-post-content a {
                color: #10b981;
                text-decoration: underline;
              }
              .blog-post-content img {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                margin: 2em 0;
                display: block;
              }
              .blog-post-content blockquote {
                border-left: 4px solid #10b981;
                padding-left: 1em;
                margin: 1.5em 0;
                color: #6b7280;
                font-style: italic;
                display: block;
              }
              .blog-post-content pre {
                background-color: #f3f4f6;
                padding: 1em;
                border-radius: 0.5rem;
                overflow-x: auto;
                white-space: pre !important;
                display: block;
                margin: 1.5em 0;
              }
              .blog-post-content code {
                background-color: #f3f4f6;
                padding: 0.2em 0.4em;
                border-radius: 0.25rem;
                font-size: 0.9em;
              }
            `}</style>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                      onClick={() => navigate(`/blog/tag/${tag.slug}`)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Rating Section */}
            <div className="mb-12">
              <Card className="border-gray-200">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">{intl.formatMessage({ id: 'admin.blog.post.ratingsReviews', defaultMessage: 'Ratings & Reviews' })}</h3>
                  </div>

                  {/* Average Rating Display */}
                  <div className="flex items-start gap-8 mb-8 pb-8 border-b">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 mb-2">
                        {averageRating > 0 ? Number(averageRating).toFixed(1) : '0.0'}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(averageRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">{ratingCount} {intl.formatMessage({ id: ratingCount === 1 ? 'admin.blog.post.rating' : 'admin.blog.post.ratings', defaultMessage: ratingCount === 1 ? 'rating' : 'ratings' })}</p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="flex-1">
                      {ratingDistribution.map(({ star, count, percentage }) => (
                        <div key={star} className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-gray-600 w-12">{star} {intl.formatMessage({ id: 'admin.blog.post.star', defaultMessage: 'star' })}</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User's Rating Display - If already rated */}
                  {userRating && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-sm text-emerald-700 font-medium mb-2">{intl.formatMessage({ id: 'admin.blog.post.yourRating', defaultMessage: 'Your Rating' })}</p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= userRating.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-gray-700 ml-2">{userRating.rating}/5</span>
                      </div>
                      {userRating.review && (
                        <p className="text-sm text-gray-700 mt-2">{userRating.review}</p>
                      )}
                    </div>
                  )}

                  {/* Rating Form - Only for logged-in users who haven't rated yet */}
                  {!userRating && isAuthenticated && (
                    <div className="mb-6 p-6 bg-teal-50 border border-teal-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-4">{intl.formatMessage({ id: 'admin.blog.post.rateThisPost', defaultMessage: 'Rate this Post' })}</h4>

                      {/* Star Selection */}
                      <div className="mb-4">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              onClick={() => setSelectedRating(star)}
                              style={{
                                cursor: 'pointer',
                                fill: star <= selectedRating ? '#facc15' : 'none',
                                stroke: star <= selectedRating ? '#facc15' : '#d1d5db',
                                strokeWidth: 2,
                              }}
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                          <span style={{ marginLeft: '8px', color: '#374151' }}>
                            {selectedRating > 0 ? `${selectedRating}/5` : '/5'}
                          </span>
                        </div>
                      </div>

                      {/* Review Text */}
                      <div className="mb-4">
                        <Label htmlFor="review" className="text-sm text-gray-700 mb-2 block">
                          Review (optional)
                        </Label>
                        <Textarea
                          id="review"
                          value={ratingReview}
                          onChange={(e) => setRatingReview(e.target.value)}
                          placeholder="Share your thoughts about this post..."
                          rows={3}
                          className="border-gray-300"
                        />
                      </div>

                      <Button
                        onClick={handleSubmitRating}
                        disabled={selectedRating === 0 || createRatingMutation.isPending}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                      >
                        Submit Rating
                      </Button>
                    </div>
                  )}

                  {/* Login Prompt for Non-Authenticated Users */}
                  {!userRating && !isAuthenticated && (
                    <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <h4 className="font-semibold text-gray-900 mb-2">Login to Rate This Post</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Please log in to submit a rating and review
                      </p>
                      <Button
                        onClick={() => navigate('/auth/login')}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        Login to Rate
                      </Button>
                    </div>
                  )}

                  {/* Recent Reviews */}
                  {ratings.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4">{intl.formatMessage({ id: 'admin.blog.post.recentReviews', defaultMessage: 'Recent Reviews' })}</h4>
                      <div className="space-y-4">
                        {ratings.slice(0, 5).map((rating) => (
                          <div key={rating.id} className="pb-4 border-b border-gray-200 last:border-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= rating.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {rating.userName || 'Anonymous'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(rating.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            {rating.review && (
                              <p className="text-sm text-gray-700">{rating.review}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Comments Section */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-2xl font-bold text-gray-900">{intl.formatMessage({ id: 'admin.blog.post.comments', defaultMessage: 'Comments' })}</h3>
                  <Badge variant="secondary" className="text-sm">
                    {post.commentCount || 0} {intl.formatMessage({ id: 'admin.blog.post.comment', defaultMessage: 'comments' })}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-gray-600"
                >
                  {showComments ? intl.formatMessage({ id: 'admin.blog.post.collapse', defaultMessage: 'Collapse' }) : intl.formatMessage({ id: 'admin.blog.post.expand', defaultMessage: 'Expand' })}
                </Button>
              </div>

              {showComments && (
                <div className="space-y-6">
                  {/* Add Comment Form */}
                  <Card className="border-gray-200">
                    <CardContent className="p-4">
                      {isAuthenticated ? (
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1">
                            <Textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={intl.formatMessage({ id: 'admin.blog.post.writeComment', defaultMessage: 'Add a comment...' })}
                              className="mb-3 border-gray-300"
                              rows={3}
                            />
                            <Button
                              onClick={handleSubmitComment}
                              disabled={!commentText.trim() || createCommentMutation.isPending}
                              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {createCommentMutation.isPending ? intl.formatMessage({ id: 'common.saving', defaultMessage: 'Submitting...' }) : intl.formatMessage({ id: 'admin.blog.post.postComment', defaultMessage: 'Comment' })}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-600 mb-3">{intl.formatMessage({ id: 'admin.blog.post.loginToComment', defaultMessage: 'Please login to leave a comment' })}</p>
                          <Button
                            onClick={() => navigate('/auth/login')}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                          >
                            {intl.formatMessage({ id: 'navigation.signIn', defaultMessage: 'Login to Comment' })}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Comments List */}
                  {comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <Card key={comment.id} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {comment.author?.name?.charAt(0) || 'A'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900">
                                    {comment.author?.name || 'Anonymous'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {new Date(comment.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                                <p className="text-gray-700 mb-2">{comment.content}</p>

                                {/* Reply Button */}
                                {isAuthenticated && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                    className="text-gray-600 h-8 px-2"
                                  >
                                    Reply
                                  </Button>
                                )}

                                {/* Reply Form */}
                                {replyingTo === comment.id && isAuthenticated && (
                                  <div className="mt-3 ml-4 pl-4 border-l-2 border-emerald-200">
                                    <div className="flex gap-2">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0 text-xs">
                                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                      </div>
                                      <div className="flex-1">
                                        <Textarea
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value)}
                                          placeholder={`Reply to ${comment.author?.name || 'Anonymous'}...`}
                                          className="mb-2 border-gray-300"
                                          rows={2}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => handleSubmitReply(comment.id)}
                                            disabled={!replyText.trim() || createCommentMutation.isPending}
                                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                          >
                                            {createCommentMutation.isPending ? 'Posting...' : 'Post Reply'}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setReplyingTo(null);
                                              setReplyText('');
                                            }}
                                            className="border-gray-300"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Show Replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="mt-4 ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} className="flex gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold flex-shrink-0 text-xs">
                                          {reply.author?.name?.charAt(0) || 'A'}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm text-gray-900">
                                              {reply.author?.name || 'Anonymous'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                              {new Date(reply.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                              })}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700">{reply.content}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No comments yet. Be the first to comment!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="w-80 flex-shrink-0">
            <div className="space-y-6 sticky top-24">
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Related Posts</h3>
                    <div className="space-y-4">
                      {relatedPosts.map((related) => (
                        <div
                          key={related.id}
                          onClick={() => navigate(`/blog/${related.slug}`)}
                          className="flex gap-3 cursor-pointer group"
                        >
                          <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {related.featuredImage ? (
                              <img
                                src={related.featuredImage}
                                alt={related.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-1">
                              {related.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {new Date(related.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => navigate('/blog')}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Blog
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
