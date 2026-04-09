/**
 * SlackCalendarSuccess Component
 * Success page for users who installed the Slack Calendar app
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Calendar } from 'lucide-react';

const SlackCalendarSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const teamId = searchParams.get('team_id');
  const workspaceId = searchParams.get('workspace_id');

  const goToCalendar = () => {
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/calendar`);
    } else {
      navigate(`/slack/calendar${teamId ? `?team_id=${teamId}` : ''}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12"
      >
        {/* Success Icon */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
          >
            <CheckCircle className="w-14 h-14 text-white" />
          </motion.div>

          <h1 className="text-4xl font-black text-gray-900 mb-4">
            Calendar Connected! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your Deskive Calendar app has been successfully connected to Slack.
          </p>
          <p className="text-gray-500">
            You can now create events and manage your schedule directly from Slack!
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="font-bold text-gray-900">Quick Start</h2>
          </div>
          <p className="text-gray-700 mb-4">
            Create an event by typing this command in any Slack channel:
          </p>
          <div className="bg-white rounded-lg p-4 border border-gray-200 font-mono text-sm text-blue-600 font-semibold">
            /calendar new Team lunch tomorrow at noon
          </div>
        </div>

        {/* Available Commands */}
        <div className="mb-8">
          <h3 className="font-bold text-gray-900 mb-3">Available Commands:</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/calendar new [title]</code>
                <span className="text-gray-600 text-sm ml-2">- Create a new event</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/calendar today</code>
                <span className="text-gray-600 text-sm ml-2">- View today's events</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/calendar list</code>
                <span className="text-gray-600 text-sm ml-2">- View upcoming events</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/calendar link</code>
                <span className="text-gray-600 text-sm ml-2">- Enable notifications in a channel</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-1">✓</span>
              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">/calendar help</code>
                <span className="text-gray-600 text-sm ml-2">- Show all commands</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <button
            onClick={goToCalendar}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            View My Calendar
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-4">
            <a
              href={teamId ? `slack://open?team=${teamId}` : 'slack://open'}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
            >
              Return to Slack Desktop
            </a>
            <span className="text-gray-400">•</span>
            <a
              href={teamId ? `https://app.slack.com/client/${teamId}` : 'https://slack.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
            >
              Open in Browser
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SlackCalendarSuccess;
