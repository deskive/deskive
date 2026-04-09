/**
 * SlackCalendar Component
 * Main calendar page for Slack users
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Bell, Search, Plus } from 'lucide-react';

const SlackCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const teamId = searchParams.get('team_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            Deskive Calendar
          </h1>
          <p className="text-lg text-gray-600">
            Manage your schedule directly from Slack
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Create Event</h3>
            </div>
            <code className="text-sm bg-white px-3 py-2 rounded block border border-gray-200 text-blue-600">
              /calendar new [title] at [time]
            </code>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Today's Events</h3>
            </div>
            <code className="text-sm bg-white px-3 py-2 rounded block border border-gray-200 text-green-600">
              /calendar today
            </code>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <Bell className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">Enable Notifications</h3>
            </div>
            <code className="text-sm bg-white px-3 py-2 rounded block border border-gray-200 text-purple-600">
              /calendar link
            </code>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-3">
              <Search className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-gray-900">Search Events</h3>
            </div>
            <code className="text-sm bg-white px-3 py-2 rounded block border border-gray-200 text-orange-600">
              /calendar search [query]
            </code>
          </div>
        </div>

        {/* All Commands */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">All Commands</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar new</code>
              <span className="text-gray-600">Create a new event</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar today</code>
              <span className="text-gray-600">View today's events</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar list</code>
              <span className="text-gray-600">View upcoming events</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar week</code>
              <span className="text-gray-600">View this week's events</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar search</code>
              <span className="text-gray-600">Search events</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar link</code>
              <span className="text-gray-600">Enable channel notifications</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar unlink</code>
              <span className="text-gray-600">Disable notifications</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-white px-2 py-1 rounded border border-gray-300 text-blue-600 flex-shrink-0">/calendar help</code>
              <span className="text-gray-600">Show all commands</span>
            </div>
          </div>
        </div>

        {/* Return to Slack */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <a
              href={teamId ? `slack://open?team=${teamId}` : 'slack://open'}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              Open Slack Desktop
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={teamId ? `https://app.slack.com/client/${teamId}` : 'https://slack.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold border-2 border-blue-600 hover:bg-blue-50 transition-all"
            >
              Open in Browser
            </a>
          </div>

          <p className="text-sm text-gray-500">
            Use the commands above in any Slack channel to manage your calendar
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SlackCalendar;
