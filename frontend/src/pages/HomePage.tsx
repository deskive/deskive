/**
 * HomePage Component
 * Main landing page with comprehensive marketing sections
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '../contexts/AuthContext';
import { WorkspaceRedirect } from '../components/workspace/WorkspaceRedirect';
import { PublicLayout } from '../layouts/PublicLayout';
import { PageSEO } from '../components/seo';
import { generateOrganizationSchema } from '../schemas/organization';
import { generateWebsiteSchema } from '../schemas/website';
import ModernHero from '../components/landing/ModernHero-IMPROVED';
import InterconnectedEcosystemSection from '../components/landing/InterconnectedEcosystemSection';
import ModernFeaturesGrid from '../components/landing/ModernFeaturesGrid';
import ModernFAQ from '../components/landing/ModernFAQ';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const intl = useIntl();
  const [scrollProgress, setScrollProgress] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for OAuth callback tokens in URL and redirect to callback handler
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    if (accessToken) {
      // Preserve all query params and redirect to callback page
      navigate(`/auth/callback?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{intl.formatMessage({ id: 'home.loading', defaultMessage: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  // Show homepage for ALL users (both authenticated and unauthenticated)
  return (
    <PublicLayout>
      <PageSEO
        title={intl.formatMessage({ id: 'home.seo.title', defaultMessage: 'All-in-One Workspace Platform' })}
        description={intl.formatMessage({ id: 'home.seo.description', defaultMessage: 'Unite your team with integrated chat, projects, files, calendar, notes, and video calls. Boost productivity with AI-powered collaboration tools. Start free trial.' })}
        keywords={[
          'workspace management',
          'team collaboration',
          'project management',
          'team chat',
          'file sharing',
          'productivity tools',
        ]}
        ogImage="/og_image.png"
        ogType="website"
        structuredData={[
          generateOrganizationSchema(),
          generateWebsiteSchema(),
        ]}
      />
      <main
        className="relative"
        style={{
          background: `inherit`, // Inherit from PublicLayout
        }}
      >
        {/* Scroll Progress Indicator */}
        <motion.div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
            style={{ width: `${scrollProgress}%` }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          />
        </motion.div>

        {/* Hero Section */}
        <ModernHero />

        {/* Interconnected Ecosystem - Shows how all tools, AI, and integrations work together */}
        <InterconnectedEcosystemSection />

        {/* Features Grid Section - ClickUp Style */}
        <ModernFeaturesGrid />

        {/* FAQ Section */}
        <ModernFAQ />

      </main>
    </PublicLayout>
  );
}