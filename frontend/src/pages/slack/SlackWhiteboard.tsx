/**
 * SlackWhiteboard Component
 * Whiteboard list/creation page for Slack users
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Palette, ArrowLeft } from 'lucide-react';

const SlackWhiteboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const teamId = searchParams.get('team_id');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Whiteboards
            </span>
          </h1>
          <p className="text-gray-600">
            {teamId ? `Whiteboards for your Slack workspace` : 'All your collaborative whiteboards'}
          </p>
        </motion.div>

        {/* Empty State / Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Palette className="w-12 h-12 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Create Whiteboards from Slack
          </h2>

          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            To create and manage whiteboards, use the <code className="bg-gray-100 px-2 py-1 rounded text-sm">/whiteboard</code> command
            directly in your Slack channels. All whiteboards will appear here.
          </p>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 max-w-xl mx-auto border border-blue-100">
            <h3 className="font-bold text-gray-900 mb-3">Quick Commands:</h3>
            <ul className="space-y-2 text-left">
              <li>
                <code className="bg-white px-2 py-1 rounded border border-gray-200 text-sm">/whiteboard new</code>
                <span className="text-gray-600 text-sm ml-2">- Create a new whiteboard</span>
              </li>
              <li>
                <code className="bg-white px-2 py-1 rounded border border-gray-200 text-sm">/whiteboard list</code>
                <span className="text-gray-600 text-sm ml-2">- View all your whiteboards</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 space-y-3">
            <a
              href={teamId ? `slack://open?team=${teamId}` : 'slack://open'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              Open Slack Desktop
            </a>
            <div className="text-center">
              <a
                href={teamId ? `https://app.slack.com/client/${teamId}` : 'https://slack.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                or open in browser
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SlackWhiteboard;
