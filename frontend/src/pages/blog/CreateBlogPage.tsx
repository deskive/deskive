import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  FileText,
  PenTool,
  FolderOpen,
  Tag,
  Image as ImageIcon,
} from 'lucide-react';

// Lazy load ReactQuill
const ReactQuill = lazy(() => import('react-quill-new'));
import 'react-quill-new/dist/quill.snow.css';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { useToast } from '../../hooks/use-toast';
import { PageSEO } from '../../components/seo';
import { BlogHeader } from '../../components/blog/BlogHeader';
import { useCreateBlogPost, useUpdateBlogPost, useBlogCategories, blogApi } from '../../lib/api/blog-api';
import { useQuery } from '@tanstack/react-query';

export const CreateBlogPage: React.FC = () => {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();
  const { toast } = useToast();
  const isEditMode = !!postId;

  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const { data: categories = [] } = useBlogCategories();

  // Fetch existing post if in edit mode
  const { data: existingPost } = useQuery({
    queryKey: ['blog-post-edit', postId],
    queryFn: () => blogApi.getBlogPostById(postId!),
    enabled: isEditMode && !!postId,
  });

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    excerpt: '',
    content: '',
    tags: '',
    metaTitle: '',
    metaDescription: '',
    isFeatured: false,
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Quill editor config
  const quillFormats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image',
    'align',
    'color', 'background',
    'blockquote', 'code-block',
  ], []);

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [{ 'align': [] }],
      ['clean']
    ],
  }), []);

  useEffect(() => {
    if (isEditMode && existingPost) {
      // Load existing post data for editing
      setFormData({
        title: existingPost.title,
        category: existingPost.categories?.[0]?.name || '',
        excerpt: existingPost.excerpt || '',
        content: existingPost.content,
        tags: existingPost.tags?.map(t => t.name).join(', ') || '',
        metaTitle: existingPost.seoMeta?.metaTitle || '',
        metaDescription: existingPost.seoMeta?.metaDescription || '',
        isFeatured: (existingPost as any).isFeatured || false,
      });

      // Load existing images
      if (existingPost.images && existingPost.images.length > 0) {
        setUploadedImageUrls(existingPost.images);
        setImagePreview(existingPost.images);
      } else if (existingPost.featuredImage) {
        setUploadedImageUrls([existingPost.featuredImage]);
        setImagePreview([existingPost.featuredImage]);
      }
    }
  }, [isEditMode, existingPost]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingImages(true);

    try {
      // Upload each image to storage
      for (const file of files) {
        // Create local preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);

        // Upload to server
        const result = await blogApi.uploadBlogImage(file);
        setUploadedImageUrls(prev => [...prev, result.url]);
        setSelectedImages(prev => [...prev, file]);
      }

      toast({ title: `${files.length} image(s) uploaded successfully` });
    } catch (error) {
      toast({ title: 'Failed to upload images', variant: 'destructive' });
      console.error('Upload error:', error);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleSubmit = async (publish = false) => {
    if (!formData.title || !formData.content) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsPublishing(true);

    try {
      const data = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        featuredImage: uploadedImageUrls[0] || undefined,
        images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
        seoMetaTitle: formData.metaTitle || undefined,
        seoMetaDescription: formData.metaDescription || undefined,
        isFeatured: formData.isFeatured,
        publish,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync({ postId: postId!, data });
        toast({ title: 'Post updated successfully' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: publish ? 'Post published successfully' : 'Post saved as draft' });
      }

      navigate('/admin/blog');
    } catch (error) {
      toast({ title: 'Failed to save post', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageSEO
        title={isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}
        description={isEditMode ? 'Update your blog post' : 'Create a new blog post and share with the community'}
      />

      {/* Public Header */}
      <BlogHeader />

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/blog')}
              className="text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PenTool className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium">
                  {isEditMode ? 'Edit Post' : 'New Post'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode ? 'Update your blog post' : 'Share your thoughts with the world'}
              </p>
            </div>
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
                    <FileText className="w-5 h-5 text-emerald-600" />
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
                      onClick={() => navigate('/admin/blog')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4" />
                      <span>My Posts</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors bg-emerald-50 text-emerald-700 font-medium"
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
                    <button
                      onClick={() => navigate('/blog')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
                    >
                      <Tag className="w-3 h-3" />
                      <span>All Categories</span>
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => navigate(`/blog?category=${cat.slug}`)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content - Editor Form */}
          <main className="flex-1 max-w-4xl">
            <Card className="border-gray-200">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="text-gray-900 font-medium mb-2 block">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter a compelling title"
                      className="border-gray-300 text-lg"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label htmlFor="category" className="text-gray-900 font-medium mb-2 block">
                      Category
                    </Label>
                    {!showNewCategoryInput ? (
                      <div className="space-y-2">
                        <Select value={formData.category} onValueChange={(value) => {
                          if (value === '__new__') {
                            setShowNewCategoryInput(true);
                          } else {
                            setFormData({ ...formData, category: value });
                          }
                        }}>
                          <SelectTrigger className="border-gray-300">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="__new__" className="text-emerald-600 font-medium">
                              + Add New Category
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter category name (e.g., Technology)"
                          className="border-gray-300"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter' && newCategoryName.trim()) {
                              e.preventDefault();
                              try {
                                await blogApi.createCategory(newCategoryName.trim());
                                setFormData({ ...formData, category: newCategoryName.trim() });
                                setNewCategoryName('');
                                setShowNewCategoryInput(false);
                                toast({ title: 'Category created', description: `"${newCategoryName.trim()}" has been added` });
                                // Refresh categories list
                                window.location.reload();
                              } catch (error: any) {
                                toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              }
                            }
                          }}
                        />
                        <Button
                          onClick={async () => {
                            if (newCategoryName.trim()) {
                              try {
                                await blogApi.createCategory(newCategoryName.trim());
                                setFormData({ ...formData, category: newCategoryName.trim() });
                                setNewCategoryName('');
                                setShowNewCategoryInput(false);
                                toast({ title: 'Category created', description: `"${newCategoryName.trim()}" has been added` });
                                window.location.reload();
                              } catch (error: any) {
                                toast({ title: 'Error', description: error.message, variant: 'destructive' });
                              }
                            }
                          }}
                          variant="default"
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Add
                        </Button>
                        <Button
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Excerpt */}
                  <div>
                    <Label htmlFor="excerpt" className="text-gray-900 font-medium mb-2 block">
                      Excerpt (optional)
                    </Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="A brief summary of your post (shown in previews)"
                      rows={3}
                      className="border-gray-300"
                    />
                  </div>

                  {/* Content Editor */}
                  <div>
                    <Label htmlFor="content" className="text-gray-900 font-medium mb-2 block">
                      Content <span className="text-red-500">*</span>
                    </Label>

                    <Suspense fallback={
                      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-96 flex items-center justify-center">
                        <div className="text-gray-500">Loading editor...</div>
                      </div>
                    }>
                      <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={(content) => setFormData({ ...formData, content })}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Write your blog post content here..."
                        className="bg-white"
                        style={{ height: '400px', marginBottom: '50px' }}
                      />
                    </Suspense>
                  </div>

                  {/* Tags */}
                  <div>
                    <Label htmlFor="tags" className="text-gray-900 font-medium mb-2 block">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="marketing, social-media, tips (comma separated)"
                      className="border-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                  </div>

                  {/* Featured Post Option */}
                  <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Checkbox
                      id="featured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked as boolean })}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="featured"
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        Mark as Featured Post
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Featured posts will be displayed on the homepage
                      </p>
                    </div>
                  </div>

                  {/* Images Upload */}
                  <div>
                    <Label className="text-gray-900 font-medium mb-2 block">Images</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-emerald-400 transition-colors cursor-pointer bg-gray-50">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={isUploadingImages}
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {isUploadingImages ? (
                          <>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                            <p className="text-gray-600">Uploading images...</p>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 mb-1">Click to upload images</p>
                            <p className="text-sm text-gray-500">First image will be used as featured image</p>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Image Previews */}
                    {imagePreview.length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        {imagePreview.map((preview, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <img src={preview} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                            {idx === 0 && (
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-emerald-500 text-white text-xs">Featured</Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SEO Settings */}
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO Settings (optional)</h3>

                    <div className="space-y-4">
                      {/* Meta Title */}
                      <div>
                        <Label htmlFor="metaTitle" className="text-gray-900 font-medium mb-2 block">
                          Meta Title
                        </Label>
                        <Input
                          id="metaTitle"
                          value={formData.metaTitle}
                          onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                          placeholder="Custom title for search engines"
                          className="border-gray-300"
                        />
                      </div>

                      {/* Meta Description */}
                      <div>
                        <Label htmlFor="metaDescription" className="text-gray-900 font-medium mb-2 block">
                          Meta Description
                        </Label>
                        <Textarea
                          id="metaDescription"
                          value={formData.metaDescription}
                          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                          placeholder="Description for search engine results"
                          rows={3}
                          className="border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/admin/blog')}
                      className="border-gray-300"
                      disabled={isPublishing}
                    >
                      Cancel
                    </Button>
                    {!isEditMode && (
                      <Button
                        variant="outline"
                        onClick={() => handleSubmit(false)}
                        disabled={isPublishing}
                        className="border-gray-300"
                      >
                        Save Draft
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSubmit(true)}
                      disabled={isPublishing}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                    >
                      {isPublishing ? 'Saving...' : (isEditMode ? 'Update Post' : 'Publish Post')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
};
