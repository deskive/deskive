/**
 * ChangelogPage Component
 * Product changelog showing updates, new features, and improvements
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Zap, 
  Plus, 
  Bug, 
  Calendar,
  Star,
  ArrowRight,
  Bell,
  Filter,
  CheckCircle,
  Sparkles,
  Shield,
  Rocket,
  Heart,
  Users,
  TrendingUp,
  Mail
} from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  changes: ChangelogChange[];
  featured: boolean;
}

interface ChangelogChange {
  id: string;
  type: 'new' | 'improved' | 'fixed' | 'security';
  title: string;
  description: string;
}

const changelogEntries: ChangelogEntry[] = [
  {
    id: 'v2.8.0',
    version: '2.8.0',
    date: 'March 22, 2024',
    title: 'AI-Powered Smart Suggestions',
    description: 'Introducing intelligent task suggestions and automated workflow recommendations powered by AI.',
    featured: true,
    changes: [
      {
        id: 'ai-suggestions',
        type: 'new',
        title: 'AI Smart Suggestions',
        description: 'Get intelligent task suggestions based on your team\'s work patterns and project history.'
      },
      {
        id: 'workflow-automation',
        type: 'new',
        title: 'Automated Workflow Templates',
        description: 'AI generates custom workflow templates based on your team\'s processes and industry best practices.'
      },
      {
        id: 'enhanced-search',
        type: 'improved',
        title: 'Enhanced Search with AI',
        description: 'Search now understands context and provides more relevant results across all your content.'
      },
      {
        id: 'performance-boost',
        type: 'improved',
        title: 'Performance Optimization',
        description: 'Improved app loading speed by 40% and reduced memory usage across all platforms.'
      }
    ]
  },
  {
    id: 'v2.7.5',
    version: '2.7.5',
    date: 'March 15, 2024',
    title: 'Enhanced Security & Compliance',
    description: 'Major security improvements and new compliance features for enterprise customers.',
    featured: false,
    changes: [
      {
        id: 'sso-enhancement',
        type: 'improved',
        title: 'Enhanced SSO Integration',
        description: 'Improved single sign-on experience with support for more identity providers.'
      },
      {
        id: 'audit-logs',
        type: 'new',
        title: 'Advanced Audit Logs',
        description: 'Comprehensive audit logging for all user actions and system events.'
      },
      {
        id: 'security-patch',
        type: 'security',
        title: 'Security Patches',
        description: 'Updated dependencies and patched potential security vulnerabilities.'
      },
      {
        id: 'notification-bug',
        type: 'fixed',
        title: 'Notification Delivery',
        description: 'Fixed issue where some push notifications weren\'t being delivered to mobile apps.'
      }
    ]
  },
  {
    id: 'v2.7.0',
    version: '2.7.0',
    date: 'March 8, 2024',
    title: 'Advanced Video Conferencing',
    description: 'New video features including screen sharing improvements and meeting recordings.',
    featured: true,
    changes: [
      {
        id: 'meeting-recordings',
        type: 'new',
        title: 'Meeting Recordings',
        description: 'Record video calls and automatically generate meeting transcripts and summaries.'
      },
      {
        id: 'screen-sharing',
        type: 'improved',
        title: 'Enhanced Screen Sharing',
        description: 'Better quality screen sharing with support for multiple monitors and application sharing.'
      },
      {
        id: 'virtual-backgrounds',
        type: 'new',
        title: 'Virtual Backgrounds',
        description: 'Customize your video calls with professional virtual backgrounds and blur effects.'
      },
      {
        id: 'audio-quality',
        type: 'improved',
        title: 'Audio Quality Enhancement',
        description: 'Improved noise cancellation and echo reduction for clearer audio calls.'
      }
    ]
  },
  {
    id: 'v2.6.8',
    version: '2.6.8',
    date: 'February 28, 2024',
    title: 'Mobile App Improvements',
    description: 'Significant updates to mobile apps with new features and performance improvements.',
    featured: false,
    changes: [
      {
        id: 'offline-mode',
        type: 'new',
        title: 'Offline Mode',
        description: 'Access and edit your content even when you\'re offline. Changes sync when connection returns.'
      },
      {
        id: 'mobile-ui',
        type: 'improved',
        title: 'Redesigned Mobile Interface',
        description: 'Cleaner, more intuitive mobile interface with improved navigation and touch interactions.'
      },
      {
        id: 'push-notifications',
        type: 'improved',
        title: 'Smart Push Notifications',
        description: 'More intelligent notification grouping and filtering to reduce notification fatigue.'
      },
      {
        id: 'sync-bug',
        type: 'fixed',
        title: 'File Sync Issues',
        description: 'Resolved synchronization problems that occasionally occurred with large file uploads.'
      }
    ]
  },
  {
    id: 'v2.6.5',
    version: '2.6.5',
    date: 'February 20, 2024',
    title: 'Integration Marketplace',
    description: 'Launch of the Deskive Integration Marketplace with 50+ new integrations.',
    featured: true,
    changes: [
      {
        id: 'integration-marketplace',
        type: 'new',
        title: 'Integration Marketplace',
        description: 'Discover and install integrations from our new marketplace with one-click setup.'
      },
      {
        id: 'custom-integrations',
        type: 'new',
        title: 'Custom Integration Builder',
        description: 'Build custom integrations using our visual workflow builder - no coding required.'
      },
      {
        id: 'api-improvements',
        type: 'improved',
        title: 'Enhanced API',
        description: 'New API endpoints and improved documentation for better third-party integrations.'
      },
      {
        id: 'webhook-reliability',
        type: 'improved',
        title: 'Webhook Reliability',
        description: 'Improved webhook delivery with retry mechanisms and better error handling.'
      }
    ]
  },
  {
    id: 'v2.6.0',
    version: '2.6.0',
    date: 'February 12, 2024',
    title: 'Advanced Analytics Dashboard',
    description: 'New analytics and reporting features to help teams track productivity and performance.',
    featured: false,
    changes: [
      {
        id: 'analytics-dashboard',
        type: 'new',
        title: 'Team Analytics Dashboard',
        description: 'Comprehensive analytics showing team productivity, project progress, and performance metrics.'
      },
      {
        id: 'custom-reports',
        type: 'new',
        title: 'Custom Report Builder',
        description: 'Create custom reports with drag-and-drop interface and export to PDF or CSV.'
      },
      {
        id: 'time-tracking',
        type: 'improved',
        title: 'Enhanced Time Tracking',
        description: 'More accurate time tracking with automatic detection of idle time and break periods.'
      },
      {
        id: 'export-bug',
        type: 'fixed',
        title: 'Data Export Issues',
        description: 'Fixed formatting issues when exporting large datasets to CSV and Excel formats.'
      }
    ]
  }
];

const changeTypeConfig = {
  new: {
    icon: Plus,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    label: 'New'
  },
  improved: {
    icon: Zap,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    label: 'Improved'
  },
  fixed: {
    icon: Bug,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    label: 'Fixed'
  },
  security: {
    icon: Shield,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    label: 'Security'
  }
};

export default function ChangelogPage() {
  const intl = useIntl();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredEntries = changelogEntries.filter(entry => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'featured') return entry.featured;
    return entry.changes.some(change => change.type === selectedFilter);
  });

  return (
    <PublicLayout>
      <PageSEO
        title="Changelog - Product Updates and Release Notes"
        description="Track Deskive's latest features, improvements, and bug fixes. Stay updated with product releases, new capabilities, and platform enhancements."
        keywords={['changelog', 'updates', 'release notes', 'new features', 'product updates', 'version history']}
      />
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 rounded-full px-4 py-2 mb-6"
              >
                <Rocket className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-300 font-medium">Product Updates</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                What's New in
                <span 
                  className="block"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Deskive
                </span>
              </h1>
              <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
                Stay up to date with the latest features, improvements, and bug fixes. 
                We're constantly working to make Deskive better for your team.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                  onClick={() => document.getElementById('changelog')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Latest Updates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => document.getElementById('subscribe')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Subscribe to Updates
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center"
            >
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-6">
                <Sparkles className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  24
                </div>
                <p className="text-white/70 text-sm">New Features</p>
                <p className="text-white/50 text-xs">This Quarter</p>
              </div>
              
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-6">
                <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  47
                </div>
                <p className="text-white/70 text-sm">Improvements</p>
                <p className="text-white/50 text-xs">This Quarter</p>
              </div>
              
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-6">
                <CheckCircle className="h-8 w-8 text-orange-400 mx-auto mb-3" />
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  156
                </div>
                <p className="text-white/70 text-sm">Fixes</p>
                <p className="text-white/50 text-xs">This Quarter</p>
              </div>
              
              <div className="glass-effect glass-card-hover border-white/10 rounded-2xl p-6">
                <Heart className="h-8 w-8 text-pink-400 mx-auto mb-3" />
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  2.3K
                </div>
                <p className="text-white/70 text-sm">User Requests</p>
                <p className="text-white/50 text-xs">Implemented</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Filter Section */}
        <section className="py-8 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, amount: 0.3 }}
              className="flex items-center justify-center"
            >
              <Card className="glass-effect border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Filter className="h-5 w-5 text-white/60" />
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'all', label: 'All Updates' },
                        { id: 'featured', label: 'Featured' },
                        { id: 'new', label: 'New Features' },
                        { id: 'improved', label: 'Improvements' },
                        { id: 'fixed', label: 'Bug Fixes' }
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setSelectedFilter(filter.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            selectedFilter === filter.id
                              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white'
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Changelog Entries */}
        <section id="changelog" className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              {filteredEntries.map((entry, entryIndex) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: entryIndex * 0.1 }}
                  viewport={{ once: true, amount: 0.2 }}
                >
                  <Card className={`glass-effect border-white/10 ${
                    entry.featured ? 'ring-2 ring-cyan-500/30' : ''
                  }`}>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">v{entry.version}</span>
                            {entry.featured && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 rounded-full">
                                <Star className="h-3 w-3 text-cyan-400" />
                                <span className="text-xs font-medium text-cyan-300">Featured</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-white/60">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{entry.date}</span>
                        </div>
                      </div>
                      
                      <CardTitle className="text-white text-xl mb-2">{entry.title}</CardTitle>
                      <p className="text-white/70">{entry.description}</p>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {entry.changes.map((change, changeIndex) => {
                          const config = changeTypeConfig[change.type];
                          const IconComponent = config.icon;
                          
                          return (
                            <motion.div
                              key={change.id}
                              initial={{ opacity: 0, x: -20 }}
                              whileInView={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: changeIndex * 0.05 }}
                              viewport={{ once: true, amount: 0.3 }}
                              className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                              <div className={`flex-shrink-0 w-8 h-8 ${config.bgColor} ${config.borderColor} border rounded-lg flex items-center justify-center`}>
                                <IconComponent className={`h-4 w-4 ${config.color}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white">{change.title}</h4>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color} ${config.borderColor} border`}>
                                    {config.label}
                                  </span>
                                </div>
                                <p className="text-white/70 text-sm">{change.description}</p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Subscribe Section */}
        <section id="subscribe" className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center p-12 rounded-3xl glass-effect border-white/10 max-w-2xl mx-auto"
            >
              <Bell className="h-16 w-16 text-cyan-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Stay Updated
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Subscribe to get notified about new features, improvements, and important updates.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-6">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent backdrop-blur-sm"
                />
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0 whitespace-nowrap"
                >
                  Subscribe
                  <Mail className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-6 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>12K+ subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>No spam, ever</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Feedback CTA */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.3 }}
              className="text-center"
            >
              <Card className="glass-effect border-white/10 max-w-3xl mx-auto">
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-left">
                      <h3 className="text-2xl font-bold text-white mb-4">
                        Have Ideas for New Features?
                      </h3>
                      <p className="text-white/70 mb-4">
                        We love hearing from our users! Your feedback helps us prioritize what to build next.
                      </p>
                      <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                        <Heart className="h-4 w-4 text-pink-400" />
                        <span>Over 2,300 user requests implemented</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button
                        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                        onClick={() => window.open('mailto:feedback@deskive.com?subject=Feature Request', '_blank')}
                      >
                        Submit Feature Request
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                        onClick={() => window.open('/community/feedback', '_blank')}
                      >
                        Join Community Discussion
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}