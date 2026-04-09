import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Edit,
  Trash2,
  Plus,
  BookOpen,
  FileText,
  Tag,
  LayoutDashboard,
  PenTool,
  FolderOpen,
  MessageCircle,
  Star
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { useToast } from '../../../hooks/use-toast';
import { PageSEO } from '../../../components/seo';
import { useMyBlogPosts, useDeleteBlogPost, useBlogCategories } from '../../../lib/api/blog-api';

export default function BlogManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNav, setSelectedNav] = useState<'all' | 'my' | 'create'>('my');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Fetch my posts from API
  const { data: apiPosts, isLoading } = useMyBlogPosts();
  const { data: categories = [] } = useBlogCategories();
  const deleteMutation = useDeleteBlogPost();

  const posts = apiPosts || [];
  const categoryList = ['All Categories', ...categories.map(c => c.name)];

  const handleDeleteClick = (postId: string, postTitle: string) => {
    setDeleteConfirm({ id: postId, title: postTitle });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      toast({ title: 'Post deleted successfully' });
      setDeleteConfirm(null);
    } catch (error) {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    }
  };

  const filteredPosts = posts.filter((post: any) => {
    const matchesSearch = searchTerm === '' ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (post.excerpt || '').toLowerCase().includes(searchTerm.toLowerCase());

    const postCategoryNames = post.categories?.map((c: any) => c.name) || [];
    const matchesCategory = selectedCategory === 'All Categories' || postCategoryNames.includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <PageSEO
        title="My Blog Posts - Admin"
        description="Manage your blog posts and content"
      />

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/blog')}
                className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer"
              >
                <BookOpen className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Blog Posts</h1>
                <p className="text-gray-600">Manage your blog content</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/blog/create')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Post
            </Button>
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search articles..."
                      className="pl-10 border-gray-300"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Navigation</h3>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => navigate('/blog')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>All Posts</span>
                    </button>
                    <button
                      onClick={() => setSelectedNav('my')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedNav === 'my'
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>My Posts</span>
                    </button>
                    <button
                      onClick={() => navigate('/blog/create')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedNav === 'create'
                          ? 'bg-emerald-50 text-emerald-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Create Post</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Categories */}
              <Card className="border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Categories</h3>
                  </div>
                  <div className="space-y-1">
                    {categoryList.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          selectedCategory === category
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{category}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Share Your Ideas */}
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Share Your Ideas</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create a new blog post and share with the community
                  </p>
                  <Button
                    onClick={() => navigate('/blog/create')}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Post
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content - Post List */}
          <main className="flex-1">
            {filteredPosts.length === 0 ? (
              <Card className="border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm ? `No posts match "${searchTerm}"` : 'Start creating your first blog post'}
                  </p>
                  <Button
                    onClick={() => navigate('/blog/create')}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="group overflow-hidden hover:shadow-md transition-all duration-200 border-gray-200"
                  >
                    <CardContent className="p-0">
                      <div className="flex gap-0">
                        {/* Featured Image */}
                        <div className="w-48 h-40 flex-shrink-0 bg-gray-100 relative overflow-hidden">
                          {post.featuredImage ? (
                            <img
                              src={post.featuredImage}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100">
                              <BookOpen className="w-12 h-12 text-emerald-600/30" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              {/* Category Badge */}
                              {post.categories?.[0] && (
                                <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 mb-2">
                                  {post.categories[0].name}
                                </Badge>
                              )}

                              {/* Title */}
                              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                                {post.title}
                              </h3>

                              {/* Excerpt */}
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {post.excerpt || 'No excerpt'}
                              </p>

                              {/* Meta Info */}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.commentCount || 0} comments</span>
                                </div>
                                {post.ratingAverage > 0 && (
                                  <div className="flex items-center gap-1 text-amber-500">
                                    <Star className="w-4 h-4 fill-amber-500" />
                                    <span className="font-medium">{Number(post.ratingAverage).toFixed(1)}</span>
                                    <span className="text-xs text-gray-400">({post.ratingCount})</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <span>
                                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/blog/edit/${post.id}`)}
                                className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(post.id, post.title)}
                                className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Blog Post</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-medium">"{deleteConfirm.title}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Post'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
