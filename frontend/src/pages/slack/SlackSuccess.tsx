/**
 * SlackSuccess Component
 * Success page for users who installed the Deskive Slack app
 * Covers all three features: Whiteboard, Calendar, and Projects
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Palette, Calendar, FolderKanban } from 'lucide-react';

const SlackSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();

  const teamId = searchParams.get('team_id');

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
            Welcome to Deskive! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your Deskive app has been successfully connected to Slack.
          </p>
          <p className="text-gray-500">
            Start using Whiteboards, Calendar, and Projects directly from Slack!
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Whiteboard Feature */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">Whiteboard</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Collaborate on visual canvases in real-time
            </p>
            <code className="bg-white rounded px-2 py-1 text-xs text-purple-600 font-mono block">
              /whiteboard new
            </code>
          </div>

          {/* Calendar Feature */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Calendar</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Create events and manage your schedule
            </p>
            <code className="bg-white rounded px-2 py-1 text-xs text-blue-600 font-mono block">
              /calendar new
            </code>
          </div>

          {/* Projects Feature */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <FolderKanban className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Projects</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Manage tasks and track project progress
            </p>
            <code className="bg-white rounded px-2 py-1 text-xs text-green-600 font-mono block">
              /project new
            </code>
          </div>
        </div>

        {/* Available Commands */}
        <div className="mb-8">
          <h3 className="font-bold text-gray-900 mb-4 text-center">All Available Commands</h3>

          {/* Whiteboard Commands */}
          <div className="mb-4">
            <h4 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Whiteboard
            </h4>
            <ul className="space-y-1 pl-6">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-purple-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/whiteboard new</code>
                  <span className="text-gray-600 text-xs ml-2">- Create a new whiteboard</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-purple-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/whiteboard list</code>
                  <span className="text-gray-600 text-xs ml-2">- View all whiteboards</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Calendar Commands */}
          <div className="mb-4">
            <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar
            </h4>
            <ul className="space-y-1 pl-6">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/calendar new [title]</code>
                  <span className="text-gray-600 text-xs ml-2">- Create an event</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/calendar today</code>
                  <span className="text-gray-600 text-xs ml-2">- View today's events</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-blue-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/calendar list</code>
                  <span className="text-gray-600 text-xs ml-2">- View upcoming events</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Projects Commands */}
          <div>
            <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
              <FolderKanban className="w-4 h-4" />
              Projects
            </h4>
            <ul className="space-y-1 pl-6">
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/project new</code>
                  <span className="text-gray-600 text-xs ml-2">- Create a new project</span>
                </div>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-1">•</span>
                <div>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/project list</code>
                  <span className="text-gray-600 text-xs ml-2">- View all projects</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <a
              href={teamId ? `slack://open?team=${teamId}` : 'slack://open'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Return to Slack Desktop
              <ArrowRight className="w-5 h-5" />
            </a>

            <div>
              <a
                href={teamId ? `https://app.slack.com/client/${teamId}` : 'https://slack.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
              >
                or open in browser
              </a>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            You can close this window and start using the whiteboard in Slack!
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SlackSuccess;
