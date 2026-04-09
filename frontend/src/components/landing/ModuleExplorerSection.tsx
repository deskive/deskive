/**
 * ModuleExplorerSection Component
 * Interactive module explorer showcasing all Deskive features
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  MessageSquare,
  Calendar,
  FolderOpen,
  Kanban,
  Video,
  FileText,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Helper function to get proper image URL (handles both full URLs and local paths)
const getImageUrl = (image: string): string => {
  // If it's already a full URL, return as-is
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  // If it's a local path without extension, add .png
  if (!image.includes('.')) {
    return `${image}.png`;
  }
  // Otherwise return as-is
  return image;
};

const ModuleExplorerSection: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const intl = useIntl();
  const [selectedModule, setSelectedModule] = useState('Chat');
  const [isPaused, setIsPaused] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

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
      title: intl.formatMessage({ id: 'modules.chat.title' }),
      color: 'from-cyan-500 to-cyan-600',
      description: intl.formatMessage({ id: 'modules.chat.description' }),
      features: [
        intl.formatMessage({ id: 'modules.chat.features.channels' }),
        intl.formatMessage({ id: 'modules.chat.features.fileSharing' }),
        intl.formatMessage({ id: 'modules.chat.features.threads' }),
        intl.formatMessage({ id: 'modules.chat.features.mentions' })
      ],
      image: '/chat_dark',
      benefits: intl.formatMessage({ id: 'modules.chat.benefits' })
    },
    {
      icon: Kanban,
      title: intl.formatMessage({ id: 'modules.projects.title' }),
      color: 'from-sky-500 to-sky-600',
      description: intl.formatMessage({ id: 'modules.projects.description' }),
      features: [
        intl.formatMessage({ id: 'modules.projects.features.kanban' }),
        intl.formatMessage({ id: 'modules.projects.features.gantt' }),
        intl.formatMessage({ id: 'modules.projects.features.sprints' }),
        intl.formatMessage({ id: 'modules.projects.features.timeTracking' })
      ],
      image: '/project',
      benefits: intl.formatMessage({ id: 'modules.projects.benefits' })
    },
    {
      icon: FolderOpen,
      title: intl.formatMessage({ id: 'modules.files.title' }),
      color: 'from-blue-500 to-blue-600',
      description: intl.formatMessage({ id: 'modules.files.description' }),
      features: [
        intl.formatMessage({ id: 'modules.files.features.storage' }),
        intl.formatMessage({ id: 'modules.files.features.versionControl' }),
        intl.formatMessage({ id: 'modules.files.features.preview' }),
        intl.formatMessage({ id: 'modules.files.features.sharing' })
      ],
      image: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/f19a9430-6f86-4ff9-a763-0589d9766976-1768992380999-1768992374841-deskive_file_manager.mp4',
      isVideo: true,
      benefits: intl.formatMessage({ id: 'modules.files.benefits' })
    },
    {
      icon: Calendar,
      title: intl.formatMessage({ id: 'modules.calendar.title' }),
      color: 'from-emerald-500 to-emerald-600',
      description: intl.formatMessage({ id: 'modules.calendar.description' }),
      features: [
        intl.formatMessage({ id: 'modules.calendar.features.scheduling' }),
        intl.formatMessage({ id: 'modules.calendar.features.meetingRooms' }),
        intl.formatMessage({ id: 'modules.calendar.features.sync' }),
        intl.formatMessage({ id: 'modules.calendar.features.reminders' })
      ],
      image: 'https://cdn.deskive.com/deskive/calendar.png',
      benefits: intl.formatMessage({ id: 'modules.calendar.benefits' })
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'modules.notes.title' }),
      color: 'from-orange-500 to-orange-600',
      description: intl.formatMessage({ id: 'modules.notes.description' }),
      features: [
        intl.formatMessage({ id: 'modules.notes.features.richEditor' }),
        intl.formatMessage({ id: 'modules.notes.features.templates' }),
        intl.formatMessage({ id: 'modules.notes.features.collaboration' }),
        intl.formatMessage({ id: 'modules.notes.features.export' })
      ],
      image: 'https://cdn.deskive.com/deskive/note.png',
      benefits: intl.formatMessage({ id: 'modules.notes.benefits' })
    },
    {
      icon: Video,
      title: intl.formatMessage({ id: 'modules.videoCalls.title' }),
      color: 'from-red-500 to-red-600',
      description: intl.formatMessage({ id: 'modules.videoCalls.description' }),
      features: [
        intl.formatMessage({ id: 'modules.videoCalls.features.hdVideo' }),
        intl.formatMessage({ id: 'modules.videoCalls.features.screenShare' }),
        intl.formatMessage({ id: 'modules.videoCalls.features.recording' }),
        intl.formatMessage({ id: 'modules.videoCalls.features.backgrounds' })
      ],
      image: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/72cb8eb7-5492-4c09-ab17-bef53e915bb7-1768994375993-1768994371329-deskive_video_full_feature.mp4',
      isVideo: true,
      benefits: intl.formatMessage({ id: 'modules.videoCalls.benefits' })
    },
  ];

  // Auto-rotate modules every 4 seconds (pause on hover or when video modal is open)
  React.useEffect(() => {
    if (isPaused || isVideoModalOpen) return;

    const interval = setInterval(() => {
      setSelectedModule((currentModule) => {
        const currentIndex = modules.findIndex(m => m.title === currentModule);
        const nextIndex = (currentIndex + 1) % modules.length;
        return modules[nextIndex].title;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [modules, isPaused, isVideoModalOpen]);

  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-sky-600 font-semibold text-lg mb-4"
          >
            {intl.formatMessage({ id: 'moduleExplorer.badge' })}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6"
          >
            {intl.formatMessage({ id: 'moduleExplorer.title' })}{' '}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'moduleExplorer.titleHighlight' })}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            {intl.formatMessage({ id: 'moduleExplorer.subtitle' })}
          </motion.p>
        </div>

        <div
          className="grid lg:grid-cols-[0.8fr,2fr] gap-10 items-start max-w-7xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* LEFT - Module Selector Card */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl shadow-2xl p-5 border border-gray-100"
            >
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  {intl.formatMessage({ id: 'hero.exploreFeatures' })}
                </h2>
                <p className="text-xs text-gray-600">
                  {intl.formatMessage({ id: 'hero.clickModule' })}
                </p>
              </div>

              {/* Module Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {modules.map((module, index) => {
                  const Icon = module.icon;
                  const isSelected = selectedModule === module.title;
                  return (
                    <motion.button
                      key={module.title}
                      onClick={() => setSelectedModule(module.title)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      viewport={{ once: true }}
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

              {!isAuthenticated && (
                <Button
                  className="w-full group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
                  onClick={handleGetStarted}
                >
                  {intl.formatMessage({ id: 'hero.cta.tryFree' })}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
            </motion.div>

            {/* Quick Info Card */}
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

          {/* RIGHT - Real Product Screenshot */}
          <motion.div
            key={selectedModule}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
              <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
              <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 ml-3">
                  {intl.formatMessage({ id: 'hero.browserUrl' })}
                </div>
              </div>

              {/* Dashboard Screenshot or Video */}
              <div
                className="relative cursor-pointer overflow-hidden"
                style={{ width: '100%', backgroundColor: '#000' }}
                onClick={() => {
                  const currentModule = modules.find(m => m.title === selectedModule);
                  if (currentModule?.isVideo) {
                    setIsVideoModalOpen(true);
                  }
                }}
              >
                {(() => {
                  const currentModule = modules.find(m => m.title === selectedModule);
                  if (currentModule?.isVideo) {
                    return (
                      <video
                        src={currentModule.image}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="transition-opacity duration-500"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    );
                  }
                  return (
                    <img
                      src={getImageUrl(currentModule?.image || modules[0].image)}
                      alt={`Deskive ${selectedModule} Module`}
                      className="w-full h-auto object-cover transition-opacity duration-500"
                      style={{ aspectRatio: '16/9', maxHeight: '400px' }}
                    />
                  );
                })()}

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

                {/* Feature badges */}
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

      {/* Video Preview Modal */}
      {isVideoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-8"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 50 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '85vw', maxWidth: '1400px', height: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Video */}
            <video
              src={modules.find(m => m.title === selectedModule)?.image}
              autoPlay
              loop
              controls
              playsInline
              className="w-full h-auto"
              style={{ display: 'block', maxHeight: '85vh' }}
            />
          </motion.div>
        </motion.div>
      )}

      <style>{`
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
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
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

export default ModuleExplorerSection;
