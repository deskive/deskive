import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageSquare, Kanban, FolderOpen, Calendar, FileText, Video, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useIntl, FormattedMessage } from 'react-intl';
import LanguageSwitcher from '../LanguageSwitcher';

export const BlogHeader: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const intl = useIntl();
  const [showProductsMenu, setShowProductsMenu] = useState(false);

  // Products/Modules for mega menu
  const products = [
    {
      icon: MessageSquare,
      name: intl.formatMessage({ id: 'header.products.chat.name', defaultMessage: 'Chat' }),
      description: intl.formatMessage({ id: 'header.products.chat.description', defaultMessage: 'Real-time messaging and collaboration' }),
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: Kanban,
      name: intl.formatMessage({ id: 'header.products.projects.name', defaultMessage: 'Projects' }),
      description: intl.formatMessage({ id: 'header.products.projects.description', defaultMessage: 'Kanban boards and task management' }),
      color: 'from-sky-500 to-sky-600'
    },
    {
      icon: FolderOpen,
      name: intl.formatMessage({ id: 'header.products.files.name', defaultMessage: 'Files' }),
      description: intl.formatMessage({ id: 'header.products.files.description', defaultMessage: 'Cloud storage and file management' }),
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Calendar,
      name: intl.formatMessage({ id: 'header.products.calendar.name', defaultMessage: 'Calendar' }),
      description: intl.formatMessage({ id: 'header.products.calendar.description', defaultMessage: 'Schedule meetings and events' }),
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: FileText,
      name: intl.formatMessage({ id: 'header.products.notes.name', defaultMessage: 'Notes' }),
      description: intl.formatMessage({ id: 'header.products.notes.description', defaultMessage: 'Rich text editor and documentation' }),
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Video,
      name: intl.formatMessage({ id: 'header.products.videoCalls.name', defaultMessage: 'Video Calls' }),
      description: intl.formatMessage({ id: 'header.products.videoCalls.description', defaultMessage: 'HD video conferencing' }),
      color: 'from-red-500 to-red-600'
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Deskive</span>
              <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 hover:bg-blue-600">
                BETA
              </Badge>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => navigate('/home')}
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              {intl.formatMessage({ id: 'navigation.home' })}
            </button>

            {/* Products Mega Menu */}
            <div
              className="relative"
              onMouseEnter={() => setShowProductsMenu(true)}
              onMouseLeave={() => setShowProductsMenu(false)}
            >
              <button className="flex items-center gap-1 text-gray-700 hover:text-gray-900 font-medium transition-colors">
                {intl.formatMessage({ id: 'navigation.products' })}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showProductsMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Menu Dropdown */}
              <AnimatePresence>
                {showProductsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-[800px] bg-white rounded-2xl shadow-2xl shadow-gray-300/50 border border-gray-200 p-8 z-50"
                  >
                    <div className="grid grid-cols-3 gap-3">
                      {products.map((product, index) => {
                        const Icon = product.icon;
                        return (
                          <motion.button
                            key={product.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => {
                              setShowProductsMenu(false);
                              navigate(`/products/${product.name.toLowerCase().replace(' ', '-')}`);
                            }}
                            className="group p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gradient-to-br hover:from-gray-50 hover:to-white hover:shadow-md transition-all duration-300 text-left"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-300`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-sky-600 transition-colors">{product.name}</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">{product.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-7 pt-7 border-t border-gray-200 flex items-center justify-between bg-gradient-to-r from-sky-50/50 to-blue-50/50 rounded-xl p-5">
                      <div>
                        <h4 className="font-black text-gray-900 mb-1">
                          <FormattedMessage id="cta.readyToStart.title" defaultMessage="Ready to get started?" />
                        </h4>
                        <p className="text-sm text-gray-600 font-medium">
                          <FormattedMessage id="cta.readyToStart.subtitle" defaultMessage="Join thousands of teams already using Deskive to collaborate better and get more done." />
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setShowProductsMenu(false);
                          if (isAuthenticated && currentWorkspace) {
                            navigate(`/workspaces/${currentWorkspace.id}/dashboard`);
                          } else {
                            navigate('/auth/register');
                          }
                        }}
                        className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:via-sky-700 hover:to-blue-700 text-white font-bold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-105 transition-all duration-300 group"
                      >
                        {intl.formatMessage({ id: 'navigation.getStarted', defaultMessage: 'Get Started' })}
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => navigate('/features')}
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              {intl.formatMessage({ id: 'navigation.features' })}
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              {intl.formatMessage({ id: 'navigation.pricing' })}
            </button>
            <button
              onClick={() => navigate('/support')}
              className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              {intl.formatMessage({ id: 'navigation.support' })}
            </button>
            <button
              onClick={() => navigate('/blog')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              {intl.formatMessage({ id: 'navigation.blog' })}
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/downloads')}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              {intl.formatMessage({ id: 'navigation.download' })}
            </Button>
            {isAuthenticated ? (
              <Button
                onClick={() => {
                  const workspaceId = currentWorkspace?.id || localStorage.getItem('lastWorkspaceId');
                  if (workspaceId) {
                    navigate(`/workspaces/${workspaceId}/dashboard`);
                  } else {
                    navigate('/create-workspace');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {intl.formatMessage({ id: 'navigation.dashboard' })} →
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth/login')}
                  className="text-gray-700 hover:text-gray-900"
                >
                  {intl.formatMessage({ id: 'navigation.signIn' })}
                </Button>
                <Button
                  onClick={() => navigate('/auth/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {intl.formatMessage({ id: 'navigation.getStarted' })} →
                </Button>
              </>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
};
