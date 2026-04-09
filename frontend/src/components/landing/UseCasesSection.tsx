import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  MessageSquare,
  ArrowRight,
  LayoutDashboard,
  Search,
  Play
} from 'lucide-react';
import { VideoModal } from './VideoModal';

// Helper function to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Get YouTube thumbnail URL (maxresdefault for high quality, or hqdefault as fallback)
const getYouTubeThumbnail = (videoUrl: string): string => {
  const videoId = getYouTubeVideoId(videoUrl);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return '';
};

const UseCasesSection: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [selectedUseCase, setSelectedUseCase] = useState(0); // Default to first one
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Auto-rotate use cases every 5 seconds (pause when video modal is open)
  React.useEffect(() => {
    // Don't auto-rotate when video modal is open
    if (isVideoModalOpen) return;

    const interval = setInterval(() => {
      setSelectedUseCase((current) => (current + 1) % useCases.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isVideoModalOpen]);

  const useCases = [
    {
      title: intl.formatMessage({ id: 'workBroken.useCases.dashboard.title' }),
      description: intl.formatMessage({ id: 'workBroken.useCases.dashboard.description' }),
      icon: LayoutDashboard,
      videoUrl: 'https://youtu.be/YPh3IGmPZ8s'
    },
    {
      title: intl.formatMessage({ id: 'workBroken.useCases.search.title' }),
      description: intl.formatMessage({ id: 'workBroken.useCases.search.description' }),
      icon: Search,
      videoUrl: 'https://youtu.be/GxjnV-umYMI'
    },
    {
      title: intl.formatMessage({ id: 'workBroken.useCases.communication.title' }),
      description: intl.formatMessage({ id: 'workBroken.useCases.communication.description' }),
      icon: MessageSquare,
      videoUrl: 'https://youtu.be/KdZojznE0Zg'
    }
  ];

  return (
    <section id="use-cases" className="py-20 md:py-32 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-sky-600 font-semibold text-lg mb-4"
          >
            {intl.formatMessage({ id: 'workBroken.badge' })}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6"
          >
            {intl.formatMessage({ id: 'workBroken.title' })}{' '}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'workBroken.titleHighlight' })}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
          >
            {intl.formatMessage({ id: 'workBroken.subtitle' })}
          </motion.p>
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-wrap gap-4 justify-center"
            >
              {!isAuthenticated && (
                <Button
                  onClick={() => navigate('/auth/register')}
                  className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300"
                >
                  {intl.formatMessage({ id: 'workBroken.cta' })}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
              <Button
                onClick={() => navigate('/features')}
                variant="outline"
                className="group border-2 border-sky-500 text-sky-600 hover:bg-sky-50 font-semibold hover:scale-105 transition-all duration-300"
              >
                {intl.formatMessage({ id: 'common.exploreFeatures', defaultMessage: 'Explore Features' })}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
          {/* Left - Use Cases Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              const isSelected = selectedUseCase === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  onClick={() => setSelectedUseCase(index)}
                  className={`w-full text-left cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-l-4 border-sky-600 pl-6 bg-sky-50 py-6 pr-6 rounded-r-xl shadow-md'
                      : 'pl-2 py-6 hover:pl-4 hover:bg-gray-50 rounded-r-xl'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <Icon className={`w-7 h-7 flex-shrink-0 mt-1 transition-colors ${
                      isSelected ? 'text-sky-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <h3
                        className={`text-xl font-bold mb-2 transition-colors ${
                          isSelected ? 'text-sky-600' : 'text-gray-600'
                        }`}
                      >
                        {useCase.title}
                      </h3>
                      <AnimatePresence mode="wait">
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <p className="text-gray-700 leading-relaxed text-base mb-3">
                              {useCase.description}
                            </p>
                            {/* Play button under description */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUseCase(index);
                                setIsVideoModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium text-sm transition-colors group"
                            >
                              <div className="w-8 h-8 bg-sky-600 group-hover:bg-sky-700 rounded-full flex items-center justify-center transition-colors">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                              </div>
                              <span>{intl.formatMessage({ id: 'hero.cta.secondary', defaultMessage: 'Watch Demo' })}</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Right - Video Player */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedUseCase}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
                {/* Browser Chrome */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-lg px-4 py-2 text-sm text-gray-600 font-medium shadow-sm">
                    https://deskive.com/use-cases/{useCases[selectedUseCase].title.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="3"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* YouTube Thumbnail Preview */}
                <div className="relative bg-gray-900 cursor-pointer group" onClick={() => setIsVideoModalOpen(true)}>
                  {/* YouTube Thumbnail */}
                  <img
                    key={useCases[selectedUseCase].videoUrl}
                    src={getYouTubeThumbnail(useCases[selectedUseCase].videoUrl)}
                    alt={useCases[selectedUseCase].title}
                    className="w-full h-auto object-cover transition-all duration-300 group-hover:scale-105"
                    style={{ aspectRatio: '16/9' }}
                    onError={(e) => {
                      // Fallback to hqdefault if maxresdefault doesn't exist
                      const videoId = getYouTubeVideoId(useCases[selectedUseCase].videoUrl);
                      if (videoId && e.currentTarget.src.includes('maxresdefault')) {
                        e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                      }
                    }}
                  />

                  {/* Dark overlay on hover */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300" />

                  {/* YouTube Play Button - Center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-14 bg-red-600 group-hover:bg-red-700 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Video Info Overlay - Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg">
                        {React.createElement(useCases[selectedUseCase].icon, { className: 'w-5 h-5 text-white' })}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg drop-shadow-lg">
                          {useCases[selectedUseCase].title}
                        </h4>
                        <p className="text-sm text-white/90 line-clamp-1 drop-shadow-md">
                          {useCases[selectedUseCase].description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-sky-500/20 to-blue-500/20 blur-3xl opacity-50"></div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={useCases[selectedUseCase].videoUrl}
      />
    </section>
  );
};

export default UseCasesSection;
