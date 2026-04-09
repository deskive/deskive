/**
 * BlogSidebar Component
 * Sidebar component with popular posts, categories, tags, and newsletter signup
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Mail, TrendingUp, Folder, Tag as TagIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { BlogCard } from './BlogCard';
import { blogService, type PublicBlogPost, type PublicBlogCategory, type PublicBlogTag } from '@/lib/api/blog-api';

interface BlogSidebarProps {
  onSearch?: (searchTerm: string) => void;
  className?: string;
}

export const BlogSidebar: React.FC<BlogSidebarProps> = ({
  onSearch,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [email, setEmail] = useState('');
  const [popularPosts, setPopularPosts] = useState<PublicBlogPost[]>([]);
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);
  const [tags, setTags] = useState<PublicBlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const fetchSidebarData = async () => {
    try {
      const [popularPostsData, categoriesData, tagsData] = await Promise.all([
        blogService.getPopularPosts(5),
        blogService.getBlogCategories(),
        blogService.getBlogTags(),
      ]);

      setPopularPosts(popularPostsData);
      setCategories(categoriesData.slice(0, 8)); // Show top 8 categories
      setTags(tagsData.slice(0, 20)); // Show top 20 tags
    } catch (error) {
      console.error('Failed to fetch sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && onSearch) {
      onSearch(searchTerm.trim());
    }
  };

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubscribing(true);
      await blogService.subscribeToNewsletter(email);
      toast({
        title: 'Success!',
        description: 'You have been subscribed to our newsletter.',
      });
      setEmail('');
    } catch (error) {
      toast({
        title: 'Subscription Failed',
        description: 'There was an error subscribing to our newsletter. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search */}
      {onSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Search className="w-5 h-5 mr-2" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex space-x-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search posts..."
                className="flex-1"
              />
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Newsletter Signup */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Mail className="w-5 h-5 mr-2" />
            Newsletter
          </CardTitle>
          <CardDescription>
            Get the latest posts delivered directly to your inbox
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNewsletterSignup} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <Button
              type="submit"
              className="w-full"
              disabled={subscribing}
            >
              {subscribing ? <LoadingSpinner size="sm" /> : 'Subscribe'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Popular Posts */}
      {popularPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="w-5 h-5 mr-2" />
              Popular Posts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularPosts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                variant="compact"
                showAuthor={false}
                showStats={true}
                showExcerpt={false}
                showTags={false}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Folder className="w-5 h-5 mr-2" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/blog/category/${category.slug}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{category.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {category.postCount}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TagIcon className="w-5 h-5 mr-2" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag.id} to={`/blog/tag/${tag.slug}`}>
                  <Badge 
                    variant="outline" 
                    className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                    style={{ 
                      borderColor: tag.color || undefined,
                      color: tag.color || undefined 
                    }}
                  >
                    {tag.name} ({tag.postCount})
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archive or Recent Posts Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Looking for older posts?
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/blog/archive">
                Browse Archive
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};