/**
 * Blog Editor Component
 * Rich text editor for creating and editing blog posts
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  Globe,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useToast } from '../../../hooks/use-toast';
import { adminService } from '@/lib/api/admin-api';
import type {
  CreateBlogPostData,
  UpdateBlogPostData,
  BlogCategory,
  BlogTag,
} from '@/lib/api/admin-api';

// Simple rich text editor toolbar
interface ToolbarProps {
  onCommand: (command: string, value?: string) => void;
  onImageUpload: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onCommand, onImageUpload }) => {
  const toolbarButtons = [
    { command: 'undo', icon: Undo, label: 'Undo' },
    { command: 'redo', icon: Redo, label: 'Redo' },
    { type: 'separator' },
    { command: 'bold', icon: Bold, label: 'Bold' },
    { command: 'italic', icon: Italic, label: 'Italic' },
    { command: 'underline', icon: Underline, label: 'Underline' },
    { type: 'separator' },
    { command: 'formatBlock', icon: Heading1, label: 'Heading 1', value: 'h1' },
    { command: 'formatBlock', icon: Heading2, label: 'Heading 2', value: 'h2' },
    { command: 'formatBlock', icon: Heading3, label: 'Heading 3', value: 'h3' },
    { type: 'separator' },
    { command: 'justifyLeft', icon: AlignLeft, label: 'Align Left' },
    { command: 'justifyCenter', icon: AlignCenter, label: 'Align Center' },
    { command: 'justifyRight', icon: AlignRight, label: 'Align Right' },
    { type: 'separator' },
    { command: 'insertUnorderedList', icon: List, label: 'Bullet List' },
    { command: 'insertOrderedList', icon: ListOrdered, label: 'Numbered List' },
    { command: 'indent', icon: Quote, label: 'Indent' },
    { type: 'separator' },
    { command: 'createLink', icon: Link, label: 'Insert Link' },
    { command: 'insertImage', icon: ImageIcon, label: 'Insert Image', onClick: onImageUpload },
    { command: 'formatBlock', icon: Code, label: 'Code Block', value: 'pre' },
  ];

  const handleCommand = (button: typeof toolbarButtons[0]) => {
    // Type guard to check if button is not a separator
    if (!('command' in button) || button.command === undefined) {
      return;
    }
    
    // Now TypeScript definitely knows button.command is a string
    if ('onClick' in button && button.onClick) {
      button.onClick();
    } else if (button.command === 'createLink') {
      const url = prompt('Enter URL:');
      if (url) {
        onCommand(button.command, url);
      }
    } else {
      const value = 'value' in button ? button.value : undefined;
      onCommand(button.command, value);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b">
      {toolbarButtons.map((button, index) => {
        if (button.type === 'separator') {
          return <div key={index} className="w-px h-6 bg-gray-300 mx-1" />;
        }

        const Icon = button.icon!;
        return (
          <Button
            key={button.command + ('value' in button ? button.value || '' : '')}
            variant="ghost"
            size="sm"
            onClick={() => handleCommand(button)}
            title={button.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
};

// Rich text editor component
interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ content, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = () => {
    setShowImageDialog(true);
  };

  const insertImage = () => {
    if (imageUrl) {
      handleCommand('insertImage', imageUrl);
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const response = await adminService.uploadFile(file);
      setImageUrl(response.url);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-md">
      <Toolbar onCommand={handleCommand} onImageUpload={handleImageUpload} />
      <div
        ref={editorRef}
        contentEditable
        onInput={handleContentChange}
        onBlur={handleContentChange}
        className="min-h-96 p-4 prose prose-sm max-w-none focus:outline-none"
        style={{ minHeight: '400px' }}
        data-placeholder={placeholder}
      />

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Upload an image or enter an image URL
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-file">Upload Image</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="flex items-center mt-2">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="image-url">Or enter URL</Label>
              <Input
                id="image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancel
            </Button>
            <Button onClick={insertImage} disabled={!imageUrl}>
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Tag selector component
interface TagSelectorProps {
  availableTags: BlogTag[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  onCreateTag: (name: string) => Promise<BlogTag>;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTags,
  onChange,
  onCreateTag,
}) => {
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim()) return;

    const existingTag = availableTags.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) {
        onChange([...selectedTags, existingTag.id]);
      }
    } else {
      try {
        setCreating(true);
        const newTagObj = await onCreateTag(tagName);
        onChange([...selectedTags, newTagObj.id]);
      } catch (error) {
        // Error is handled by the parent component
      } finally {
        setCreating(false);
      }
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  const getTagName = (tagId: string) => {
    return availableTags.find((tag) => tag.id === tagId)?.name || '';
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add tag..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag(newTag);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => handleAddTag(newTag)}
          disabled={!newTag.trim() || creating}
        >
          {creating ? <LoadingSpinner size="sm" /> : 'Add'}
        </Button>
      </div>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tagId) => (
            <Badge key={tagId} variant="secondary" className="flex items-center gap-1">
              {getTagName(tagId)}
              <button
                type="button"
                onClick={() => handleRemoveTag(tagId)}
                className="ml-1 hover:bg-red-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const BlogEditor: React.FC = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!postId;

  // Form state
  const [formData, setFormData] = useState<CreateBlogPostData>({
    title: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
    tags: [],
    categories: [],
    seoMeta: {
      metaTitle: '',
      metaDescription: '',
      keywords: [],
    },
  });

  // UI state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategoriesAndTags();
    if (isEditing) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const post = await adminService.getBlogPost(postId!);
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        status: post.status,
        tags: post.tags || [],
        categories: post.categories?.map((cat) => cat.id) || [],
        publishedAt: post.publishedAt,
        scheduledAt: post.scheduledAt,
        seoMeta: post.seoMeta || {
          metaTitle: '',
          metaDescription: '',
          keywords: [],
        },
      });
      setFeaturedImage(post.featuredImage || '');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch blog post',
        variant: 'destructive',
      });
      navigate('/admin/blog');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndTags = async () => {
    try {
      const [categoriesData, tagsData] = await Promise.all([
        adminService.getBlogCategories(),
        adminService.getBlogTags(),
      ]);
      setCategories(categoriesData);
      setTags(tagsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch categories and tags',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async (status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED') => {
    try {
      setSaving(true);
      
      const baseData = {
        ...formData,
        status: status || formData.status,
        featuredImage: featuredImage || undefined,
      };

      if (isEditing) {
        const updateData: UpdateBlogPostData = baseData;
        await adminService.updateBlogPost(postId!, updateData);
        toast({
          title: 'Success',
          description: 'Blog post updated successfully',
        });
      } else {
        const createData: CreateBlogPostData = baseData;
        const newPost = await adminService.createBlogPost(createData);
        toast({
          title: 'Success',
          description: 'Blog post created successfully',
        });
        navigate(`/admin/blog/edit/${newPost.id}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} blog post`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingImage(true);
      const response = await adminService.uploadFile(file);
      setFeaturedImage(response.url);
      toast({
        title: 'Success',
        description: 'Featured image uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload featured image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateTag = async (name: string): Promise<BlogTag> => {
    try {
      const newTag = await adminService.createBlogTag(name);
      setTags([...tags, newTag]);
      toast({
        title: 'Success',
        description: `Tag "${name}" created successfully`,
      });
      return newTag;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create tag',
        variant: 'destructive',
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update your blog post content and settings' : 'Write and publish a new blog post'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/blog')}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('DRAFT')}
            disabled={saving}
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave('PUBLISHED')} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <Globe className="mr-2 h-4 w-4" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                Write your blog post content using the rich text editor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter blog post title..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief description of the post..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Content *</Label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="Start writing your blog post..."
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Optimize your post for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.seoMeta?.metaTitle || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seoMeta: {
                        ...formData.seoMeta,
                        metaTitle: e.target.value,
                      },
                    })
                  }
                  placeholder="SEO title for search engines..."
                />
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.seoMeta?.metaDescription || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seoMeta: {
                        ...formData.seoMeta,
                        metaDescription: e.target.value,
                      },
                    })
                  }
                  placeholder="SEO description for search engines..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
              <CardDescription>
                Control when and how your post is published
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.status === 'SCHEDULED' && (
                <div>
                  <Label htmlFor="scheduledAt">Scheduled Date</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledAt: e.target.value })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
              <CardDescription>
                Upload an image to represent your post
              </CardDescription>
            </CardHeader>
            <CardContent>
              {featuredImage ? (
                <div className="space-y-3">
                  <img
                    src={featuredImage}
                    alt="Featured"
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeaturedImage('')}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div className="flex items-center mt-2">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Uploading...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Organize your post into categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.categories?.[0] || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, categories: value ? [value] : [] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Add tags to help categorize your post
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagSelector
                availableTags={tags}
                selectedTags={formData.tags || []}
                onChange={(tags) => setFormData({ ...formData, tags })}
                onCreateTag={handleCreateTag}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;