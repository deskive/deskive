import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, MessageSquare, Kanban, FolderOpen, Calendar, FileText, Video, ChevronDown, AlertTriangle, User, Star, Github } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import LanguageSwitcher from '../LanguageSwitcher';

const GITHUB_REPO = 'deskive/deskive';
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

const formatStarCount = (count: number): string => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
};

const GitHubStarsButton: React.FC = () => {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = (() => {
      try {
        const raw = localStorage.getItem('deskive:github-stars');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { count: number; ts: number };
        if (Date.now() - parsed.ts < 60 * 60 * 1000) return parsed.count;
        return null;
      } catch {
        return null;
      }
    })();

    if (cached !== null) {
      setStars(cached);
      return;
    }

    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const count = Number(data.stargazers_count) || 0;
        setStars(count);
        try {
          localStorage.setItem('deskive:github-stars', JSON.stringify({ count, ts: Date.now() }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap text-sm font-semibold text-gray-800"
      aria-label="Star Deskive on GitHub"
    >
      <Github className="w-4 h-4" />
      <span className="hidden lg:inline">Star</span>
      <span className="inline-flex items-center gap-1 text-gray-600">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        {stars === null ? '—' : formatStarCount(stars)}
      </span>
    </a>
  );
};

const ModernHeader: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProductsMenu, setShowProductsMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const intl = useIntl();

  // Products/Modules for mega menu
  const products = [
    {
      icon: MessageSquare,
      name: intl.formatMessage({ id: 'header.products.chat.name' }),
      description: intl.formatMessage({ id: 'header.products.chat.description' }),
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      icon: Kanban,
      name: intl.formatMessage({ id: 'header.products.projects.name' }),
      description: intl.formatMessage({ id: 'header.products.projects.description' }),
      color: 'from-sky-500 to-sky-600'
    },
    {
      icon: FolderOpen,
      name: intl.formatMessage({ id: 'header.products.files.name' }),
      description: intl.formatMessage({ id: 'header.products.files.description' }),
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Calendar,
      name: intl.formatMessage({ id: 'header.products.calendar.name' }),
      description: intl.formatMessage({ id: 'header.products.calendar.description' }),
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      icon: FileText,
      name: intl.formatMessage({ id: 'header.products.notes.name' }),
      description: intl.formatMessage({ id: 'header.products.notes.description' }),
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Video,
      name: intl.formatMessage({ id: 'header.products.videoCalls.name' }),
      description: intl.formatMessage({ id: 'header.products.videoCalls.description' }),
      color: 'from-red-500 to-red-600'
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Redirect to current workspace or first available workspace
      if (currentWorkspace) {
        navigate(`/workspaces/${currentWorkspace.id}/dashboard`);
      } else if (workspaces.length > 0) {
        navigate(`/workspaces/${workspaces[0].id}/dashboard`);
      } else {
        navigate('/create-workspace');
      }
    } else {
      navigate('/auth/register');
    }
  };

  const handleSignIn = () => {
    if (isAuthenticated) {
      // Redirect to current workspace or first available workspace
      if (currentWorkspace) {
        navigate(`/workspaces/${currentWorkspace.id}/dashboard`);
      } else if (workspaces.length > 0) {
        navigate(`/workspaces/${workspaces[0].id}/dashboard`);
      } else {
        navigate('/create-workspace');
      }
    } else {
      navigate('/auth/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const handleProfileSettings = () => {
    if (currentWorkspace) {
      navigate(`/workspaces/${currentWorkspace.id}/settings?tab=profile`);
    } else if (workspaces.length > 0) {
      navigate(`/workspaces/${workspaces[0].id}/settings?tab=profile`);
    } else {
      navigate('/create-workspace');
    }
  };

  const handleAccountSettings = () => {
    if (currentWorkspace) {
      navigate(`/workspaces/${currentWorkspace.id}/settings?tab=security`);
    } else if (workspaces.length > 0) {
      navigate(`/workspaces/${workspaces[0].id}/settings?tab=security`);
    } else {
      navigate('/create-workspace');
    }
  };

  const handleNavClick = (href: string) => {
    if (href.startsWith('/')) {
      // If it's a page link, navigate to the page
      navigate(href);
    } else if (location.pathname !== '/home' && location.pathname !== '/') {
      // If not on home page and it's a section link, navigate to home first
      navigate('/home');
      // Then scroll to section after a short delay to allow page to render
      const elementId = href.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    } else {
      // If on home page and it's a section link, smooth scroll to section
      const elementId = href.replace('#', '');
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/98 backdrop-blur-xl border-b border-gray-200 shadow-lg shadow-gray-200/50'
          : 'bg-white/90 backdrop-blur-lg border-b border-gray-100/50'
      }`}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-18 md:h-20">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group"
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/')}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src="https://cdn.deskive.com/deskive/logo.png"
                alt="Deskive Logo"
                className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 transition-all duration-300 group-hover:scale-110"
              />
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-gray-900 font-black text-lg sm:text-xl md:text-2xl tracking-tight">
                  Deskive
                </span>
              </div>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 ml-6">
            <button
              onClick={() => handleNavClick('#home')}
              className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 relative group whitespace-nowrap"
            >
              {intl.formatMessage({ id: 'navigation.home' })}
            </button>

            {/* Products Mega Menu */}
            <div
              className="relative"
              onMouseEnter={() => setShowProductsMenu(true)}
              onMouseLeave={() => setShowProductsMenu(false)}
            >
              <button
                className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 relative group flex items-center gap-1 whitespace-nowrap"
              >
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
                              handleNavClick(`/products/${product.name.toLowerCase().replace(' ', '-')}`);
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

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => handleNavClick('#use-cases')}
              className="text-gray-700 hover:text-gray-900 font-semibold px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 whitespace-nowrap"
            >
              {intl.formatMessage({ id: 'navigation.features' })}
            </button>

          </nav>

          {/* Desktop CTA Buttons / User Profile */}
          {isAuthenticated ? (
            <div className="hidden lg:flex items-center gap-3">
              <GitHubStarsButton />
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-4 py-2 h-auto rounded-full hover:bg-gray-100">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {user?.name
                            ? user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : user?.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-900 font-semibold">{user?.name || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/home')}>
                    Home Page
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGetStarted}>
                    Go to Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleProfileSettings}>
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleAccountSettings}>
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <LanguageSwitcher />
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 xl:gap-3">
              <GitHubStarsButton />
              <Button
                variant="ghost"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-semibold px-3 xl:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap"
                onClick={handleSignIn}
              >
                {intl.formatMessage({ id: 'navigation.signIn' })}
              </Button>
              <Button
                className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:via-sky-700 hover:to-blue-700 text-white font-bold px-4 xl:px-5 py-2 border-0 rounded-lg shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-105 transition-all duration-300 group whitespace-nowrap text-sm"
                onClick={handleGetStarted}
              >
                {intl.formatMessage({ id: 'navigation.getStarted' })}
                <ArrowRight className="ml-1 xl:ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <LanguageSwitcher />
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={isOpen ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden overflow-hidden"
        >
          <div className="py-6 space-y-4 border-t border-gray-200">
            {[
              { labelId: 'navigation.home', href: '#home' },
              { labelId: 'navigation.features', href: '#use-cases' },
            ].map((item) => (
              <button
                key={item.labelId}
                onClick={() => {
                  handleNavClick(item.href);
                  setIsOpen(false);
                }}
                className="block text-gray-700 hover:text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-all duration-200 text-left w-full"
              >
                {intl.formatMessage({ id: item.labelId })}
              </button>
            ))}

                        
            {/* Language Switcher in Mobile */}
            <div className="flex justify-center pt-2">
              <LanguageSwitcher />
            </div>

            {/* Mobile User Profile / Auth Buttons */}
            {isAuthenticated ? (
              <div className="pt-4 space-y-3 border-t border-gray-200">
                {/* User Info */}
                <div className="px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {user?.name
                            ? user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()
                                .slice(0, 2)
                            : user?.email?.[0]?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                {/* Navigation Options */}
                <Button
                  variant="ghost"
                  className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-semibold py-3 rounded-lg justify-start transition-all duration-200"
                  onClick={() => {
                    handleGetStarted();
                    setIsOpen(false);
                  }}
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-semibold py-3 rounded-lg justify-start transition-all duration-200"
                  onClick={() => {
                    handleProfileSettings();
                    setIsOpen(false);
                  }}
                >
                  Profile Settings
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-semibold py-3 rounded-lg justify-start transition-all duration-200"
                  onClick={() => {
                    handleAccountSettings();
                    setIsOpen(false);
                  }}
                >
                  Account
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold py-3 rounded-lg justify-start transition-all duration-200"
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-200">
                <Button
                  className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-600 hover:via-sky-700 hover:to-blue-700 text-white font-bold py-3 border-0 rounded-lg shadow-lg shadow-sky-500/30 group transition-all duration-300"
                  onClick={() => {
                    handleGetStarted();
                    setIsOpen(false);
                  }}
                >
                  {intl.formatMessage({ id: 'navigation.getStarted' })}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
};

export default ModernHeader;
export { ModernHeader };