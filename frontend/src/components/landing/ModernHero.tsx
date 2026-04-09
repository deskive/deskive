import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  Calendar,
  FolderOpen,
  Kanban,
  Video,
  FileText,
  Brain,
  BarChart3,
  Search,
  Palette
} from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FormattedMessage } from 'react-intl';

const ModernHero: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedModule, setSelectedModule] = React.useState('Chat');
  const [isPaused, setIsPaused] = React.useState(false);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/auth/register');
    }
  };

  // All modules overview with descriptions and images
  const modules = [
    {
      icon: MessageSquare,
      title: 'Chat',
      color: 'from-cyan-500 to-cyan-600',
      description: 'Real-time messaging and collaboration',
      features: ['Channels & DMs', 'File Sharing', 'Threads', '@Mentions'],
      image: 'https://cdn.deskive.com/deskive/message.png',
      setupSteps: [
        'Create team channels',
        'Invite team members',
        'Start messaging instantly',
        'Share files and media'
      ],
      benefits: 'Connect your team with real-time chat, organized channels, and seamless file sharing.'
    },
    {
      icon: Kanban,
      title: 'Projects',
      color: 'from-sky-500 to-sky-600',
      description: 'Kanban boards and task management',
      features: ['Kanban Boards', 'Gantt Charts', 'Sprints', 'Time Tracking'],
      image: 'https://cdn.deskive.com/deskive/project.png',
      setupSteps: [
        'Create project boards',
        'Add tasks and assign team',
        'Set deadlines & priorities',
        'Track progress visually'
      ],
      benefits: 'Manage projects efficiently with Kanban boards, time tracking, and comprehensive analytics.'
    },
    {
      icon: FolderOpen,
      title: 'Files',
      color: 'from-blue-500 to-blue-600',
      description: 'Cloud storage and file management',
      features: ['Cloud Storage', 'Version Control', 'Preview', 'Sharing'],
      image: 'https://cdn.deskive.com/deskive/file.png',
      setupSteps: [
        'Upload your documents',
        'Organize in folders',
        'Share with team',
        'Access anywhere'
      ],
      benefits: 'Store, organize, and share files securely with version control and instant previews.'
    },
    {
      icon: Calendar,
      title: 'Calendar',
      color: 'from-emerald-500 to-emerald-600',
      description: 'Schedule meetings and events',
      features: ['Event Scheduling', 'Meeting Rooms', 'Sync', 'Reminders'],
      image: 'https://cdn.deskive.com/deskive/calendar.png',
      setupSteps: [
        'Schedule meetings',
        'Set reminders',
        'Book meeting rooms',
        'Sync with Google/Outlook'
      ],
      benefits: 'Never miss a meeting with smart scheduling, reminders, and calendar synchronization.'
    },
    {
      icon: FileText,
      title: 'Notes',
      color: 'from-orange-500 to-orange-600',
      description: 'Rich text editor and documentation',
      features: ['Rich Editor', 'Templates', 'Collaboration', 'Export'],
      image: 'https://cdn.deskive.com/deskive/note.png',
      setupSteps: [
        'Create notebooks',
        'Use rich text editor',
        'Add images & tables',
        'Collaborate in real-time'
      ],
      benefits: 'Document everything with a powerful editor, templates, and real-time collaboration.'
    },
    {
      icon: Video,
      title: 'Video Calls',
      color: 'from-red-500 to-red-600',
      description: 'HD video conferencing',
      features: ['HD Video', 'Screen Share', 'Recording', 'Backgrounds'],
      image: 'https://cdn.deskive.com/deskive/video-call.png',
      setupSteps: [
        'Start instant video calls',
        'Share your screen',
        'Record meetings',
        'Use virtual backgrounds'
      ],
      benefits: 'Connect face-to-face with HD video, screen sharing, and meeting recordings.'
    },
  ];

  // Auto-rotate modules every 4 seconds (pause on hover)
  React.useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSelectedModule((currentModule) => {
        const currentIndex = modules.findIndex(m => m.title === currentModule);
        const nextIndex = (currentIndex + 1) % modules.length;
        return modules[nextIndex].title;
      });
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [modules, isPaused]);

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden pt-32 pb-16">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-sky-400/20 to-blue-400/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-sky-400/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-sky-400/40 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-blue-400/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-cyan-400/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-sky-400/40 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNCwgMTY1LCAyMzMsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-300/50 to-transparent animate-shimmer"></div>
            <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-300/50 to-transparent animate-shimmer" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent animate-shimmer" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent animate-shimmer" style={{ animationDelay: '6s' }}></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Section - Small Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-4xl mx-auto mt-8"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 mb-6"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span className="text-sm font-semibold text-sky-700">
              The Future of Team Collaboration
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            A platform built for a{' '}
            <span className="relative inline-block">
              <span
                className="relative z-10 bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #ff6b6b 0%, #4ecdc4 50%, #a8e6cf 100%)',
                }}
              >
                new way
              </span>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="absolute bottom-1 left-0 h-2 bg-gradient-to-r from-yellow-200 to-pink-200 opacity-40 -z-10 rounded"
              />
            </span>
            {' '}of working
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            What would you like to manage with Deskive Work OS?
          </p>
          {!isAuthenticated && (
            <Button
              className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
              onClick={handleGetStarted}
            >
              <FormattedMessage id="cta.readyToStart.button" />
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </motion.div>

        {/* Grid Layout - Tab LEFT (narrower), Image RIGHT (wider) */}
        <div
          className="grid lg:grid-cols-[0.8fr,2fr] gap-10 items-start max-w-7xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* LEFT - Both Cards Stacked */}
          <div className="space-y-4">
            {/* Card 1 - Set up your Workspace */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-3xl shadow-2xl p-5 border border-gray-100"
            >
            {/* Card Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Set up your Workspace
              </h2>
              <p className="text-xs text-gray-600">
                Start with what you need, customize as you go.
              </p>
            </div>

            {/* Module Grid - 3 columns, 2 rows */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {modules.map((module, index) => {
                const Icon = module.icon;
                const isSelected = selectedModule === module.title;
                return (
                  <motion.button
                    key={module.title}
                    onClick={() => setSelectedModule(module.title)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-400 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                      isSelected ? 'opacity-100' : 'opacity-60'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-gray-600'}`} />
                    </div>
                    <span className={`text-[9px] font-medium text-center leading-tight ${
                      isSelected ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {module.title}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2 mb-3">
              {modules.map((module) => (
                <button
                  key={module.title}
                  onClick={() => setSelectedModule(module.title)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    selectedModule === module.title
                      ? 'w-8 bg-gradient-to-r from-sky-500 to-blue-600'
                      : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`View ${module.title}`}
                />
              ))}
            </div>

            {/* Get Started Button */}
            {!isAuthenticated && (
              <Button
                className="w-full group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
                onClick={handleGetStarted}
              >
                <FormattedMessage id="cta.readyToStart.button" />
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </motion.div>

          {/* Card 2 - Quick Setup Guide (Compact) */}
          <motion.div
            key={`setup-${selectedModule}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100"
          >
            {(() => {
              const currentModule = modules.find(m => m.title === selectedModule);
              if (!currentModule) return null;
              const Icon = currentModule.icon;

              return (
                <>
                  {/* Compact Header with Icon */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentModule.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {currentModule.title}
                      </h3>
                      <p className="text-[10px] text-gray-500">{currentModule.description}</p>
                    </div>
                  </div>

                  {/* Benefits Section */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {currentModule.benefits}
                    </p>
                  </div>
                </>
              );
            })()}
          </motion.div>
          </div>

          {/* RIGHT - Real Product Screenshot Image */}
          <motion.div
            key={selectedModule}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative hidden lg:block"
          >
            {/* Colorful background elements */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
              <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
              <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Real Product Screenshot */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 ml-3">
                  https://deskive.com/workspace/dashboard
                </div>
              </div>

              {/* Dashboard Screenshot Image */}
              <div className="relative">
                <img
                  src={modules.find(m => m.title === selectedModule)?.image || modules[0].image}
                  alt={`Deskive ${selectedModule} Module`}
                  className="w-full h-auto object-cover transition-opacity duration-500"
                  style={{ aspectRatio: '16/9', maxHeight: '400px' }}
                />

                {/* Overlay with module info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                  <div className="text-white">
                    {(() => {
                      const currentModule = modules.find(m => m.title === selectedModule);
                      if (!currentModule) return null;
                      const Icon = currentModule.icon;
                      return (
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentModule.color} flex items-center justify-center shadow-lg backdrop-blur-sm`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">{currentModule.title}</h3>
                            <p className="text-xs text-white/90">{currentModule.description}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Feature badges overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                  {(() => {
                    const currentModule = modules.find(m => m.title === selectedModule);
                    if (!currentModule) return null;

                    return currentModule.features.slice(0, 3).map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-lg border border-gray-200"
                      >
                        <p className="text-[10px] font-semibold text-gray-900">{feature}</p>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -20px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(20px, 20px) scale(1.05);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animate-shimmer {
          animation: shimmer 8s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
};

export default ModernHero;
