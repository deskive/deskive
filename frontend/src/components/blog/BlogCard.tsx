/**
 * BlogCard Component
 * Beautiful card component for displaying blog post previews
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Eye, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { PublicBlogPost } from '@/lib/api/blog-api';
import { blogService } from '@/lib/api/blog-api';

interface BlogCardProps {
  post: PublicBlogPost;
  variant?: 'default' | 'featured' | 'compact' | 'minimal';
  showAuthor?: boolean;
  showStats?: boolean;
  showExcerpt?: boolean;
  showTags?: boolean;
  className?: string;
  onLike?: (postId: string) => void;
}

export const BlogCard: React.FC<BlogCardProps> = ({
  post,
  variant = 'default',
  showAuthor = true,
  showStats = true,
  showExcerpt = true,
  showTags = true,
  className = '',
  onLike,
}) => {
  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(post.id);
  };

  // Render different variants
  if (variant === 'featured') {
    return (
      <Card className={`group hover:shadow-xl transition-all duration-300 overflow-hidden ${className}`}>
        <Link to={`/blog/${post.slug}`} className="block">
          {post.featuredImage && (
            <div className="relative h-64 overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary" className="bg-white/90 text-black">
                  Featured
                </Badge>
              </div>
            </div>
          )}
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                {showExcerpt && post.excerpt && (
                  <p className="text-muted-foreground mt-2 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
              </div>

              {showAuthor && (
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                    <AvatarFallback>
                      {post.author.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <span className="font-medium">{post.author.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {blogService.formatDate(post.publishedAt)}
                    </span>
                  </div>
                </div>
              )}

              {showTags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                  {post.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{post.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              {showStats && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {post.readTime} min read
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {post.viewCount}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Heart className="w-4 h-4 mr-1" />
                      {post.likeCount}
                    </Button>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      {post.commentCount}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={`group hover:shadow-md transition-shadow ${className}`}>
        <Link to={`/blog/${post.slug}`} className="block">
          <CardContent className="p-4">
            <div className="flex space-x-3">
              {post.featuredImage && (
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <div className="text-sm text-muted-foreground mt-1">
                  {blogService.formatDate(post.publishedAt)}
                </div>
                {showStats && (
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-2">
                    <span>{post.readTime} min</span>
                    <span>{post.viewCount} views</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`group ${className}`}>
        <Link to={`/blog/${post.slug}`} className="block">
          <div className="space-y-2">
            <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>
            <div className="text-sm text-muted-foreground">
              {blogService.formatDate(post.publishedAt)} • {post.readTime} min read
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Default variant
  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 overflow-hidden ${className}`}>
      <Link to={`/blog/${post.slug}`} className="block">
        {post.featuredImage && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              {showExcerpt && post.excerpt && (
                <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">
                  {post.excerpt}
                </p>
              )}
            </div>

            {showAuthor && (
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={post.author.avatar} alt={post.author.name} />
                  <AvatarFallback className="text-xs">
                    {post.author.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                  <span>{post.author.name}</span>
                  <span className="mx-2">•</span>
                  <span>{blogService.formatDate(post.publishedAt)}</span>
                </div>
              </div>
            )}

            {showTags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs px-2 py-1">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}

            {showStats && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {post.readTime} min
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {post.viewCount}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className="text-muted-foreground hover:text-red-500 h-auto p-0"
                  >
                    <Heart className="w-3 h-3 mr-1" />
                    {post.likeCount}
                  </Button>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {post.commentCount}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};