import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
}

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  // Match various YouTube URL formats
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
    }
  }
  return null;
};

// Check if URL is a YouTube URL
const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoUrl }) => {
  const youtubeEmbedUrl = isYouTubeUrl(videoUrl) ? getYouTubeEmbedUrl(videoUrl) : null;

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 z-[9998] backdrop-blur-sm"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute -top-12 right-0 sm:-top-14 sm:right-0 p-2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full hover:bg-black/70"
                aria-label="Close video"
              >
                <X className="w-8 h-8" />
              </button>

              {/* Video Container */}
              <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
                {youtubeEmbedUrl ? (
                  // YouTube iframe embed
                  <iframe
                    className="w-full"
                    style={{ aspectRatio: '16/9' }}
                    src={youtubeEmbedUrl}
                    title="Video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  // Regular video file
                  <video
                    className="w-full h-auto"
                    style={{ aspectRatio: '16/9' }}
                    controls
                    controlsList="nodownload"
                    playsInline
                    autoPlay
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>

              {/* Video Info */}
              <div className="mt-4 text-center">
                <p className="text-white text-lg font-semibold">
                  See Deskive in Action
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Discover how everything works together seamlessly
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
