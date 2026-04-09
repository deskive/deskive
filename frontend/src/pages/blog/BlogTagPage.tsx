/**
 * BlogTagPage Component
 * Display blog posts filtered by tag
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Tag as TagIcon, ArrowLeft, Grid, List } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  type PublicBlogTag,
  type PaginatedResponse, 
  type BlogQuery 
} from '@/lib/api/blog-api';

export const BlogTagPage: React.FC = () => {
  const { tagSlug } = useParams<{ tagSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PaginatedResponse<PublicBlogPost> | null>(null);
  const [tag, setTag] = useState<PublicBlogTag | null>(null);
  const [allTags, setAllTags] = useState<PublicBlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<BlogQuery['sortBy']>('publishedAt');
  const [sortOrder, setSortOrder] = useState<BlogQuery['sortOrder']>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const { toast } = useToast();

  useEffect(() => {
    if (tagSlug) {
      fetchTagAndPosts();
      fetchAllTags();
    }
  }, [tagSlug, currentPage, sortBy, sortOrder]);

  const fetchTagAndPosts = async () => {
    if (!tagSlug) return;
    
    try {
      setLoading(true);
      
      // Fetch posts by tag
      const query: BlogQuery = {
        page: currentPage,
        limit: 12,
        tagSlug,
        sortBy,
        sortOrder,
      };

      const postsData = await blogService.getPostsByTag(tagSlug, query);
      setPosts(postsData);

      // Find the tag from the posts data
      if (postsData.data.length > 0) {
        const foundTag = postsData.data[0].tags.find(
          tagItem => tagItem.slug === tagSlug
        );
        setTag(foundTag || null);
      } else {
        // If no posts, try to fetch all tags to get the tag info
        const tags = await blogService.getBlogTags();
        const foundTag = tags.find(tagItem => tagItem.slug === tagSlug);
        setTag(foundTag || null);
      }

      // Update URL params
      const params = new URLSearchParams();
      if (currentPage > 1) params.set('page', currentPage.toString());
      setSearchParams(params);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tag posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const tags = await blogService.getBlogTags();
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
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
      fetchTagAndPosts();
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
    if (tag) {
      document.title = `#${tag.name} - Blog Tag | Deskive`;
    }
  }, [tag]);

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
        title={tag ? `#${tag.name} Posts - Deskive Blog` : 'Tag - Deskive Blog'}
        description={`Explore all posts tagged with ${tag?.name || tagSlug}. Discover related content on productivity, collaboration, and team management.`}
        keywords={[tag?.name || tagSlug || 'tag', 'blog posts', 'articles']}
        ogImage="/og-images/blog-tag.png"
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            {/* Back Button */}
            <div className="mb-6">
              <Button variant="ghost" asChild>
                <Link to="/blog">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Blog
                </Link>
              </Button>
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center">
                <TagIcon 
                  className="w-8 h-8 mr-2" 
                  style={{ color: tag?.color || undefined }}
                />
                <h1 className="text-4xl font-bold tracking-tight">
                  #{tag?.name || 'Tag'}
                </h1>
              </div>
            </div>

            {tag?.description && (
              <p className="text-xl text-muted-foreground mb-6">
                {tag.description}
              </p>
            )}

            <div className="flex items-center space-x-4">
              <Badge 
                variant="outline" 
                className="text-sm"
                style={{ 
                  borderColor: tag?.color || undefined,
                  color: tag?.color || undefined 
                }}
              >
                {posts?.pagination.total || 0} posts
              </Badge>
              <div className="text-sm text-muted-foreground">
                Explore all posts tagged with <strong>#{tag?.name}</strong>
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
                  Posts tagged #{tag?.name}
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
                  <TagIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts with this tag</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    There are no published posts tagged with "#{tag?.name}" yet.
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

            {/* Related Tags */}
            {allTags.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <TagIcon className="w-5 h-5 mr-2" />
                    All Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {allTags
                      .filter(tagItem => tagItem.slug !== tagSlug)
                      .slice(0, 20)
                      .map((tagItem) => (
                      <Link key={tagItem.id} to={`/blog/tag/${tagItem.slug}`}>
                        <Badge 
                          variant="outline" 
                          className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer text-xs"
                          style={{ 
                            borderColor: tagItem.color || undefined,
                            color: tagItem.color || undefined 
                          }}
                        >
                          #{tagItem.name} ({tagItem.postCount})
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  {allTags.length > 20 && (
                    <div className="mt-4 pt-4 border-t">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to="/blog/tags">View All Tags</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tag Cloud - Most Popular Tags */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Popular Tags</CardTitle>
                <CardDescription>Explore trending topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allTags
                    .sort((a, b) => b.postCount - a.postCount)
                    .slice(0, 10)
                    .map((tagItem) => {
                      // Calculate size based on popularity
                      const maxCount = Math.max(...allTags.map(t => t.postCount));
                      const relativeSize = (tagItem.postCount / maxCount);
                      const fontSize = Math.max(0.75, relativeSize * 1.2); // min 12px, max ~19px
                      
                      return (
                        <Link key={tagItem.id} to={`/blog/tag/${tagItem.slug}`}>
                          <Badge 
                            variant={tagItem.slug === tagSlug ? "default" : "outline"}
                            className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                            style={{ 
                              fontSize: `${fontSize}rem`,
                              borderColor: tagItem.color || undefined,
                              color: tagItem.slug === tagSlug ? undefined : tagItem.color || undefined,
                            }}
                          >
                            #{tagItem.name}
                          </Badge>
                        </Link>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};