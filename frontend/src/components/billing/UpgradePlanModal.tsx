/**
 * Upgrade Plan Modal Component
 * Reusable modal for prompting users to upgrade their subscription plan
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Crown, Users, ArrowRight, Zap, Lock, Database } from 'lucide-react';

export type UpgradeLimitType = 'members' | 'storage' | 'projects' | 'ai' | 'generic';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  limitType?: UpgradeLimitType;
  limitMessage?: string;
  title?: string;
  subtitle?: string;
}

// Configuration for different limit types
const limitTypeConfig: Record<UpgradeLimitType, {
  icon: React.FC<{ className?: string }>;
  title: string;
  subtitle: string;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  benefits: string[];
}> = {
  members: {
    icon: Users,
    title: 'Member Limit Reached',
    subtitle: "You've reached your plan's member limit",
    gradientFrom: 'from-amber-500',
    gradientVia: 'via-orange-500',
    gradientTo: 'to-red-500',
    benefits: [
      'More team members',
      'Advanced collaboration features',
      'Priority support'
    ]
  },
  storage: {
    icon: Database,
    title: 'Storage Limit Reached',
    subtitle: "You've reached your plan's storage limit",
    gradientFrom: 'from-blue-500',
    gradientVia: 'via-indigo-500',
    gradientTo: 'to-indigo-600',
    benefits: [
      'More storage space',
      'Larger file uploads',
      'Extended file retention'
    ]
  },
  projects: {
    icon: Lock,
    title: 'Project Limit Reached',
    subtitle: "You've reached your plan's project limit",
    gradientFrom: 'from-green-500',
    gradientVia: 'via-emerald-500',
    gradientTo: 'to-teal-500',
    benefits: [
      'Unlimited projects',
      'Advanced project templates',
      'Project analytics'
    ]
  },
  ai: {
    icon: Zap,
    title: 'AI Usage Limit Reached',
    subtitle: "You've reached your plan's AI usage limit",
    gradientFrom: 'from-violet-500',
    gradientVia: 'via-purple-500',
    gradientTo: 'to-fuchsia-500',
    benefits: [
      'More AI requests',
      'Advanced AI features',
      'Priority AI processing'
    ]
  },
  generic: {
    icon: Crown,
    title: 'Plan Limit Reached',
    subtitle: "You've reached a limit on your current plan",
    gradientFrom: 'from-amber-500',
    gradientVia: 'via-orange-500',
    gradientTo: 'to-red-500',
    benefits: [
      'Higher limits',
      'More features',
      'Priority support'
    ]
  }
};

const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  limitType = 'generic',
  limitMessage,
  title,
  subtitle,
}) => {
  const navigate = useNavigate();
  const config = limitTypeConfig[limitType];
  const IconComponent = config.icon;

  const handleUpgradePlan = () => {
    onClose();
    navigate(`/workspaces/${workspaceId}/settings?tab=billing`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Gradient Header */}
          <div className={`bg-gradient-to-r ${config.gradientFrom} ${config.gradientVia} ${config.gradientTo} px-6 py-8 text-center relative overflow-hidden`}>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="absolute top-4 left-4 w-20 h-20 bg-white rounded-full blur-2xl" />
              <div className="absolute bottom-4 right-4 w-32 h-32 bg-yellow-300 rounded-full blur-3xl" />
            </div>

            {/* Icon */}
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {title || config.title}
              </h2>
              <p className="text-white/90 text-sm">
                {subtitle || config.subtitle}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Message from backend */}
            {limitMessage && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                    {limitMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Upgrade Benefits */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Upgrade to unlock:
              </p>
              <div className="space-y-2">
                {config.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpgradePlan}
                className="w-full flex items-center justify-center gap-2 btn-gradient-primary px-6 py-3 rounded-xl font-semibold shadow-lg transition-all"
              >
                <Crown className="w-5 h-5" />
                <span>Upgrade Plan</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <button
                onClick={onClose}
                className="w-full px-6 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors text-sm"
              >
                Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradePlanModal;
