import React from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Calendar,
  FileText,
  MessageSquare,
  Video,
  Kanban,
} from 'lucide-react';

// Tool data (reused from WorkBrokenSection for consistency)
const deskiveTools = [
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

// Animation variants for container
const container3DVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.3,
    }
  }
};

// Animation variants for individual tools - flying in from distance
const tool3DVariants = {
  hidden: {
    opacity: 0,
    scale: 0.2,
    z: -2000,
    rotateX: 45,
    rotateY: 0,
  },
  visible: {
    opacity: 1,
    scale: 1,
    z: 0,
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    transition: {
      type: "spring" as const,
      stiffness: 60,
      damping: 20,
      mass: 1,
    }
  }
};

// Hover animation - subtle 3D lift and tilt
const hoverVariants = {
  scale: 1.1,
  z: 50,
  rotateY: 10,
  transition: {
    duration: 0.3
  }
};

const Tools3DShowcaseSection: React.FC = () => {
  const intl = useIntl();

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Animated background blobs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black text-gray-900 mb-4"
          >
            Everything You Need{' '}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              In One Place
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Six powerful tools working together seamlessly
          </motion.p>
        </div>

        {/* 3D Perspective Container */}
        <div
          className="relative"
          style={{
            perspective: '1200px',
            perspectiveOrigin: 'center center'
          }}
        >
          <motion.div
            variants={container3DVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {deskiveTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.name}
                  variants={tool3DVariants}
                  whileHover={hoverVariants}
                  className="relative bg-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow group"
                  style={{
                    willChange: 'transform, opacity',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Tool Icon Badge */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 mx-auto`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Tool Image Preview */}
                  <div className="relative w-full h-24 rounded-lg overflow-hidden mb-3">
                    <img
                      src={tool.image}
                      alt={tool.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Tool Info */}
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-1">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-gray-600 text-center">
                    {tool.desc}
                  </p>

                  {/* Gradient Border Glow on Hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none`}></div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* CSS for blob animation */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
};

export default Tools3DShowcaseSection;
