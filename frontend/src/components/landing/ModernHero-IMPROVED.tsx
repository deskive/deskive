import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  Calendar,
  FolderOpen,
  Kanban,
  Video,
  FileText,
  TrendingUp,
  Users,
  Zap,
  PlayCircle,
  Brain,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Clock,
  Globe
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoModal } from './VideoModal';

// Helper function to get proper image URL (handles both full URLs and local paths)
const getImageUrl = (image: string): string => {
  // If it's already a full URL, return as-is
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  // If it's a local path without extension, add .png
  if (!image.includes('.')) {
    return `${image}.png`;
  }
  // Otherwise return as-is
  return image;
};

const ModernHero: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const intl = useIntl();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/auth/register');
    }
  };

  // Animation variants for different slides
  const animationVariants = {
    // Slide 2: Welcome - Zoom in from center
    welcome: {
      container: { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } },
      badge: { initial: { opacity: 0, scale: 0 }, animate: { opacity: 1, scale: 1 } },
      title: { initial: { opacity: 0, y: 50 }, animate: { opacity: 1, y: 0 } },
      description: { initial: { opacity: 0 }, animate: { opacity: 1 } },
      features: { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 } },
      visual: { initial: { opacity: 0, scale: 0.5, rotate: -180 }, animate: { opacity: 1, scale: 1, rotate: 0 } },
      icon: { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 } },
    },
    // Slide 3: AI Assistant - Fade with blur effect simulation
    'ai-assistant': {
      container: { initial: { opacity: 0, x: 100 }, animate: { opacity: 1, x: 0 } },
      badge: { initial: { opacity: 0, x: -50 }, animate: { opacity: 1, x: 0 } },
      title: { initial: { opacity: 0, x: -80 }, animate: { opacity: 1, x: 0 } },
      description: { initial: { opacity: 0, x: -60 }, animate: { opacity: 1, x: 0 } },
      features: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
      visual: { initial: { opacity: 0, x: 100, rotate: 10 }, animate: { opacity: 1, x: 0, rotate: 0 } },
      icon: { initial: { opacity: 0, scale: 2 }, animate: { opacity: 1, scale: 1 } },
    },
    // Slide 4: Smart Calendar - Slide from bottom
    'smart-calendar': {
      container: { initial: { opacity: 0, y: 80 }, animate: { opacity: 1, y: 0 } },
      badge: { initial: { opacity: 0, y: -30, rotate: -10 }, animate: { opacity: 1, y: 0, rotate: 0 } },
      title: { initial: { opacity: 0, y: 60 }, animate: { opacity: 1, y: 0 } },
      description: { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } },
      features: { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 } },
      visual: { initial: { opacity: 0, y: 100 }, animate: { opacity: 1, y: 0 } },
      icon: { initial: { opacity: 0, rotate: 360 }, animate: { opacity: 1, rotate: 0 } },
    },
    // Slide 5: Collaboration - Bounce in from sides
    collaboration: {
      container: { initial: { opacity: 0 }, animate: { opacity: 1 } },
      badge: { initial: { opacity: 0, scale: 0, rotate: 180 }, animate: { opacity: 1, scale: 1, rotate: 0 } },
      title: { initial: { opacity: 0, x: -100 }, animate: { opacity: 1, x: 0 } },
      description: { initial: { opacity: 0, x: 100 }, animate: { opacity: 1, x: 0 } },
      features: { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 } },
      visual: { initial: { opacity: 0, scale: 1.5 }, animate: { opacity: 1, scale: 1 } },
      icon: { initial: { opacity: 0, y: 50, rotate: -45 }, animate: { opacity: 1, y: 0, rotate: 0 } },
    },
    // Slide 6: Smart Notes - Flip in
    'smart-notes': {
      container: { initial: { opacity: 0, rotateY: 90 }, animate: { opacity: 1, rotateY: 0 } },
      badge: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
      title: { initial: { opacity: 0, scale: 1.2 }, animate: { opacity: 1, scale: 1 } },
      description: { initial: { opacity: 0, y: -30 }, animate: { opacity: 1, y: 0 } },
      features: { initial: { opacity: 0, rotate: -5 }, animate: { opacity: 1, rotate: 0 } },
      visual: { initial: { opacity: 0, rotateY: -90 }, animate: { opacity: 1, rotateY: 0 } },
      icon: { initial: { opacity: 0, scale: 0, rotate: 90 }, animate: { opacity: 1, scale: 1, rotate: 0 } },
    },
    // Slide 7: Project Management - Staggered cascade
    'project-management': {
      container: { initial: { opacity: 0, x: -50 }, animate: { opacity: 1, x: 0 } },
      badge: { initial: { opacity: 0, x: 50, y: -20 }, animate: { opacity: 1, x: 0, y: 0 } },
      title: { initial: { opacity: 0, y: -40 }, animate: { opacity: 1, y: 0 } },
      description: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 } },
      features: { initial: { opacity: 0, x: 30 }, animate: { opacity: 1, x: 0 } },
      visual: { initial: { opacity: 0, scale: 0.7, rotate: 15 }, animate: { opacity: 1, scale: 1, rotate: 0 } },
      icon: { initial: { opacity: 0, y: -80 }, animate: { opacity: 1, y: 0 } },
    },
  };

  // Hero slides data
  const heroSlides = [
    /* {
      id: 'main',
      type: 'main' as const,
    }, */
    {
      id: 'welcome',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.welcome.badge' }),
      badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
      icon: Sparkles,
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      title: intl.formatMessage({ id: 'hero.slides.welcome.title' }),
      description: intl.formatMessage({ id: 'hero.slides.welcome.description' }),
      features: [
        { icon: Brain, text: intl.formatMessage({ id: 'hero.slides.welcome.features.aiPowered' }), color: 'text-violet-600' },
        { icon: MessageSquare, text: intl.formatMessage({ id: 'hero.slides.welcome.features.realTime' }), color: 'text-blue-600' },
        { icon: Shield, text: intl.formatMessage({ id: 'hero.slides.welcome.features.smartProject' }), color: 'text-emerald-600' },
      ],
      animation: 'welcome' as const,
      screenshot: '/dashboard_light.png',
      mobileScreenshot: '/dashboar_mobile.png',
    },
    {
      id: 'chat',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.chat.badge' }),
      badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      icon: MessageSquare,
      iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      title: intl.formatMessage({ id: 'hero.slides.chat.title' }),
      description: intl.formatMessage({ id: 'hero.slides.chat.description' }),
      features: [
        { icon: MessageSquare, text: intl.formatMessage({ id: 'hero.slides.chat.features.channelsDms' }), color: 'text-cyan-600' },
        { icon: Users, text: intl.formatMessage({ id: 'hero.slides.chat.features.teamCollaboration' }), color: 'text-blue-600' },
        { icon: Zap, text: intl.formatMessage({ id: 'hero.slides.chat.features.instantNotifications' }), color: 'text-sky-600' },
      ],
      animation: 'collaboration' as const,
      screenshot: '/chat_light.png',
      mobileScreenshot: '/chat_mobile.png',
    },
    {
      id: 'smart-notes',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.smartNotes.badge' }),
      badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
      icon: FileText,
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
      title: intl.formatMessage({ id: 'hero.slides.smartNotes.title' }),
      description: intl.formatMessage({ id: 'hero.slides.smartNotes.description' }),
      features: [
        { icon: FileText, text: intl.formatMessage({ id: 'hero.slides.smartNotes.features.blockEditor' }), color: 'text-pink-600' },
        { icon: Brain, text: intl.formatMessage({ id: 'hero.slides.smartNotes.features.aiWriting' }), color: 'text-rose-600' },
        { icon: FolderOpen, text: intl.formatMessage({ id: 'hero.slides.smartNotes.features.smartOrganization' }), color: 'text-purple-600' },
      ],
      animation: 'ai-assistant' as const,
      screenshot: '/meeting_notes_dark.png',
      mobileScreenshot: '/meeting_notes_mobile.png',
    },
    {
      id: 'smart-calendar',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.smartCalendar.badge' }),
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Calendar,
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      title: intl.formatMessage({ id: 'hero.slides.smartCalendar.title' }),
      description: intl.formatMessage({ id: 'hero.slides.smartCalendar.description' }),
      features: [
        { icon: MessageSquare, text: intl.formatMessage({ id: 'hero.slides.smartCalendar.features.voiceToEvent' }), color: 'text-blue-600' },
        { icon: Globe, text: intl.formatMessage({ id: 'hero.slides.smartCalendar.features.naturalLanguage' }), color: 'text-cyan-600' },
        { icon: Clock, text: intl.formatMessage({ id: 'hero.slides.smartCalendar.features.smartScheduling' }), color: 'text-sky-600' },
      ],
      animation: 'smart-calendar' as const,
      screenshot: '/main_calendar_dark.png',
      mobileScreenshot: '/calendar_mobile.png',
    },
    {
      id: 'collaboration',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.collaboration.badge' }),
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Video,
      iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
      title: intl.formatMessage({ id: 'hero.slides.collaboration.title' }),
      description: intl.formatMessage({ id: 'hero.slides.collaboration.description' }),
      features: [
        { icon: MessageSquare, text: intl.formatMessage({ id: 'hero.slides.collaboration.features.teamChat' }), color: 'text-purple-600' },
        { icon: Video, text: intl.formatMessage({ id: 'hero.slides.collaboration.features.videoCalls' }), color: 'text-violet-600' },
        { icon: Zap, text: intl.formatMessage({ id: 'hero.slides.collaboration.features.smartNotifications' }), color: 'text-indigo-600' },
      ],
      animation: 'collaboration' as const,
      screenshot: '/video_call_dark.png',
      mobileScreenshot: '/video_call_mobile.png',
    },
    {
      id: 'analytics',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.analytics.badge' }),
      badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: TrendingUp,
      iconBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
      title: intl.formatMessage({ id: 'hero.slides.analytics.title' }),
      description: intl.formatMessage({ id: 'hero.slides.analytics.description' }),
      features: [
        { icon: TrendingUp, text: intl.formatMessage({ id: 'hero.slides.analytics.features.smartAnalytics' }), color: 'text-orange-600' },
        { icon: Brain, text: intl.formatMessage({ id: 'hero.slides.analytics.features.aiInsights' }), color: 'text-amber-600' },
        { icon: Clock, text: intl.formatMessage({ id: 'hero.slides.analytics.features.timeAnalysis' }), color: 'text-yellow-600' },
      ],
      animation: 'smart-notes' as const,
      screenshot: '/calendar_analytics_dark.png',
      mobileScreenshot: '/calendar_analytics_mobile.png',
    },
    {
      id: 'project-management',
      type: 'feature' as const,
      badge: intl.formatMessage({ id: 'hero.slides.projectManagement.badge' }),
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: Kanban,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      title: intl.formatMessage({ id: 'hero.slides.projectManagement.title' }),
      description: intl.formatMessage({ id: 'hero.slides.projectManagement.description' }),
      features: [
        { icon: Kanban, text: intl.formatMessage({ id: 'hero.slides.projectManagement.features.kanbanBoards' }), color: 'text-emerald-600' },
        { icon: Clock, text: intl.formatMessage({ id: 'hero.slides.projectManagement.features.timeTracking' }), color: 'text-teal-600' },
        { icon: TrendingUp, text: intl.formatMessage({ id: 'hero.slides.projectManagement.features.aiInsights' }), color: 'text-green-600' },
      ],
      animation: 'project-management' as const,
      screenshot: '/project_web_dark.png',
      mobileScreenshot: '/project_mobile.png',
    },
  ];

  // Auto-rotate slides - runs continuously
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  // Render main slide content
  const renderMainSlide = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center max-w-5xl mx-auto flex flex-col space-y-5"
    >
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 w-fit mx-auto"
      >
        <Sparkles className="w-4 h-4 text-sky-600" />
        <span className="text-sm font-bold text-sky-700">
          {intl.formatMessage({ id: 'hero.badge' })}
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight"
      >
        <span className="block mb-1">
          {intl.formatMessage({ id: 'hero.title' })}
        </span>
        <span className="relative inline-block">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative z-10 bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent"
          >
            {intl.formatMessage({ id: 'hero.titleHighlight' })}
          </motion.span>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute bottom-1 left-0 h-3 bg-gradient-to-r from-yellow-200 to-pink-200 opacity-40 -z-10 rounded"
          />
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="text-base sm:text-lg text-gray-700 font-semibold w-10/12 mx-auto"
      >
        {intl.formatMessage({ id: 'hero.subtitle' })} <span className="text-sky-600">{intl.formatMessage({ id: 'hero.subtitleHighlight1' })}</span>, <span className="text-sky-600">{intl.formatMessage({ id: 'hero.subtitleHighlight2' })}</span>, {intl.formatMessage({ id: 'common.and' })} <span className="text-sky-600">{intl.formatMessage({ id: 'hero.subtitleHighlight3' })}</span>
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="text-sm sm:text-base text-gray-600"
      >
        {intl.formatMessage(
          { id: 'hero.valueProposition' },
          {
            bold: <span className="font-bold text-green-600">{intl.formatMessage({ id: 'hero.subtitleBold' })}</span>,
            end: intl.formatMessage({ id: 'hero.subtitleEnd' })
          }
        )}
      </motion.p>

      {/* Stats */}
      <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center gap-2"
        >
          <Users className="w-5 h-5 text-sky-600" />
          <div className="text-left">
            <div className="font-black text-xl text-gray-900">{intl.formatMessage({ id: 'hero.stats.teamsCount' })}</div>
            <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'hero.stats.teams' })}</div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-5 h-5 text-green-600" />
          <div className="text-left">
            <div className="font-black text-xl text-gray-900">{intl.formatMessage({ id: 'hero.stats.freePlanLabel' })}</div>
            <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'hero.stats.freePlan' })}</div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex items-center gap-2"
        >
          <Zap className="w-5 h-5 text-sky-600" />
          <div className="text-left">
            <div className="font-black text-xl text-gray-900">{intl.formatMessage({ id: 'hero.stats.toolsCount' })}</div>
            <div className="text-xs text-gray-600">{intl.formatMessage({ id: 'hero.stats.toolsInOne' })}</div>
          </div>
        </motion.div>
      </div>

      {/* CTAs */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center"
        >
          <Button
            size="lg"
            variant="outline"
            className="group border-2 border-gray-300 hover:border-sky-500 bg-white hover:bg-sky-50 px-8 py-6 text-base font-bold transition-all duration-300 text-black"
            onClick={() => setIsVideoModalOpen(true)}
          >
            {intl.formatMessage({ id: 'hero.cta.secondary' })}
            <PlayCircle className="ml-2 w-5 h-5 text-sky-600" />
          </Button>
        </motion.div>
      )}
    </motion.div>
  );

  // Render feature slide content
  const renderFeatureSlide = (slide: typeof heroSlides[1]) => {
    if (slide.type !== 'feature') return null;
    const Icon = slide.icon;
    const anim = animationVariants[slide.animation];

    return (
      <motion.div
        key={slide.id}
        initial={anim.container.initial}
        animate={anim.container.animate}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto w-full"
      >
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <motion.div
              key={`badge-${slide.id}`}
              initial={anim.badge.initial}
              animate={anim.badge.animate}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 150 }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${slide.badgeColor} mb-6`}
            >
              <span className="text-sm font-bold">{slide.badge}</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              key={`title-${slide.id}`}
              initial={anim.title.initial}
              animate={anim.title.animate}
              transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4"
            >
              {slide.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              key={`desc-${slide.id}`}
              initial={anim.description.initial}
              animate={anim.description.animate}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base sm:text-lg text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0"
            >
              {slide.description}
            </motion.p>

            {/* Feature list */}
            <div className="space-y-3 mb-8">
              {slide.features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <motion.div
                    key={`feature-${slide.id}-${index}`}
                    initial={anim.features.initial}
                    animate={anim.features.animate}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.15, type: "spring", stiffness: 120 }}
                    className="flex items-center gap-3 justify-center lg:justify-start"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FeatureIcon className={`w-4 h-4 ${feature.color}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{feature.text}</span>
                  </motion.div>
                );
              })}
            </div>

          </div>

          {/* Right side - Visual */}
          <motion.div
            key={`visual-${slide.id}`}
            initial={anim.visual.initial}
            animate={anim.visual.animate}
            transition={{ duration: 0.7, delay: 0.15, type: "spring", stiffness: 80 }}
            className="order-1 lg:order-2 flex justify-center"
          >
            {(() => {
              const isDarkScreenshot = slide.screenshot?.includes('dark');
              return (
                <div className="relative flex items-end gap-4">
                  {/* Background glow */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.15, scale: 1.2 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`absolute inset-0 ${slide.iconBg} rounded-3xl blur-3xl -z-10`}
                  />

                  {/* Desktop Browser mockup */}
                  <div className={`relative rounded-xl shadow-2xl overflow-hidden border max-w-5xl ${
                    isDarkScreenshot
                      ? 'bg-gray-900 border-gray-700'
                      : 'bg-white border-gray-200'
                  }`}>
                    {/* Browser header */}
                    <div className={`px-4 py-2.5 flex items-center gap-3 border-b ${
                      isDarkScreenshot
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-100 border-gray-200'
                    }`}>
                      {/* Traffic lights */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      </div>
                      {/* URL bar */}
                      <div className="flex-1 mx-2">
                        <div className={`rounded-md px-2 py-1 flex items-center gap-1.5 ${
                          isDarkScreenshot
                            ? 'bg-gray-700'
                            : 'bg-white border border-gray-300'
                        }`}>
                          <Shield className={`w-2.5 h-2.5 ${isDarkScreenshot ? 'text-green-400' : 'text-green-600'}`} />
                          <span className={`text-[10px] truncate ${isDarkScreenshot ? 'text-gray-400' : 'text-gray-600'}`}>https://deskive.com</span>
                        </div>
                      </div>
                      {/* Browser actions */}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded ${isDarkScreenshot ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                        <div className={`w-3 h-3 rounded ${isDarkScreenshot ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                      </div>
                    </div>

                    {/* Screenshot content */}
                    <motion.div
                      key={`screenshot-${slide.id}`}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className={`relative ${isDarkScreenshot ? 'bg-gray-900' : 'bg-white'}`}
                    >
                      <img
                        src={slide.screenshot}
                        alt={`${slide.title} screenshot`}
                        className="w-[300px] h-[120px] sm:w-[450px] sm:h-[180px] lg:w-[600px] lg:h-[230px]"
                      />
                      {/* Subtle overlay gradient for better blending */}
                      <div className={`absolute inset-0 bg-gradient-to-t pointer-events-none ${
                        isDarkScreenshot ? 'from-gray-900/10' : 'from-white/10'
                      } to-transparent`}></div>
                    </motion.div>
                  </div>

                  {/* Mobile Phone mockup */}
                  {slide.mobileScreenshot && (
                    <motion.div
                      initial={{ opacity: 0, x: 50, y: 20 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 100 }}
                      className="relative -ml-12"
                    >
                      {/* Phone screen - clean design without frame */}
                      <div className="relative w-36 rounded-[1.25rem] overflow-hidden shadow-2xl border border-gray-200">
                        <img
                          src={slide.mobileScreenshot}
                          alt={`${slide.title} mobile screenshot`}
                          className="w-full h-auto object-contain"
                        />
                      </div>

                      {/* Floating badge on mobile */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.7, type: "spring", stiffness: 200 }}
                        className={`absolute -bottom-2 -right-2 ${slide.iconBg} rounded-lg p-2 shadow-lg`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        </div>
      </motion.div>
    );
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-start overflow-hidden pt-0 pb-12"
    >
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-sky-400/20 to-blue-400/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-sky-400/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNCwgMTY1LCAyMzMsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        {/* Slider Container */}
        <div className="relative min-h-[500px] sm:min-h-[550px] flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`slide-${currentSlide}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {renderFeatureSlide(heroSlides[currentSlide])}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {/* Prev Button */}
          <button
            onClick={goToPrevSlide}
            className="p-2 rounded-full bg-white/80 hover:bg-white shadow-lg border border-gray-200 transition-all hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Slide Indicators */}
          <div className="flex gap-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index
                    ? 'w-8 bg-gradient-to-r from-sky-500 to-blue-600'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={goToNextSlide}
            className="p-2 rounded-full bg-white/80 hover:bg-white shadow-lg border border-gray-200 transition-all hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-4">
          <span className="text-sm text-gray-500">
            {currentSlide + 1} / {heroSlides.length}
          </span>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl="https://cdn.deskive.com/deskive/screen-capture.mp4"
      />

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -20px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(20px, 20px) scale(1.05);
          }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
};

export default ModernHero;
