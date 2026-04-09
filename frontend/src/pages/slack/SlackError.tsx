/**
 * SlackError Component
 * Error page for Slack whiteboard app installation failures
 */

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';

const SlackError: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reason = searchParams.get('reason');
  const message = searchParams.get('message');

  const errorMessages: Record<string, { title: string; description: string }> = {
    no_code: {
      title: 'Authorization Code Missing',
      description: 'The OAuth authorization code was not provided. Please try installing the app again from Slack.',
    },
    oauth_failed: {
      title: 'OAuth Authentication Failed',
      description: message || 'There was an error connecting your Slack workspace. Please try again.',
    },
    default: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred during the installation process.',
    },
  };

  const errorInfo = errorMessages[reason || 'default'] || errorMessages.default;

  const retryInstallation = () => {
    // Redirect to Slack app installation page
    window.location.href = `https://slack.com/oauth/v2/authorize?client_id=${import.meta.env.VITE_SLACK_CLIENT_ID}&scope=commands,chat:write,users:read,users:read.email&redirect_uri=${encodeURIComponent(import.meta.env.VITE_SLACK_REDIRECT_URI)}`;
  };

  const goToSupport = () => {
    navigate('/support');
  };

  const goHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12"
      >
        {/* Error Icon */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
          >
            <AlertCircle className="w-14 h-14 text-white" />
          </motion.div>

          <h1 className="text-4xl font-black text-gray-900 mb-4">
            {errorInfo.title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {errorInfo.description}
          </p>

          {message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 font-mono">{decodeURIComponent(message)}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={retryInstallation}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={goToSupport}
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              <HelpCircle className="w-5 h-5" />
              Get Help
            </button>

            <button
              onClick={goHome}
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              <Home className="w-5 h-5" />
              Go Home
            </button>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">Need Help?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Make sure you have permission to install apps in your Slack workspace</li>
            <li>• Check that you're logged into the correct Slack workspace</li>
            <li>• If the problem persists, contact our support team</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default SlackError;
