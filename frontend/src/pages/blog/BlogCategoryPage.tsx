/**
 * BlogCategoryPage Component
 * Display blog posts filtered by category
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { FolderOpen, ArrowLeft, Grid, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
  type PublicBlogCategory,
  type PaginatedResponse, 
  type BlogQuery 
} from '@/lib/api/blog-api';

export const BlogCategoryPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PaginatedResponse<PublicBlogPost> | null>(null);
  const [category, setCategory] = useState<PublicBlogCategory | null>(null);
  const [allCategories, setAllCategories] = useState<PublicBlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<BlogQuery['sortBy']>('publishedAt');
  const [sortOrder, setSortOrder] = useState<BlogQuery['sortOrder']>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const { toast } = useToast();

  useEffect(() => {
    if (categorySlug) {
      fetchCategoryAndPosts();
      fetchAllCategories();
    }
  }, [categorySlug, currentPage, sortBy, sortOrder]);

  const fetchCategoryAndPosts = async () => {
    if (!categorySlug) return;
    
    try {
      setLoading(true);
      
      // Fetch posts by category
      const query: BlogQuery = {
        page: currentPage,
        limit: 12,
        categorySlug,
        sortBy,
        sortOrder,
      };

      const postsData = await blogService.getPostsByCategory(categorySlug, query);
      setPosts(postsData);

      // Find the category from the posts data
      if (postsData.data.length > 0) {
        const foundCategory = postsData.data[0].categories.find(
          cat => cat.slug === categorySlug
        );
        setCategory(foundCategory || null);
      } else {
        // If no posts, try to fetch all categories to get the category info
        const categories = await blogService.getBlogCategories();
        const foundCategory = categories.find(cat => cat.slug === categorySlug);
        setCategory(foundCategory || null);
      }

      // Update URL params
      const params = new URLSearchParams();
      if (currentPage > 1) params.set('page', currentPage.toString());
      setSearchParams(params);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load category posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const categories = await blogService.getBlogCategories();
      setAllCategories(categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
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
      fetchCategoryAndPosts();
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
    if (category) {
      document.title = `${category.name} - Blog Category | Deskive`;
    }
  }, [category]);

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
        title={category ? `${category.name} Articles - Deskive Blog` : 'Category - Deskive Blog'}
        description={category?.description || `Browse articles in the ${categorySlug} category. Tips, guides, and insights on productivity and team collaboration.`}
        keywords={[category?.name || categorySlug || 'category', 'blog', 'articles', 'guides']}
        ogImage="/og-images/blog-category.png"
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
              <FolderOpen className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">
                {category?.name || 'Category'}
              </h1>
            </div>

            {category?.description && (
              <p className="text-xl text-muted-foreground mb-6">
                {category.description}
              </p>
            )}

            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {posts?.pagination.total || 0} posts
              </Badge>
              {category?.parent && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>Parent category:</span>
                  <Link 
                    to={`/blog/category/${category.parent.slug}`}
                    className="ml-2 hover:text-primary font-medium"
                  >
                    {category.parent.name}
                  </Link>
                </div>
              )}
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
                  Posts in {category?.name}
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

            {/* Subcategories */}
            {category?.children && category.children.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Subcategories</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {category.children.map((subcategory) => (
                    <Card key={subcategory.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <Link to={`/blog/category/${subcategory.slug}`}>
                          <h4 className="font-semibold hover:text-primary transition-colors">
                            {subcategory.name}
                          </h4>
                          {subcategory.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {subcategory.description}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-3">
                            <Badge variant="outline" className="text-xs">
                              {subcategory.postCount} posts
                            </Badge>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Grid/List */}
            {posts?.data.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts in this category</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    There are no published posts in the "{category?.name}" category yet.
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

            {/* Related Categories */}
            {allCategories.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <FolderOpen className="w-5 h-5 mr-2" />
                    All Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allCategories
                      .filter(cat => cat.slug !== categorySlug)
                      .slice(0, 8)
                      .map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/blog/category/${cat.slug}`}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <span className="font-medium">{cat.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {cat.postCount}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                  {allCategories.length > 8 && (
                    <div className="mt-4 pt-4 border-t">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to="/blog/categories">View All Categories</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};