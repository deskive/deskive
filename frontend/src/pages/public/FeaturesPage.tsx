/**
 * FeaturesPage Component
 * Public page showcasing all Deskive features
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import enMessages from '../../i18n/en.json';
import jaMessages from '../../i18n/ja.json';
import {
  MessageSquare,
  Sparkles,
  Calendar,
  FileText,
  Video,
  BarChart3,
  Users,
  Bot,
  Puzzle,
  FolderOpen,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { FeatureShowcase } from '../../components/landing/FeatureShowcase';
import { Button } from '../../components/ui/button';
import { PageSEO } from '../../components/seo';
import { PublicLayout } from '../../layouts/PublicLayout';

const getFeatures = (intl: ReturnType<typeof useIntl>) => {
  const locale = intl.locale;
  const messages: any = locale === 'ja' ? jaMessages : enMessages;
  const featData = messages?.featuresPage?.features || {};

  return [
    {
      id: 'ai-chat',
      icon: MessageSquare,
      title: featData.aiChat?.title || 'AI-Powered Chat',
      tagline: featData.aiChat?.tagline || 'Smart Communication',
      description: featData.aiChat?.description || '',
      features: featData.aiChat?.features || [],
      color: 'purple' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/3715719c-18fd-41d0-9170-ed30f87f33f7-1768813895118-1768813890335-deskive_ai_bot_in_chat.mp4',
      link: '/features/ai-chat',
    },
    {
      id: 'projects',
      icon: FolderOpen,
      title: featData.projects?.title || 'Project Management',
      tagline: featData.projects?.tagline || 'Organize & Deliver',
      description: featData.projects?.description || '',
      features: featData.projects?.features || [],
      color: 'cyan' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/567da4db-5cb4-4bd7-8c76-848a39136ef0-1768813994968-1768813986300-deskive_project_template.mp4',
      link: '/features/projects',
    },
    {
      id: 'calendar',
      icon: Calendar,
      title: featData.calendar?.title || 'Smart Calendar',
      tagline: featData.calendar?.tagline || 'Schedule Intelligently',
      description: featData.calendar?.description || '',
      features: featData.calendar?.features || [],
      color: 'emerald' as const,
      mediaType: 'image' as const,
      link: '/features/calendar',
    },
    {
      id: 'notes',
      icon: FileText,
      title: featData.notes?.title || 'Collaborative Notes',
      tagline: featData.notes?.tagline || 'Document Together',
      description: featData.notes?.description || '',
      features: featData.notes?.features || [],
      color: 'blue' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/85ef23ae-fe4e-4f20-9306-b7e3c0a84b03-1768813833299-1768813831429-deskive_notes.mp4',
      link: '/features/notes',
    },
    {
      id: 'video-calls',
      icon: Video,
      title: featData.videoCalls?.title || 'Video Conferencing',
      tagline: featData.videoCalls?.tagline || 'Meet Face-to-Face',
      description: featData.videoCalls?.description || '',
      features: featData.videoCalls?.features || [],
      color: 'pink' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/389d91cc-2be2-4c6c-9bcb-a020d12f26ee-1768815405567-1768815401849-deskive_videocall_new.mp4',
      link: '/features/video-calls',
    },
    {
      id: 'teams',
      icon: Users,
      title: featData.teams?.title || 'Team Collaboration',
      tagline: featData.teams?.tagline || 'Work Together',
      description: featData.teams?.description || '',
      features: featData.teams?.features || [],
      color: 'cyan' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/a49766b5-7e80-4541-94b0-e2c1aded22dc-1768815551030-1768815547747-deskive_team_collaboration.mp4',
      link: '/features/teams',
    },
    {
      id: 'tools',
      icon: Sparkles,
      title: featData.tools?.title || 'Collaborative Tools',
      tagline: featData.tools?.tagline || 'Create Together',
      description: featData.tools?.description || '',
      features: featData.tools?.features || [],
      color: 'emerald' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/8176683b-15f8-431f-a56d-cde57cf9301b-1768813961001-1768813954980-deskive_whiteboard.mp4',
      link: '/features/tools',
    },
    {
      id: 'automation',
      icon: Bot,
      title: featData.automation?.title || 'Workflow Automation',
      tagline: featData.automation?.tagline || 'Automate Everything',
      description: featData.automation?.description || '',
      features: featData.automation?.features || [],
      color: 'purple' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/75a64999-bc61-4bd7-9d5b-ff3db2d68036-1768813927980-1768813922627-deskive_automation_ai.mp4',
      link: '/features/automation',
    },
    {
      id: 'integrations',
      icon: Puzzle,
      title: featData.integrations?.title || 'Powerful Integrations',
      tagline: featData.integrations?.tagline || 'Connect Everything',
      description: featData.integrations?.description || '',
      features: featData.integrations?.features || [],
      color: 'blue' as const,
      mediaType: 'video' as const,
      mediaSrc: 'https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/582a0e04-0ff2-4857-b06c-a6831d195bd8-1768813780815-1768813778259-deskive_gmail_oauth.mp4',
      link: '/features/integrations',
    },
  ];
};

export default function FeaturesPage() {
  const location = useLocation();
  const intl = useIntl();

  const features = getFeatures(intl);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <PublicLayout>
      <PageSEO
        title="Features - All-in-One Workspace Platform | Deskive"
        description="Discover all Deskive features: AI Chat, Project Management, Calendar, Notes, Video Calls, Analytics, Automation, and more. Everything your team needs in one place."
        keywords={['workspace features', 'team collaboration', 'project management', 'AI chat', 'video conferencing', 'productivity tools']}
        ogImage="/og-images/features.png"
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-6 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 mb-6"
            >
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {intl.formatMessage({ id: 'featuresPage.hero.badge' })}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              {intl.formatMessage({ id: 'featuresPage.hero.title' })}{' '}
              <span className="bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'featuresPage.hero.titleHighlight' })}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
            >
              {intl.formatMessage({ id: 'featuresPage.hero.subtitle' })}
            </motion.p>
          </div>
        </section>

        {/* Features List */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto space-y-32">
            {features.map((feature, index) => (
              <FeatureShowcase
                key={feature.id}
                id={feature.id}
                icon={feature.icon}
                title={feature.title}
                tagline={feature.tagline}
                description={feature.description}
                features={feature.features}
                color={feature.color}
                direction={index % 2 === 0 ? 'left' : 'right'}
                mediaType={feature.mediaType}
                mediaSrc={feature.mediaSrc}
                index={index}
              />
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="relative p-12 rounded-3xl bg-gradient-to-br from-purple-600 to-cyan-600 text-white overflow-hidden">
              {/* Background pattern */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {intl.formatMessage({ id: 'featuresPage.cta.title' })}
                </h2>
                <p className="text-white/90 mb-8 max-w-xl mx-auto text-lg">
                  {intl.formatMessage({ id: 'featuresPage.cta.subtitle' })}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth/register">
                    <Button
                      size="lg"
                      className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all group"
                    >
                      {intl.formatMessage({ id: 'featuresPage.cta.getStarted' })}
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-2 border-white/50 bg-white/10 hover:bg-white/20 text-white px-8 py-6 text-base font-semibold"
                    >
                      {intl.formatMessage({ id: 'featuresPage.cta.viewPricing' })}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </PublicLayout>
  );
}
