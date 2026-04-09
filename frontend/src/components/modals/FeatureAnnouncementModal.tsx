/**
 * FeatureAnnouncementModal Component
 * Displays new features in a carousel modal for first-time visitors
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogPortal, DialogOverlay } from '../ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '../ui/button';
import type { FeatureData } from '../../types/features';

interface FeatureAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFeature: FeatureData | null;
  currentIndex: number;
  totalFeatures: number;
  onNext: () => void;
  onPrev: () => void;
  onGoTo?: (index: number) => void;
}

export function FeatureAnnouncementModal({
  isOpen,
  onClose,
  currentFeature,
  currentIndex,
  totalFeatures,
  onNext,
  onPrev,
  onGoTo,
}: FeatureAnnouncementModalProps) {
  const navigate = useNavigate();

  if (!currentFeature) return null;

  const handleLearnMore = () => {
    onClose();
    navigate(`/features#${currentFeature.id}`);
  };

  const handleVideoClick = () => {
    handleLearnMore();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50">
          {/* Background */}
          <div className="absolute inset-0 bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
            }}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 p-2 rounded-full bg-gray-100 dark:bg-slate-800/80 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">
            {/* Header Badge */}
            <div className="px-6 pt-6 pb-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border border-blue-500/20 dark:border-blue-500/30"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                  Discover Deskive
                </span>
              </motion.div>
            </div>

            {/* Video/Image Area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFeature.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="px-6"
              >
                <div
                  className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700/50 cursor-pointer group"
                  onClick={handleVideoClick}
                >
                  {currentFeature.videoSrc ? (
                    <>
                      <video
                        src={currentFeature.videoSrc}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-white/20 dark:backdrop-blur-sm px-4 py-2 rounded-full text-gray-800 dark:text-white text-sm font-medium">
                          Click to learn more
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="w-16 h-16 text-blue-500/30 mx-auto mb-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Feature Preview
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${currentFeature.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="px-6 py-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {currentFeature.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                  {currentFeature.description}
                </p>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleLearnMore}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-5 text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all group"
                  >
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  {totalFeatures > 1 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onPrev}
                        disabled={currentIndex === 0}
                        className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-white" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalFeatures }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => onGoTo?.(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              i === currentIndex
                                ? 'bg-blue-500'
                                : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={onNext}
                        disabled={currentIndex === totalFeatures - 1}
                        className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-700 dark:text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
