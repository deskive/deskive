/**
 * SlackCalendarOnboarding Component
 * Onboarding page for new users who installed the Slack Calendar app
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Users,
  Calendar,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/fetch';

const SlackCalendarOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');
  const teamId = searchParams.get('team_id');

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
    }
  }, [token]);

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      await api.post('/slack/calendar/complete-onboarding', {});
      navigate(`/slack/calendar${teamId ? `?team_id=${teamId}` : ''}`);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Calendar,
      title: 'Quick Event Creation',
      description: 'Create events with natural language right from Slack',
    },
    {
      icon: Bell,
      title: 'Smart Reminders',
      description: 'Get notified before events start in your Slack channels',
    },
    {
      icon: Users,
      title: 'Team Coordination',
      description: 'RSVP to events and see who\'s attending',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-8 md:p-12"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-black text-gray-900 mb-4">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Deskive Calendar
                </span>
                ! 📅
              </h1>
              <p className="text-lg text-gray-600">
                We've created your account using your Slack profile.
                Let's get you started with managing your schedule from Slack!
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-8 md:p-12"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">
                How to Use Deskive Calendar
              </h2>
              <p className="text-gray-600">
                Create and manage events in seconds from Slack
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Create an event</h3>
                  <p className="text-gray-600 mb-2">
                    Type a natural command like:
                  </p>
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
                    /calendar new Team standup tomorrow at 9am
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Enable notifications</h3>
                  <p className="text-gray-600 mb-2">
                    Get reminders in your channel:
                  </p>
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
                    /calendar link
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Check your schedule</h3>
                  <p className="text-gray-600 mb-2">
                    View today's events anytime:
                  </p>
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
                    /calendar today
                  </code>
                </div>
              </div>
            </div>

            {/* Other commands */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 mb-8 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">More Commands:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <code className="bg-white px-2 py-1 rounded border border-gray-300">/calendar list</code> - View upcoming events
                </li>
                <li>
                  <code className="bg-white px-2 py-1 rounded border border-gray-300">/calendar week</code> - View this week's events
                </li>
                <li>
                  <code className="bg-white px-2 py-1 rounded border border-gray-300">/calendar search [query]</code> - Search events
                </li>
                <li>
                  <code className="bg-white px-2 py-1 rounded border border-gray-300">/calendar help</code> - Show all commands
                </li>
              </ul>
            </div>

            {/* CTA */}
            <div className="text-center space-y-3">
              <button
                onClick={completeOnboarding}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Start Using Calendar'}
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-3 text-sm">
                <a
                  href={teamId ? `slack://open?team=${teamId}` : 'slack://open'}
                  className="text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  Skip to Slack Desktop
                </a>
                <span className="text-gray-400">•</span>
                <a
                  href={teamId ? `https://app.slack.com/client/${teamId}` : 'https://slack.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  Open in Browser
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SlackCalendarOnboarding;
