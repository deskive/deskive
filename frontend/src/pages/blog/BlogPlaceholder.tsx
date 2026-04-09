/**
 * Blog Placeholder Page
 * Temporary page to show blog UI structure without API calls
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Code, Server } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export const BlogPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Deskive Blog
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Coming Soon - Public Blog Platform
            </p>
            <Badge variant="outline" className="px-4 py-2">
              UI Ready • Backend Integration Pending
            </Badge>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Code className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Frontend Complete</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ Blog list page with grid/list views</li>
                      <li>✅ Blog post detail page</li>
                      <li>✅ Comment section & ratings</li>
                      <li>✅ Category & tag filtering</li>
                      <li>✅ Search functionality</li>
                      <li>✅ Responsive design</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Server className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Backend Todo</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>⏳ Database schema setup</li>
                      <li>⏳ Blog CRUD APIs</li>
                      <li>⏳ Comment system APIs</li>
                      <li>⏳ Rating system APIs</li>
                      <li>⏳ Image upload handling</li>
                      <li>⏳ Global roles (blogger)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Preview */}
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6">Planned Features</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">📝 Rich Content</h4>
                  <p className="text-sm text-gray-600">
                    Create engaging blog posts with rich text, images, code blocks, and more.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🏷️ Organization</h4>
                  <p className="text-sm text-gray-600">
                    Organize posts with categories, tags, and featured content.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">💬 Engagement</h4>
                  <p className="text-sm text-gray-600">
                    Comments, ratings, likes, and social sharing capabilities.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🔍 Discovery</h4>
                  <p className="text-sm text-gray-600">
                    Full-text search, filtering, and sorting options.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">📊 Analytics</h4>
                  <p className="text-sm text-gray-600">
                    View counts, popular posts, and engagement metrics.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🌐 SEO Ready</h4>
                  <p className="text-sm text-gray-600">
                    Optimized for search engines with meta tags and sitemaps.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center mt-12">
            <Link to="/">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
