import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Clock, MessageCircle, Star, Plus, BookOpen, TrendingUp, Flame, Sparkles, Grid3X3 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { PageSEO } from '../../components/seo';
import { useToast } from '../../hooks/use-toast';
import { type PublicBlogPost, type PaginatedResponse, useBlogPosts, useBlogCategories } from '@/lib/api/blog-api';
import { useAuth } from '@/contexts/AuthContext';
import { BlogHeader } from '../../components/blog/BlogHeader';
import { useIntl } from 'react-intl';

export const BlogListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const intl = useIntl();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'latest' | 'popular' | 'featured' | 'all'>('latest');
  const [selectedCategory, setSelectedCategory] = useState(intl.formatMessage({ id: 'admin.blog.allCategories', defaultMessage: 'All Categories' }));

  // Check if user is admin (global role)
  const isAdmin = user?.role === 'admin';

  // Fetch posts from API
  const { data: postsData, isLoading } = useBlogPosts({ page: 1, limit: 12, search: searchTerm });
  const { data: categories = [] } = useBlogCategories();

  // Helper to translate category names
  const translateCategory = (categoryName: string): string => {
    const key = `admin.blog.category.${categoryName.toLowerCase().replace(/\s+/g, '')}`;
    return intl.formatMessage({ id: key, defaultMessage: categoryName });
  };

  let posts = postsData?.data || [];
  const loading = isLoading;
  const allCategoriesText = intl.formatMessage({ id: 'admin.blog.allCategories', defaultMessage: 'All Categories' });
  const categoryList = [allCategoriesText, ...categories.map(c => translateCategory(c.name))];

  // Apply filters
  posts = posts.filter((post: any) => {
    const postCategoryNames = post.categories?.map((c: any) => translateCategory(c.name)) || [];
    const matchesCategory = selectedCategory === allCategoriesText || postCategoryNames.includes(selectedCategory);
    return matchesCategory;
  });

  // Apply sorting based on filter
  posts = [...posts].sort((a: any, b: any) => {
    if (selectedFilter === 'latest') {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    if (selectedFilter === 'popular') {
      return (b.ratingAverage || 0) - (a.ratingAverage || 0);
    }
    if (selectedFilter === 'featured') {
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    }
    return 0;
  });

  // Filter only featured if that's selected
  if (selectedFilter === 'featured') {
    posts = posts.filter((post: any) => post.isFeatured);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageSEO
        title="Blog - Deskive Insights & Updates"
        description="Read the latest insights, tips, and updates from the Deskive team"
      />

      {/* Public Header */}
      <BlogHeader />

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {intl.formatMessage({ id: 'admin.blog.title', defaultMessage: 'Blog' })}
                </h1>
                <p className="text-gray-600">
                  {intl.formatMessage({ id: 'admin.blog.subtitle', defaultMessage: 'Insights on social media marketing & growth' })}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={() => navigate('/blog/create')}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'admin.blog.newPost', defaultMessage: 'New Post' })}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <aside className="w-80 flex-shrink-0">
            <div className="space-y-6 sticky top-24">
              {/* Search */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={intl.formatMessage({ id: 'admin.blog.searchPlaceholder', defaultMessage: 'Search articles...' })}
                        className="pl-10 border-gray-300"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Browse */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.blog.browse', defaultMessage: 'Browse' })}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedFilter('latest')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedFilter === 'latest'
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>{intl.formatMessage({ id: 'admin.blog.filter.latest', defaultMessage: 'Latest' })}</span>
                    </button>
                    <button
                      onClick={() => setSelectedFilter('popular')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedFilter === 'popular'
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>{intl.formatMessage({ id: 'admin.blog.filter.popular', defaultMessage: 'Popular' })}</span>
                    </button>
                    <button
                      onClick={() => setSelectedFilter('featured')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedFilter === 'featured'
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{intl.formatMessage({ id: 'admin.blog.filter.featured', defaultMessage: 'Featured' })}</span>
                    </button>
                    <button
                      onClick={() => setSelectedFilter('all')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedFilter === 'all'
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                      <span>{intl.formatMessage({ id: 'admin.blog.filter.allPosts', defaultMessage: 'All Posts' })}</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin/blog')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>{intl.formatMessage({ id: 'admin.blog.myPosts', defaultMessage: 'My Posts' })}</span>
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Categories */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'admin.blog.categoriesTitle', defaultMessage: 'Categories' })}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedCategory(allCategoriesText)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedCategory === allCategoriesText
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{allCategoriesText}</span>
                    </button>
                    {categoryList.slice(1).map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          selectedCategory === category
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{category}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse border-gray-200">
                    <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {intl.formatMessage({ id: 'admin.blog.noPostsFound', defaultMessage: 'No posts found' })}
                  </h3>
                  <p className="text-gray-600">
                    {intl.formatMessage({ id: 'admin.blog.noPostsFoundDesc', defaultMessage: 'Try adjusting your filters or search terms' })}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="group overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {/* Featured Image */}
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {post.featuredImage ? (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                          <BookOpen className="w-16 h-16 text-emerald-600/30" />
                        </div>
                      )}
                      {/* Category Badge */}
                      {post.categories?.[0] && (
                        <Badge className="absolute top-4 left-4 bg-emerald-500 text-white border-0 hover:bg-emerald-600">
                          {post.categories[0].name}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-6">
                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {post.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>
                            {post.commentCount || 0} {post.commentCount === 1
                              ? intl.formatMessage({ id: 'admin.blog.comment', defaultMessage: 'comment' })
                              : intl.formatMessage({ id: 'admin.blog.comments', defaultMessage: 'comments' })}
                          </span>
                        </div>
                        {post.ratingAverage > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-4 h-4 fill-amber-500" />
                            <span className="font-medium">{Number(post.ratingAverage).toFixed(1)}</span>
                            <span className="text-xs text-gray-400">({post.ratingCount})</span>
                          </div>
                        )}
                      </div>

                      {/* Author & Date */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold">
                            {post.author?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{post.author?.name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State - No posts */}
            {!loading && posts.length === 0 && (
              <Card className="border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {intl.formatMessage({ id: 'admin.blog.noBlogPostsYet', defaultMessage: 'No blog posts yet' })}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {intl.formatMessage({ id: 'admin.blog.beTheFirst', defaultMessage: 'Be the first to share your insights' })}
                  </p>
                  {isAdmin && (
                    <Button
                      onClick={() => navigate('/blog/create')}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {intl.formatMessage({ id: 'admin.blog.createFirstPost', defaultMessage: 'Create First Post' })}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
