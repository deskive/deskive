/**
 * BlogAuthorPage Component
 * Display blog posts by a specific author with author information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { User, ArrowLeft, Grid, List, Calendar, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { PageSEO } from '../../components/seo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { BlogCard, BlogSidebar } from '../../components/blog';
import { useToast } from '../../hooks/use-toast';
import { 
  blogService, 
  type PublicBlogPost, 
  type PaginatedResponse, 
  type BlogQuery 
} from '@/lib/api/blog-api';

interface AuthorInfo {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  totalPosts: number;
  joinDate: string;
}

export const BlogAuthorPage: React.FC = () => {
  const { authorId } = useParams<{ authorId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PaginatedResponse<PublicBlogPost> | null>(null);
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<BlogQuery['sortBy']>('publishedAt');
  const [sortOrder, setSortOrder] = useState<BlogQuery['sortOrder']>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const { toast } = useToast();

  useEffect(() => {
    if (authorId) {
      fetchAuthorAndPosts();
    }
  }, [authorId, currentPage, sortBy, sortOrder]);

  const fetchAuthorAndPosts = async () => {
    if (!authorId) return;
    
    try {
      setLoading(true);
      
      // Fetch posts by author
      const query: BlogQuery = {
        page: currentPage,
        limit: 12,
        authorId,
        sortBy,
        sortOrder,
      };

      const postsData = await blogService.getPostsByAuthor(authorId, query);
      setPosts(postsData);

      // Extract author info from posts or create basic author info
      if (postsData.data.length > 0) {
        const firstPost = postsData.data[0];

        setAuthor({
          id: firstPost.author.id,
          name: firstPost.author.name,
          avatar: firstPost.author.avatar,
          bio: firstPost.author.bio,
          totalPosts: postsData.pagination.total,
          joinDate: firstPost.author.id, // This would normally come from user registration date
        });
      } else {
        // If no posts, create minimal author info
        // In a real app, you'd fetch author info from a separate endpoint
        setAuthor({
          id: authorId,
          name: 'Author',
          totalPosts: 0,
          joinDate: new Date().toISOString(),
        });
      }

      // Update URL params
      const params = new URLSearchParams();
      if (currentPage > 1) params.set('page', currentPage.toString());
      setSearchParams(params);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load author posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLike = async (postId: string) => {
    try {
      await blogService.toggleLike(postId);
      // Refresh the current view
      fetchAuthorAndPosts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update like status',
        variant: 'destructive',
      });
    }
  };

  // Update page title
  useEffect(() => {
    if (author) {
      document.title = `${author.name} - Blog Author | Deskive`;
    }
  }, [author]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title={author ? `Articles by ${author.name} - Deskive Blog` : 'Author - Deskive Blog'}
        description={author?.bio || `Read articles written by ${author?.name || 'our author'}. Expert insights on productivity, team collaboration, and workplace efficiency.`}
        keywords={['author', author?.name || 'writer', 'blog posts', 'articles']}
        ogImage={author?.avatar || '/og-images/blog-author.png'}
        author={author?.name}
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl">
            {/* Back Button */}
            <div className="mb-6">
              <Button variant="ghost" asChild>
                <Link to="/blog">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Blog
                </Link>
              </Button>
            </div>

            {/* Author Profile */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="w-24 h-24 md:w-32 md:h-32">
                <AvatarImage src={author?.avatar} alt={author?.name} />
                <AvatarFallback className="text-2xl md:text-3xl">
                  {author?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                    {author?.name}
                  </h1>
                  <Badge variant="outline" className="text-sm">
                    Author
                  </Badge>
                </div>

                {author?.bio && (
                  <p className="text-lg text-muted-foreground mb-4">
                    {author.bio}
                  </p>
                )}

                {/* Author Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center md:text-left">
                    <div className="text-2xl font-bold">{author?.totalPosts}</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center md:justify-start">
                      <BookOpen className="w-4 h-4 mr-1" />
                      Posts
                    </div>
                  </div>
                  <div className="text-center md:text-left">
                    <div className="text-2xl font-bold">
                      {posts?.data.length ?
                        Math.round(posts.data.reduce((acc, post) => acc + post.readTime, 0) / posts.data.length) : 0
                      }
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center md:justify-start">
                      <Calendar className="w-4 h-4 mr-1" />
                      Avg Read
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Filter and Sort Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">
                  Posts by {author?.name}
                </h2>
                {posts && (
                  <Badge variant="outline">
                    {posts.pagination.total} posts
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Sort Controls */}
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publishedAt">Latest</SelectItem>
                    <SelectItem value="title">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Desc</SelectItem>
                    <SelectItem value="asc">Asc</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Posts Grid/List */}
            {posts?.data.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {author?.name} hasn't published any posts yet. Check back later!
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/blog">Browse All Posts</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'md:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {posts?.data.map((post) => (
                    <BlogCard
                      key={post.id}
                      post={post}
                      variant={viewMode === 'list' ? 'compact' : 'default'}
                      onLike={handleLike}
                      showAuthor={false} // Hide author since we're on author page
                    />
                  ))}
                </div>

                {/* Pagination */}
                {posts && posts.pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, posts.pagination.totalPages))].map((_, i) => {
                        const pageNumber = Math.max(1, currentPage - 2) + i;
                        if (pageNumber > posts.pagination.totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNumber}
                            variant={pageNumber === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === posts.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80">
            <BlogSidebar />

            {/* Author Details Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <User className="w-5 h-5 mr-2" />
                  About {author?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarImage src={author?.avatar} alt={author?.name} />
                    <AvatarFallback className="text-lg">
                      {author?.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{author?.name}</h3>
                  {author?.bio && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {author.bio}
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Posts:</span>
                    <span className="font-medium">{author?.totalPosts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};