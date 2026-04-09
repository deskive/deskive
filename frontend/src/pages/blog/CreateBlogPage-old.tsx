/**
 * CreateBlogPage Component
 * Page for creating and editing blog posts with rich text editor
 */

import { useState, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  Image as ImageIcon,
  Tag,
  FolderOpen,
  Loader2,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { useToast } from '../../hooks/use-toast';
import { PageSEO } from '../../components/seo';

// Lazy load the Quill editor
const ReactQuill = lazy(() => import('react-quill-new'));
import 'react-quill-new/dist/quill.snow.css';

// Quill modules configuration
const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
};

const formats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'script',
  'list',
  'bullet',
  'indent',
  'align',
  'blockquote',
  'code-block',
  'link',
  'image',
  'video',
];

// Mock categories (will be replaced with API)
const MOCK_CATEGORIES = [
  { id: '1', name: 'Productivity', slug: 'productivity' },
  { id: '2', name: 'Work From Home', slug: 'work-from-home' },
  { id: '3', name: 'Management', slug: 'management' },
  { id: '4', name: 'Technology', slug: 'technology' },
  { id: '5', name: 'Collaboration', slug: 'collaboration' },
];

export const CreateBlogPage: React.FC = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { toast } = useToast();
  const quillRef = useRef<any>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState<string>('');
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image size should be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setFeaturedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFeaturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // TODO: API call to save draft
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Draft saved',
        description: 'Your blog post has been saved as a draft',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your blog post',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please enter content for your blog post',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);
    try {
      // TODO: API call to publish post
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Post published',
        description: 'Your blog post has been published successfully',
      });
      navigate('/blog');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to publish post',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePreview = () => {
    // TODO: Open preview modal or navigate to preview page
    toast({
      title: 'Preview',
      description: 'Preview functionality coming soon',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageSEO
        title={postId ? 'Edit Blog Post' : 'Create Blog Post'}
        description="Create and publish blog posts"
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/blog')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                {postId ? 'Edit Post' : 'Create New Post'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePreview} className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Editor Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <Card className="p-6">
              <Label htmlFor="title" className="text-base font-semibold mb-2">
                Post Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title..."
                className="text-xl font-semibold border-0 px-0 focus-visible:ring-0"
              />
            </Card>

            {/* Featured Image */}
            <Card className="p-6">
              <Label className="text-base font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Featured Image
              </Label>
              {featuredImage ? (
                <div className="relative">
                  <img
                    src={featuredImage}
                    alt="Featured"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setFeaturedImage('');
                      setFeaturedImageFile(null);
                    }}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload featured image</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </Card>

            {/* Excerpt */}
            <Card className="p-6">
              <Label htmlFor="excerpt" className="text-base font-semibold mb-2">
                Excerpt
              </Label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Write a brief summary (will be shown in blog list)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </Card>

            {/* Content Editor */}
            <Card className="p-6">
              <Label className="text-base font-semibold mb-4">Content</Label>
              <Suspense
                fallback={
                  <div className="h-96 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                }
              >
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  placeholder="Start writing your blog post..."
                  className="h-96"
                />
              </Suspense>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Categories */}
            <Card className="p-6">
              <Label className="text-base font-semibold mb-4 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Categories
              </Label>
              <div className="space-y-2">
                {MOCK_CATEGORIES.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Tags */}
            <Card className="p-6">
              <Label className="text-base font-semibold mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  className="flex-1"
                />
                <Button onClick={handleAddTag} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-gray-300"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </Card>

            {/* Publishing Info */}
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
              <h3 className="font-semibold text-gray-900 mb-3">Publishing Tips</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Use a compelling title (60-70 characters)</li>
                <li>✓ Add a featured image (1200x630px recommended)</li>
                <li>✓ Write a brief excerpt (150-160 characters)</li>
                <li>✓ Select relevant categories</li>
                <li>✓ Add 3-5 relevant tags</li>
                <li>✓ Use headers to structure content</li>
                <li>✓ Include images and links</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
