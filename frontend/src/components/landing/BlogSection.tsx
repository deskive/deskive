/**
 * BlogSection Component
 * Displays featured blog posts on the homepage
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { BookOpen, ArrowRight, Calendar, MessageSquare, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { useFeaturedPosts } from '../../lib/api/blog-api';

const BlogSection: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const { data: featuredPosts = [], isLoading } = useFeaturedPosts(3);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <section id="blog" className="py-20 md:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-purple-100 text-purple-600 px-4 py-2 rounded-full font-semibold text-sm mb-6"
          >
            <BookOpen className="w-4 h-4" />
            <span>{intl.formatMessage({ id: 'blog.section.title', defaultMessage: 'Our Blog' })}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6"
          >
            {intl.formatMessage({ id: 'blog.section.latest', defaultMessage: 'Latest' })}{' '}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'blog.section.insights', defaultMessage: 'Insights' })}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {intl.formatMessage({ id: 'blog.section.subtitle', defaultMessage: 'Discover productivity tips, collaboration guides, and workplace insights from our team' })}
          </motion.p>
        </div>

        {/* Blog Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : featuredPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-12">
            {featuredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Link to={`/blog/${post.slug}`} className="block h-full">
                <Card className="overflow-hidden h-full hover:shadow-2xl transition-all duration-300 group cursor-pointer border-0 bg-white">
                  {/* Featured Image */}
                <div className="relative h-48 overflow-hidden bg-gray-200">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-purple-600 text-white border-0">
                      {post.readTime} min read
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col h-[calc(100%-12rem)]">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="outline" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                    {post.excerpt}
                  </p>

                  {/* Author & Meta */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.author.avatar}
                        alt={post.author.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">{post.author.name}</p>
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(post.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{post.commentCount || 0}</span>
                    </div>
                    {post.ratingAverage > 0 && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>{Number(post.ratingAverage).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
              </Link>
            </motion.div>
          ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{intl.formatMessage({ id: 'blog.section.noPosts', defaultMessage: 'No Blog Posts Yet' })}</h3>
            <p className="text-gray-600 mb-6">{intl.formatMessage({ id: 'blog.section.noPostsDesc', defaultMessage: 'Check back soon for insights and updates from our team' })}</p>
          </div>
        )}

        {/* View All Button */}
        {featuredPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Button
              onClick={() => navigate('/blog')}
              size="lg"
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold border-0"
            >
              {intl.formatMessage({ id: 'blog.section.viewAll', defaultMessage: 'View All Posts' })}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
