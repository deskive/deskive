/**
 * TutorialPage Component - Enhanced with Budget Management
 * Displays video tutorials for different features with fancy design
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import { Video, Play, CheckCircle, Sparkles, TrendingUp, Award, Clock, Target, DollarSign } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { PageSEO } from '../components/seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TutorialPage: React.FC = () => {
  const intl = useIntl();
  const [activeCategory, setActiveCategory] = useState('all');

  const tutorials = [
    {
      id: 1,
      category: 'getting-started',
      badge: 'Getting Started',
      badgeColor: 'bg-blue-600',
      gradientFrom: 'from-blue-50',
      gradientTo: 'to-cyan-50',
      icon: Target,
      iconColor: 'text-blue-600',
      title: 'Project Management & Task Creation',
      description: 'Complete walkthrough from registration to creating your first project and tasks',
      duration: '3:45',
      level: 'Beginner',
      videoUrl: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/ece097c9-05b1-48a8-b519-35a6a7f46c8e-1769680134164-1769680121506-deskive_project_management.mp4',
      poster: 'https://cdn-dev.deskive.com/thumbnails/deskive-project-thumbnail.jpg',
      topics: 'Registration, Workspace Setup, Projects, Task Management',
      learnings: [
        'Create your Deskive account and complete registration',
        'Set up your first workspace and customize your profile',
        'Upload and manage your profile picture',
        'Create and configure your first project with kanban boards',
        'Add tasks, assign team members, and set priorities'
      ]
    },
    {
      id: 2,
      category: 'workspace',
      badge: 'Workspace Settings',
      badgeColor: 'bg-purple-600',
      gradientFrom: 'from-purple-50',
      gradientTo: 'to-pink-50',
      icon: Award,
      iconColor: 'text-purple-600',
      title: 'Workspace Management & Security',
      description: 'Master workspace settings, team collaboration, and security features',
      duration: '1:50',
      level: 'Intermediate',
      videoUrl: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/b6c80bde-bf2a-4a0d-835a-760c8bd4cf7e-1769683891909-1769683883826-deskive_workspace_management.mp4',
      poster: 'https://cdn-dev.deskive.com/thumbnails/deskive-workspace-thumbnail.jpg',
      topics: 'Workspace Settings, Security, Team Management, Notifications, Feedback',
      learnings: [
        'Manage workspace settings and configurations',
        'Invite team members and manage roles',
        'Configure security and access controls',
        'Set up notifications and preferences',
        'Collect and manage user feedback'
      ]
    },
    {
      id: 3,
      category: 'workflow',
      badge: 'Workflow & Approvals',
      badgeColor: 'bg-green-600',
      gradientFrom: 'from-green-50',
      gradientTo: 'to-emerald-50',
      icon: TrendingUp,
      iconColor: 'text-green-600',
      title: 'Request & Approval System',
      description: 'Learn how to create, manage, and approve requests with real-time collaboration',
      duration: '2:39',
      level: 'Intermediate',
      videoUrl: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/af8be964-ceb7-46f4-85d1-b42775c62061-1769687206767-1769687201895-Deskive_request_approval.mp4',
      poster: 'https://cdn-dev.deskive.com/thumbnails/deskive-approval-thumbnail.jpg',
      topics: 'Request Forms, Approval Workflow, Real-time Comments, Status Management',
      learnings: [
        'Create custom request types (leave requests, approvals, etc.)',
        'Submit requests as a team member using dynamic forms',
        'Review and manage incoming requests as an admin',
        'Add comments for clarification with real-time updates',
        'Approve or reject requests with instant status updates'
      ]
    },
    {
      id: 4,
      category: 'finance',
      badge: 'Budget Management',
      badgeColor: 'bg-amber-600',
      gradientFrom: 'from-amber-50',
      gradientTo: 'to-orange-50',
      icon: DollarSign,
      iconColor: 'text-amber-600',
      title: 'Budget Management & Financial Tracking',
      description: 'Master budget creation, expense tracking, and financial reporting features',
      duration: '2:33',
      level: 'Advanced',
      videoUrl: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/6f615440-8f38-4c78-a1db-a42aaf0befc9-1770032424839-1770032408116-deskive_budget_management.mp4',
      poster: 'https://cdn-dev.deskive.com/thumbnails/deskive-budget-thumbnail.jpg',
      topics: 'Budget Planning, Expense Tracking, Financial Reports, Cost Analysis',
      learnings: [
        'Create and configure workspace budgets with categories',
        'Track expenses and manage financial transactions',
        'Set up budget alerts and spending limits',
        'Generate financial reports and analytics',
        'Monitor budget utilization across projects'
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'All Tutorials', count: tutorials.length },
    { id: 'getting-started', label: 'Getting Started', count: tutorials.filter(t => t.category === 'getting-started').length },
    { id: 'workspace', label: 'Workspace', count: tutorials.filter(t => t.category === 'workspace').length },
    { id: 'workflow', label: 'Workflow', count: tutorials.filter(t => t.category === 'workflow').length },
    { id: 'finance', label: 'Finance', count: tutorials.filter(t => t.category === 'finance').length },
  ];

  const filteredTutorials = activeCategory === 'all'
    ? tutorials
    : tutorials.filter(t => t.category === activeCategory);

  return (
    <PublicLayout>
      <PageSEO
        title={intl.formatMessage({ id: 'tutorial.seo.title', defaultMessage: 'Video Tutorials - Learn Deskive' })}
        description={intl.formatMessage({ id: 'tutorial.seo.description', defaultMessage: 'Watch video tutorials to master all Deskive features including projects, workspace management, approvals, and budget tracking.' })}
        keywords={['tutorials', 'video guides', 'how to use deskive', 'training', 'budget management']}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Section with Particles Effect */}
        <div className="relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              className="absolute top-20 left-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl"
              animate={{
                x: [0, 50, 0],
                y: [0, 30, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl"
              animate={{
                x: [0, -40, 0],
                y: [0, -20, 0],
                scale: [1, 1.15, 1]
              }}
              transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-400 rounded-full blur-3xl"
              animate={{
                x: [-30, 30, -30],
                y: [-20, 20, -20],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 12, repeat: Infinity }}
            />
          </div>

          {/* Header Content */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10 pt-20 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full mb-8 shadow-2xl shadow-blue-600/30"
              >
                <Video className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm tracking-wide">LEARN BY WATCHING</span>
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 mb-6 leading-tight">
                Master{' '}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Deskive
                </span>
                <br />
                <span className="text-4xl md:text-5xl lg:text-6xl">with Video Tutorials</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
                Step-by-step video guides to unlock the full potential of your workspace
              </p>

              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-8 mt-8">
                <div className="text-center">
                  <div className="text-4xl font-black text-blue-600">{tutorials.length}</div>
                  <div className="text-sm text-gray-600 font-medium">Video Tutorials</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-purple-600">11m</div>
                  <div className="text-sm text-gray-600 font-medium">Total Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-cyan-600">4.9/5</div>
                  <div className="text-sm text-gray-600 font-medium">User Rating</div>
                </div>
              </div>
            </motion.div>

            {/* Category Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="max-w-4xl mx-auto"
            >
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-xl border-2 border-white">
                  {categories.map((cat) => (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-300"
                    >
                      {cat.label}
                      <Badge className="ml-2 bg-gray-100 text-gray-900 data-[state=active]:bg-white/20">
                        {cat.count}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </motion.div>
          </div>
        </div>

        {/* Tutorial Videos Grid */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {filteredTutorials.map((tutorial, index) => {
                const Icon = tutorial.icon;
                return (
                  <motion.div
                    key={tutorial.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                  >
                    <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 bg-white/90 backdrop-blur-sm group">
                      <CardHeader className={`bg-gradient-to-r ${tutorial.gradientFrom} ${tutorial.gradientTo} border-b relative overflow-hidden`}>
                        {/* Decorative gradient orb */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

                        <div className="flex items-center justify-between mb-3 relative z-10">
                          <Badge className={`${tutorial.badgeColor} text-white shadow-lg`}>
                            {tutorial.badge}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">{tutorial.duration}</span>
                          </div>
                        </div>

                        <CardTitle className="text-2xl md:text-3xl font-black text-gray-900 flex items-start gap-3 relative z-10">
                          <Icon className={`w-8 h-8 ${tutorial.iconColor} flex-shrink-0 mt-1`} />
                          {tutorial.title}
                        </CardTitle>

                        <CardDescription className="text-base text-gray-700 relative z-10 mt-2">
                          {tutorial.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-0">
                        {/* Video Player with Play Overlay */}
                        <div className="relative bg-black aspect-video group/video">
                          <video
                            controls
                            className="w-full h-full"
                            poster={tutorial.poster}
                            preload="metadata"
                          >
                            <source src={tutorial.videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>

                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              whileHover={{ scale: 1.1 }}
                              className="w-20 h-20 rounded-full bg-blue-600 shadow-2xl shadow-blue-600/50 flex items-center justify-center"
                            >
                              <Play className="w-10 h-10 text-white fill-white ml-1" />
                            </motion.div>
                          </div>
                        </div>

                        {/* Video Details */}
                        <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
                          <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Sparkles className={`w-5 h-5 ${tutorial.iconColor}`} />
                            What You'll Learn
                          </h4>

                          <ul className="space-y-3 mb-6">
                            {tutorial.learnings.map((learning, idx) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-start gap-3 group/item"
                              >
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                                <span className="text-gray-700 leading-relaxed">{learning}</span>
                              </motion.li>
                            ))}
                          </ul>

                          {/* Tutorial Info Badge */}
                          <div className="flex flex-wrap gap-2 pt-4 border-t">
                            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                              <Clock className="w-3 h-3 mr-1" />
                              {tutorial.duration}
                            </Badge>
                            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                              📚 {tutorial.level}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                              <Target className="w-3 h-3 mr-1" />
                              {tutorial.topics.split(',').length} Topics
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl pb-20"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 p-12 text-center shadow-2xl">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }} />
            </div>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute top-10 right-10 w-32 h-32 border-4 border-white/20 rounded-full"
            />

            <div className="relative z-10">
              <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of teams already using Deskive to streamline their workflow
              </p>
              <motion.a
                href="/auth/register"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg"
              >
                Start Free Trial
                <Sparkles className="w-5 h-5" />
              </motion.a>
              <p className="text-white/80 text-sm mt-4">No credit card required • 14-day free trial</p>
            </div>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
};

export default TutorialPage;
