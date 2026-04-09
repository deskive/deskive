/**
 * Send Invitation Modal Component
 * Modal for sending team invitations
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { sendInvitation } from '@/services/invitationService';
import UpgradePlanModal from '@/components/billing/UpgradePlanModal';
import type { SendInvitationData, TeamRole } from '@/types/invitation';

interface SendInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess?: () => void;
}

const SendInvitationModal: React.FC<SendInvitationModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SendInvitationData>({
    email: '',
    role: 'member',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await sendInvitation(workspaceId, formData);

      setSuccess(true);

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          email: '',
          role: 'member',
          message: '',
        });
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send invitation';

      // Check if this is a member limit error
      if (errorMessage.toLowerCase().includes('member limit reached') ||
          errorMessage.toLowerCase().includes('upgrade your plan')) {
        setLimitMessage(errorMessage);
        setShowUpgradeModal(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseUpgradeModal = () => {
    setShowUpgradeModal(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        email: '',
        role: 'member',
        message: '',
      });
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const getRoleDescription = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'Full control over workspace and all projects';
      case 'admin':
        return 'Can manage members, projects, and settings';
      case 'member':
        return 'Can collaborate on projects and tasks';
      case 'viewer':
        return 'Read-only access to workspace content';
      default:
        return '';
    }
  };

  if (!isOpen && !showUpgradeModal) return null;

  return (
    <>
      {/* Upgrade Plan Modal */}
      <UpgradePlanModal
        isOpen={showUpgradeModal}
        onClose={handleCloseUpgradeModal}
        workspaceId={workspaceId}
        limitType="members"
        limitMessage={limitMessage}
      />

      {/* Invitation Form Modal */}
      {isOpen && !showUpgradeModal && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Invite people to your workspace
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-8 h-8 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Invitation sent successfully!
              </p>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="colleague@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamRole })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {getRoleDescription(formData.role)}
              </p>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Message (optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Add a personal note to your invitation..."
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={isSubmitting || !formData.email}
                className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Invitation</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
      )}
    </>
  );
};

export default SendInvitationModal;
