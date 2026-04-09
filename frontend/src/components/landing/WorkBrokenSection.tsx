import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Calendar,
  FileText,
  MessageSquare,
  Video,
  Kanban,
  Sparkles,
  Play
} from 'lucide-react';
import { VideoModal } from './VideoModal';

// Helper function to get YouTube video ID from URL
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

// Get YouTube thumbnail URL (maxresdefault for highest quality)
const getYouTubeThumbnail = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    // maxresdefault = 1280x720, hqdefault = 480x360, mqdefault = 320x180
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return '/og_image.png'; // fallback
};

const WorkBrokenSection: React.FC = () => {
  const intl = useIntl();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const VIDEO_URL = 'https://youtu.be/S3-U6wztvYc';
  const videoThumbnail = getYouTubeThumbnail(VIDEO_URL);

  const deskiveModules = [
    {
      icon: MessageSquare,
      name: 'Chat',
      image: 'https://cdn.deskive.com/deskive/message.png',
      color: 'from-blue-500 to-cyan-500',
      desc: 'Team messaging'
    },
    {
      icon: Video,
      name: 'Video Calls',
      image: 'https://cdn.deskive.com/deskive/video-call.png',
      color: 'from-sky-500 to-blue-600',
      desc: 'HD conferencing'
    },
    {
      icon: Kanban,
      name: 'Projects',
      image: 'https://cdn.deskive.com/deskive/project.png',
      color: 'from-orange-500 to-red-500',
      desc: 'Kanban boards'
    },
    {
      icon: FileText,
      name: 'Files',
      image: 'https://cdn.deskive.com/deskive/file.png',
      color: 'from-green-500 to-emerald-500',
      desc: 'Cloud storage'
    },
    {
      icon: Calendar,
      name: 'Calendar',
      image: 'https://cdn.deskive.com/deskive/calendar.png',
      color: 'from-blue-500 to-sky-600',
      desc: 'Scheduling'
    },
    {
      icon: FileText,
      name: 'Notes',
      image: 'https://cdn.deskive.com/deskive/note.png',
      color: 'from-violet-500 to-fuchsia-500',
      desc: 'Documentation'
    }
  ];

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-white to-gray-50 ">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Left - Work is Broken - COMMENTED OUT */}
          {/*
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="relative bg-gray-50 rounded-[2rem] overflow-hidden p-8 md:p-12" style={{ minHeight: '600px' }}>
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                  <defs>
                    <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1" fill="#d1d5db" />
                    </pattern>
                  </defs>
                  <path
                    d="M 100 150 Q 200 100, 300 150"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                  />
                  <path
                    d="M 150 250 Q 250 200, 350 250"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                  />
                  <path
                    d="M 100 350 Q 200 300, 300 350"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                  />
                  <path
                    d="M 200 400 Q 300 350, 400 400"
                    stroke="#d1d5db"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="5,5"
                  />
                </svg>

                <div className="relative z-10 flex flex-col h-full" style={{ minHeight: '550px' }}>
                  <div className="mb-8">
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-sky-100 to-blue-100 rounded-full px-6 py-3 mb-6">
                      <span className="text-sm font-semibold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                        {intl.formatMessage({ id: 'workBroken.badge' })}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                      {intl.formatMessage({ id: 'workBroken.title' })}
                      <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                        {intl.formatMessage({ id: 'workBroken.titleHighlight' })}
                      </span>
                    </h2>
                    <p className="text-lg text-gray-600 font-medium">
                      {intl.formatMessage({ id: 'workBroken.subtitle' })}
                    </p>
                  </div>

                  <div className="relative flex-1">
                    {deskiveModules.map((module, idx) => {
                      const Icon = module.icon;
                      const positions = [
                        { top: '10%', left: '15%' },
                        { top: '12%', left: '65%' },
                        { top: '35%', left: '35%' },
                        { top: '50%', left: '10%' },
                        { top: '55%', left: '70%' },
                        { top: '75%', left: '40%' }
                      ];

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                          viewport={{ once: true }}
                          className="absolute"
                          style={positions[idx]}
                        >
                          <div className="relative group flex flex-col items-center">
                            <div className="relative w-32 h-20 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-200 transform transition-all hover:scale-110 hover:shadow-3xl hover:border-gray-300">
                              <img
                                src={module.image}
                                alt={module.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              <div className={`absolute top-1 right-1 w-7 h-7 bg-gradient-to-br ${module.color} rounded-lg flex items-center justify-center shadow-md`}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <p className="mt-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                              {module.name}
                            </p>
                            {idx % 2 === 0 && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                {idx + 1}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          */}

          {/* Section Title - Outside the black box */}
          <div className="text-center mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4"
            >
              {intl.formatMessage({ id: 'workBroken.title' })}
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'workBroken.titleHighlight' })}
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-xl text-gray-600 max-w-3xl mx-auto"
            >
              {intl.formatMessage({ id: 'workBroken.subtitle' })}
            </motion.p>
          </div>

          {/* Video Box */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              <div className="relative bg-black rounded-[2rem] overflow-hidden p-6 sm:p-8 md:p-12 w-fit mx-auto">
                {/* Intense Purple/Pink Glow Background */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-sky-600 rounded-full blur-[150px] opacity-50"></div>
                <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[130px] opacity-40"></div>
                <div className="absolute bottom-1/3 right-1/3 w-[350px] h-[350px] bg-sky-700 rounded-full blur-[120px] opacity-35"></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Video/Demo Preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="relative max-w-2xl mx-auto"
                  >
                    {/* Glow Effect */}
                    <div className="absolute -inset-3 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-[2rem] blur-[40px] opacity-50"></div>

                    {/* Video Thumbnail Container - Clickable */}
                    <button
                      onClick={() => setIsVideoModalOpen(true)}
                      className="relative w-full bg-gradient-to-br from-sky-900/50 to-blue-900/50 rounded-2xl overflow-hidden border border-sky-500/30 backdrop-blur-sm hover:border-sky-400/50 transition-all duration-300 group cursor-pointer"
                    >
                      {/* YouTube Video Thumbnail */}
                      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                        <img
                          src={videoThumbnail}
                          alt="Deskive Demo Video"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-sky-900/60 via-transparent to-transparent pointer-events-none"></div>

                      {/* YouTube-style Play Button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[68px] h-[48px] bg-[#FF0000] rounded-xl flex items-center justify-center group-hover:bg-[#CC0000] group-hover:scale-110 transition-all duration-300 shadow-lg">
                          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white ml-1" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Bottom Info Bar */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-white font-bold text-sm">{intl.formatMessage({ id: 'workBroken.features.powerfulSearch' })}</p>
                            <p className="text-white/70 text-xs">{intl.formatMessage({ id: 'workBroken.features.powerfulSearchDesc' })}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={VIDEO_URL}
      />
    </section>
  );
};

export default WorkBrokenSection;
