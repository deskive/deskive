import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  MessageSquare,
  Calendar,
  FolderOpen,
  Kanban,
  Video,
  FileText,
  Brain,
  BarChart3,
  Search,
  Palette,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';

const ModernFeatures: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      id: 'chat',
      icon: MessageSquare,
      title: 'Team Chat',
      subtitle: 'Real-time Collaboration',
      description: 'Seamless communication that keeps your team connected and productive. Never miss a beat with channels, DMs, and threads.',
      features: [
        'Unlimited channels & direct messages',
        'Message threads & reactions',
        'File sharing & rich text',
        'Search message history',
        'Custom emojis & GIFs',
        '@mentions & notifications'
      ],
      color: 'from-cyan-500 to-cyan-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      stats: { users: '50K+', messages: '10M+', uptime: '99.9%' }
    },
    {
      id: 'projects',
      icon: Kanban,
      title: 'Project Management',
      subtitle: 'Agile Workflows',
      description: 'Powerful project management with Kanban boards, Gantt charts, and sprint planning. Track progress and hit deadlines.',
      features: [
        'Kanban boards & Gantt charts',
        'Sprint planning & tracking',
        'Custom workflows',
        'Time tracking built-in',
        'Team collaboration',
        'Progress analytics'
      ],
      color: 'from-sky-500 to-sky-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      stats: { projects: '25K+', tasks: '500K+', teams: '5K+' }
    },
    {
      id: 'files',
      icon: FolderOpen,
      title: 'File Management',
      subtitle: 'Smart Storage',
      description: 'Organize, share, and collaborate on files with AI-powered search. Everything in one place, accessible anywhere.',
      features: [
        'Unlimited cloud storage',
        'AI-powered file search',
        'Version control & history',
        'Secure file sharing',
        'File preview & editing',
        'Team folders & permissions'
      ],
      color: 'from-blue-500 to-blue-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      stats: { storage: '100TB+', files: '5M+', shared: '1M+' }
    },
    {
      id: 'calendar',
      icon: Calendar,
      title: 'Smart Calendar',
      subtitle: 'Intelligent Scheduling',
      description: 'Schedule meetings and manage events effortlessly with AI-powered suggestions. Sync with Google Calendar seamlessly.',
      features: [
        'Multiple calendar views',
        'Meeting scheduling & rooms',
        'Google Calendar sync',
        'AI smart suggestions',
        'Timezone management',
        'Recurring events'
      ],
      color: 'from-emerald-500 to-emerald-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      stats: { meetings: '100K+', events: '500K+', sync: '99%' }
    },
    {
      id: 'notes',
      icon: FileText,
      title: 'Notes & Docs',
      subtitle: 'Knowledge Management',
      description: 'Build your knowledge base with rich text editor, templates, and real-time collaboration. Notion-style blocks made easy.',
      features: [
        'Block-based rich editor',
        'Templates library',
        'Real-time collaboration',
        'Version history',
        'Export to PDF/Markdown',
        'Rich formatting options'
      ],
      color: 'from-orange-500 to-orange-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      stats: { docs: '200K+', templates: '500+', users: '30K+' }
    },
    {
      id: 'video',
      icon: Video,
      title: 'Video Calls',
      subtitle: 'HD Meetings',
      description: 'Crystal-clear video conferencing with screen sharing, recording, and live transcription. Connect from anywhere.',
      features: [
        'HD video & audio quality',
        'Screen sharing & recording',
        'Live transcription',
        'Virtual backgrounds',
        'Breakout rooms',
        'Meeting analytics'
      ],
      color: 'from-red-500 to-red-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      stats: { calls: '50K+', hours: '100K+', quality: 'HD' }
    },
    {
      id: 'ai',
      icon: Brain,
      title: 'AI Assistant',
      subtitle: 'Smart Automation',
      description: 'ChatGPT-powered assistant for content generation, summaries, and automation. Let AI handle the repetitive tasks.',
      features: [
        'Content generation',
        'Meeting summaries',
        'Task automation',
        'Smart replies',
        'Image creation (DALL-E)',
        'Code assistance'
      ],
      color: 'from-amber-500 to-amber-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      stats: { requests: '1M+', accuracy: '95%', time: '<1s' }
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'Analytics & Reports',
      subtitle: 'Data Insights',
      description: 'Track productivity, monitor team performance, and make data-driven decisions with comprehensive analytics.',
      features: [
        'Productivity metrics',
        'Team performance tracking',
        'Custom report builder',
        'Real-time data updates',
        'Export & share reports',
        'Goal tracking & KPIs'
      ],
      color: 'from-rose-500 to-rose-600',
      imageUrl: 'https://cdn.deskive.com/deskive/screen-capture.mp4',
      stats: { reports: '10K+', metrics: '50+', insights: 'Real-time' }
    },
    {
      id: 'search',
      icon: Search,
      title: 'Universal Search',
      subtitle: 'Find Anything',
      description: 'AI-powered semantic search across all your content. Find messages, files, tasks, and notes instantly with natural language.',
      features: [
        'Semantic AI search',
        'Instant search results',
        'Advanced filters',
        'Search history',
        'Voice search support',
        'Quick actions from results'
      ],
      color: 'from-indigo-500 to-indigo-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      stats: { searches: '500K+', speed: '<100ms', accuracy: '98%' }
    },
    {
      id: 'whiteboard',
      icon: Palette,
      title: 'Whiteboard',
      subtitle: 'Visual Collaboration',
      description: 'Real-time collaborative whiteboard for brainstorming, diagrams, and visual thinking. Unlimited canvas for your ideas.',
      features: [
        'Infinite canvas',
        'Real-time collaboration',
        'Drawing & shape tools',
        'Templates & stickers',
        'Export to PNG/SVG',
        'Version control'
      ],
      color: 'from-blue-500 to-blue-600',
      imageUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
      stats: { boards: '15K+', collaborators: '100K+', templates: '200+' }
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 relative overflow-hidden bg-white">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-3"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-sky-200 bg-white shadow-md mb-6"
          >
            <Sparkles className="w-4 h-4 text-sky-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-700">Powerful Features</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            Everything you need to succeed
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            From startup to enterprise, Deskive scales with your team and adapts to your workflow
          </motion.p>
        </div>

        {/* Module Sections - Zigzag Layout */}
        <div className="space-y-32">
          {modules.map((module, index) => {
            const Icon = module.icon;
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${!isEven ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Content Side */}
                <div className={`space-y-6 ${!isEven ? 'lg:order-2' : ''}`}>
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 font-medium">{module.subtitle}</div>
                      <h3 className="text-3xl font-bold text-gray-900">{module.title}</h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {module.description}
                  </p>

                  {/* Features List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {module.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 pt-4">
                    {Object.entries(module.stats).map(([key, value], idx) => (
                      <div key={key} className="text-center">
                        <div className={`text-2xl font-bold bg-gradient-to-r ${module.color} bg-clip-text text-transparent`}>
                          {value}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => navigate(`/features#${module.id}`)}
                    className={`group bg-gradient-to-r ${module.color} hover:opacity-90 text-white font-semibold px-6 py-6 rounded-xl transition-all duration-300 shadow-md mt-4`}
                  >
                    <span className="flex items-center gap-2">
                      Explore {module.title}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </div>

                {/* Video/Image Side */}
                <div className={`relative ${!isEven ? 'lg:order-1' : ''}`}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="relative rounded-2xl overflow-hidden shadow-2xl"
                    style={{
                      boxShadow: `0 25px 60px ${
                        module.color.includes('cyan') ? 'rgba(6, 182, 212, 0.3)' :
                        module.color.includes('purple') ? 'rgba(14, 165, 233, 0.3)' :
                        module.color.includes('blue') ? 'rgba(59, 130, 246, 0.3)' :
                        module.color.includes('emerald') ? 'rgba(16, 185, 129, 0.3)' :
                        module.color.includes('orange') ? 'rgba(249, 115, 22, 0.3)' :
                        module.color.includes('red') ? 'rgba(239, 68, 68, 0.3)' :
                        module.color.includes('amber') ? 'rgba(251, 191, 36, 0.3)' :
                        module.color.includes('rose') ? 'rgba(244, 63, 94, 0.3)' :
                        module.color.includes('indigo') ? 'rgba(99, 102, 241, 0.3)' :
                        'rgba(236, 72, 153, 0.3)'
                      }`,
                    }}
                  >
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto"
                    >
                      <source src={module.imageUrl} type="video/mp4" />
                    </video>

                    {/* Video Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                      <div className="text-white">
                        <div className="font-semibold text-lg">{module.title}</div>
                        <div className="text-sm text-white/80">{module.subtitle}</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Glow Effect */}
                  <div
                    className="absolute inset-0 -z-10 blur-3xl opacity-20"
                    style={{
                      background: `radial-gradient(circle at center, ${
                        module.color.includes('cyan') ? 'rgba(6, 182, 212, 0.5)' :
                        module.color.includes('purple') ? 'rgba(14, 165, 233, 0.5)' :
                        module.color.includes('blue') ? 'rgba(59, 130, 246, 0.5)' :
                        module.color.includes('emerald') ? 'rgba(16, 185, 129, 0.5)' :
                        module.color.includes('orange') ? 'rgba(249, 115, 22, 0.5)' :
                        module.color.includes('red') ? 'rgba(239, 68, 68, 0.5)' :
                        module.color.includes('amber') ? 'rgba(251, 191, 36, 0.5)' :
                        module.color.includes('rose') ? 'rgba(244, 63, 94, 0.5)' :
                        module.color.includes('indigo') ? 'rgba(99, 102, 241, 0.5)' :
                        'rgba(236, 72, 153, 0.5)'
                      }, transparent 70%)`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Trusted by Section - monday.com style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mt-32 text-center"
        >
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Trusted by teams worldwide
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
            From startups to enterprises, teams choose Deskive to streamline their workflow and boost productivity
          </p>

          {/* Auto-scrolling Company Logos */}
          <div className="relative overflow-hidden py-8">
            {/* Gradient overlays for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            {/* Scrolling container */}
            <div className="flex items-center justify-start gap-16 animate-scroll-logos">
              {/* First set of logos */}
              <div className="flex items-center gap-16 shrink-0">
                {/* Google */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Google</span>
                </div>

                {/* Microsoft */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z"/>
                    <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                    <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                    <path fill="#FFB900" d="M13 13h10v10H13z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Microsoft</span>
                </div>

                {/* Amazon */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#FF9900" d="M14.18 18.32c-3.75 2.77-9.2 4.24-13.88 3.07-.89-.22-1.64.49-1.42 1.37.22.89 1.03 1.38 1.92 1.16 5.14 1.29 11.11-.26 15.36-3.39.77-.57.87-1.64.22-2.32-.64-.68-1.56-.59-2.2.11z"/>
                    <path fill="#FF9900" d="M18.25 15.95c-.48-.62-3.17-.29-4.38-.15-.37.05-.43-.28-.09-.51 2.14-1.51 5.65-1.07 6.06-.57.41.51-.11 4.03-2.12 5.71-.31.26-.61.12-.47-.22.45-1.13 1.48-3.65 1-4.26z"/>
                    <path fill="#221F1F" d="M16.35 11.35V9.71c0-.25.19-.41.41-.41h6.18c.23 0 .42.18.42.41v1.42c0 .23-.2.54-.55 1.02l-3.2 4.57c1.19-.03 2.45.15 3.53.75.24.14.31.34.33.54v1.76c0 .24-.27.52-.55.38-2.29-1.2-5.33-1.33-7.86.02-.25.13-.52-.14-.52-.38v-1.67c0-.26 0-.71.27-1.11l3.71-5.31h-3.23c-.23 0-.42-.19-.42-.42z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Amazon</span>
                </div>

                {/* Netflix */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#E50914" d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.994 2.344.073 4.685.073 6.368.073V24c-1.318 0-3.662 0-6.095-.073C11.082 15.955 8.738 9.419 5.565 1.19zm6.687 0c2.805 8.124 4.953 14.289 8.348 23.994V0z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Netflix</span>
                </div>

                {/* Spotify */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Spotify</span>
                </div>

                {/* Slack */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#E01E5A" d="M6.527 14.514A1.973 1.973 0 0 1 4.56 16.48a1.973 1.973 0 0 1-1.967-1.967c0-1.087.88-1.968 1.967-1.968h1.967v1.968zm.992 0c0-1.087.88-1.968 1.967-1.968s1.968.88 1.968 1.968v4.926a1.973 1.973 0 0 1-1.968 1.967 1.973 1.973 0 0 1-1.967-1.967v-4.926z"/>
                    <path fill="#36C5F0" d="M9.486 6.527A1.973 1.973 0 0 1 7.52 4.56c0-1.087.88-1.967 1.967-1.967 1.087 0 1.968.88 1.968 1.967v1.967H9.486zm0 .992c1.087 0 1.968.88 1.968 1.967s-.88 1.968-1.968 1.968H4.56a1.973 1.973 0 0 1-1.967-1.968c0-1.087.88-1.967 1.967-1.967h4.926z"/>
                    <path fill="#2EB67D" d="M17.473 9.486c0-1.087.88-1.967 1.967-1.967s1.967.88 1.967 1.967-.88 1.968-1.967 1.968h-1.967V9.486zm-.992 0a1.973 1.973 0 0 1-1.968 1.968 1.973 1.973 0 0 1-1.967-1.968V4.56c0-1.087.88-1.967 1.967-1.967s1.968.88 1.968 1.967v4.926z"/>
                    <path fill="#ECB22E" d="M14.514 17.473c1.087 0 1.967.88 1.967 1.967s-.88 1.967-1.967 1.967a1.973 1.973 0 0 1-1.968-1.967v-1.967h1.968zm0-.992a1.973 1.973 0 0 1-1.968-1.968c0-1.087.88-1.967 1.968-1.967h4.926c1.087 0 1.967.88 1.967 1.967a1.973 1.973 0 0 1-1.967 1.968h-4.926z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Slack</span>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#2D8CFF" d="M8.078 0A8.078 8.078 0 0 0 0 8.078v9.568A6.354 6.354 0 0 0 6.354 24h9.568A8.078 8.078 0 0 0 24 15.922V8.078A8.078 8.078 0 0 0 15.922 0H8.078zm5.768 5.53c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zm-8.693.616h8.308c.854 0 1.539.693 1.539 1.539v4.617c0 .854-.693 1.539-1.539 1.539H5.153c-.854 0-1.539-.693-1.539-1.539V7.685c0-.854.693-1.539 1.539-1.539zm11.078 2.462 4.307-2.616v8.54l-4.307-2.616V8.608z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Zoom</span>
                </div>

                {/* Dropbox */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#0061FF" d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Dropbox</span>
                </div>
              </div>

              {/* Duplicate set for seamless loop */}
              <div className="flex items-center gap-16 shrink-0">
                {/* Google */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Google</span>
                </div>

                {/* Microsoft */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z"/>
                    <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                    <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                    <path fill="#FFB900" d="M13 13h10v10H13z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Microsoft</span>
                </div>

                {/* Amazon */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#FF9900" d="M14.18 18.32c-3.75 2.77-9.2 4.24-13.88 3.07-.89-.22-1.64.49-1.42 1.37.22.89 1.03 1.38 1.92 1.16 5.14 1.29 11.11-.26 15.36-3.39.77-.57.87-1.64.22-2.32-.64-.68-1.56-.59-2.2.11z"/>
                    <path fill="#FF9900" d="M18.25 15.95c-.48-.62-3.17-.29-4.38-.15-.37.05-.43-.28-.09-.51 2.14-1.51 5.65-1.07 6.06-.57.41.51-.11 4.03-2.12 5.71-.31.26-.61.12-.47-.22.45-1.13 1.48-3.65 1-4.26z"/>
                    <path fill="#221F1F" d="M16.35 11.35V9.71c0-.25.19-.41.41-.41h6.18c.23 0 .42.18.42.41v1.42c0 .23-.2.54-.55 1.02l-3.2 4.57c1.19-.03 2.45.15 3.53.75.24.14.31.34.33.54v1.76c0 .24-.27.52-.55.38-2.29-1.2-5.33-1.33-7.86.02-.25.13-.52-.14-.52-.38v-1.67c0-.26 0-.71.27-1.11l3.71-5.31h-3.23c-.23 0-.42-.19-.42-.42z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Amazon</span>
                </div>

                {/* Netflix */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#E50914" d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.994 2.344.073 4.685.073 6.368.073V24c-1.318 0-3.662 0-6.095-.073C11.082 15.955 8.738 9.419 5.565 1.19zm6.687 0c2.805 8.124 4.953 14.289 8.348 23.994V0z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Netflix</span>
                </div>

                {/* Spotify */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Spotify</span>
                </div>

                {/* Slack */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#E01E5A" d="M6.527 14.514A1.973 1.973 0 0 1 4.56 16.48a1.973 1.973 0 0 1-1.967-1.967c0-1.087.88-1.968 1.967-1.968h1.967v1.968zm.992 0c0-1.087.88-1.968 1.967-1.968s1.968.88 1.968 1.968v4.926a1.973 1.973 0 0 1-1.968 1.967 1.973 1.973 0 0 1-1.967-1.967v-4.926z"/>
                    <path fill="#36C5F0" d="M9.486 6.527A1.973 1.973 0 0 1 7.52 4.56c0-1.087.88-1.967 1.967-1.967 1.087 0 1.968.88 1.968 1.967v1.967H9.486zm0 .992c1.087 0 1.968.88 1.968 1.967s-.88 1.968-1.968 1.968H4.56a1.973 1.973 0 0 1-1.967-1.968c0-1.087.88-1.967 1.967-1.967h4.926z"/>
                    <path fill="#2EB67D" d="M17.473 9.486c0-1.087.88-1.967 1.967-1.967s1.967.88 1.967 1.967-.88 1.968-1.967 1.968h-1.967V9.486zm-.992 0a1.973 1.973 0 0 1-1.968 1.968 1.973 1.973 0 0 1-1.967-1.968V4.56c0-1.087.88-1.967 1.967-1.967s1.968.88 1.968 1.967v4.926z"/>
                    <path fill="#ECB22E" d="M14.514 17.473c1.087 0 1.967.88 1.967 1.967s-.88 1.967-1.967 1.967a1.973 1.973 0 0 1-1.968-1.967v-1.967h1.968zm0-.992a1.973 1.973 0 0 1-1.968-1.968c0-1.087.88-1.967 1.968-1.967h4.926c1.087 0 1.967.88 1.967 1.967a1.973 1.973 0 0 1-1.967 1.968h-4.926z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Slack</span>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#2D8CFF" d="M8.078 0A8.078 8.078 0 0 0 0 8.078v9.568A6.354 6.354 0 0 0 6.354 24h9.568A8.078 8.078 0 0 0 24 15.922V8.078A8.078 8.078 0 0 0 15.922 0H8.078zm5.768 5.53c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zm-8.693.616h8.308c.854 0 1.539.693 1.539 1.539v4.617c0 .854-.693 1.539-1.539 1.539H5.153c-.854 0-1.539-.693-1.539-1.539V7.685c0-.854.693-1.539 1.539-1.539zm11.078 2.462 4.307-2.616v8.54l-4.307-2.616V8.608z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Zoom</span>
                </div>

                {/* Dropbox */}
                <div className="flex items-center gap-3 px-8 py-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#0061FF" d="M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Dropbox</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS Animation for scrolling logos */}
      <style>{`
        @keyframes scroll-logos {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-logos {
          animation: scroll-logos 40s linear infinite;
        }

        .animate-scroll-logos:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default ModernFeatures;
