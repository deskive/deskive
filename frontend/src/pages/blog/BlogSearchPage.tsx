/**
 * BlogSearchPage Component
 * Advanced blog search with filters and categories
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, X, Grid, List } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { PageSEO } from '../../components/seo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { BlogCard, BlogSidebar } from '../../components/blog';
import { useToast } from '../../hooks/use-toast';
import { 
  blogService, 
  type PublicBlogPost, 
  type PublicBlogCategory,
  type PublicBlogTag,
  type PaginatedResponse, 
  type BlogQuery 
} from '@/lib/api/blog-api';

export const BlogSearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<PaginatedResponse<PublicBlogPost> | null>(null);
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);
  const [tags, setTags] = useState<PublicBlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [sortBy, setSortBy] = useState<BlogQuery['sortBy']>('publishedAt');
  const [sortOrder, setSortOrder] = useState<BlogQuery['sortOrder']>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategoriesAndTags();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [currentPage, sortBy, sortOrder, selectedCategory, selectedTag]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPosts();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCategoriesAndTags = async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        blogService.getBlogCategories(),
        blogService.getBlogTags(),
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to fetch categories and tags:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const query: BlogQuery = {
        page: currentPage,
        limit: 12,
        sortBy,
        sortOrder,
      };

      if (searchTerm) query.search = searchTerm;
      if (selectedCategory) query.categorySlug = selectedCategory;
      if (selectedTag) query.tagSlug = selectedTag;

      const data = await blogService.getBlogPosts(query);
      setPosts(data);

      // Update URL params
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedTag) params.set('tag', selectedTag);
      if (currentPage > 1) params.set('page', currentPage.toString());
      setSearchParams(params);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search blog posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPosts();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTag('');
    setCurrentPage(1);
    setSearchParams({});
    fetchPosts();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLike = async (postId: string) => {
    try {
      await blogService.toggleLike(postId);
      fetchPosts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update like status',
        variant: 'destructive',
      });
    }
  };

  const activeFiltersCount = [searchTerm, selectedCategory, selectedTag].filter(Boolean).length;

  // Update page title
  useEffect(() => {
    if (searchTerm) {
      document.title = `Search: "${searchTerm}" - Blog | Deskive`;
    } else {
      document.title = 'Search Blog - Deskive';
    }
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title={searchTerm ? `Search Results for "${searchTerm}" - Deskive Blog` : 'Search Blog - Deskive'}
        description={`Find articles, guides, and insights${searchTerm ? ` related to "${searchTerm}"` : ''}. Search our blog for productivity tips, collaboration guides, and more.`}
        keywords={['blog search', 'find articles', searchTerm || 'search', 'blog']}
        ogImage="/og-images/blog-search.png"
      />
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-6">
              <Search className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">
                Search Blog
              </h1>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search articles, topics, and more..."
                    className="pl-10 bg-white"
                  />
                </div>
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0.5">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Search Filters</h3>
                        {activeFiltersCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearFilters}
                            className="text-xs"
                          >
                            Clear all
                          </Button>
                        )}
                      </div>

                      {/* Category Filter */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Category</label>
                        <Select
                          value={selectedCategory}
                          onValueChange={setSelectedCategory}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.slug}>
                                {category.name} ({category.postCount})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tag Filter */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Tag</label>
                        <Select
                          value={selectedTag}
                          onValueChange={setSelectedTag}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All tags" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All tags</SelectItem>
                            {tags.slice(0, 20).map((tag) => (
                              <SelectItem key={tag.id} value={tag.slug}>
                                #{tag.name} ({tag.postCount})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button type="submit">Search</Button>
              </div>

              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Search: "{searchTerm}"
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSearchTerm('')}
                      />
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Category: {categories.find(c => c.slug === selectedCategory)?.name}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSelectedCategory('')}
                      />
                    </Badge>
                  )}
                  {selectedTag && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Tag: #{tags.find(t => t.slug === selectedTag)?.name}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSelectedTag('')}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">
                  {searchTerm ? `Search results for "${searchTerm}"` : 'Search Results'}
                </h2>
                {posts && (
                  <Badge variant="outline">
                    {posts.pagination.total} results
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

            {/* Search Results */}
            {loading ? (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts?.data.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {activeFiltersCount > 0
                      ? 'Try adjusting your search criteria or clearing some filters.'
                      : 'Try different keywords or browse our latest posts.'}
                  </p>
                  <div className="flex space-x-2">
                    {activeFiltersCount > 0 && (
                      <Button onClick={handleClearFilters} variant="outline">
                        Clear Filters
                      </Button>
                    )}
                    <Button asChild>
                      <Link to="/blog">Browse All Posts</Link>
                    </Button>
                  </div>
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
            <BlogSidebar onSearch={(term) => {
              setSearchTerm(term);
              setCurrentPage(1);
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};