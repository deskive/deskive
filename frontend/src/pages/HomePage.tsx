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
import ComparisonTable from '../components/landing/ComparisonTable';
import UseCasesSection from '../components/landing/UseCasesSection';
import WorkBrokenSection from '../components/landing/WorkBrokenSection';
import InterconnectedEcosystemSection from '../components/landing/InterconnectedEcosystemSection';
import ModuleExplorerSection from '../components/landing/ModuleExplorerSection';
import ModernFeaturesGrid from '../components/landing/ModernFeaturesGrid';
import ModernCTA from '../components/landing/ModernCTA';
import ModernPricing from '../components/landing/ModernPricing';
import ModernFAQ from '../components/landing/ModernFAQ';
import ModernContact from '../components/landing/ModernContact';
import BlogSection from '../components/landing/BlogSection';

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

        {/* Six Tools Section - Every team needs these six tools */}
        <WorkBrokenSection />

        {/* Module Explorer Section - Interactive feature showcase */}
        <ModuleExplorerSection />

        {/* Comparison Table - Deskive vs Competitors */}
        <ComparisonTable />

        {/* Use Cases Section - ClickUp Style */}
        <UseCasesSection />

        {/* Features Grid Section - ClickUp Style */}
        <ModernFeaturesGrid />

        {/* Blog Section */}
        <BlogSection />

        {/* Pricing Section */}
        <ModernPricing />

        {/* CTA Section */}
        <ModernCTA />

        {/* FAQ Section */}
        <ModernFAQ />

        {/* Contact Section */}
        <ModernContact />

        {/* Floating App Store Badges - Combined Image with Clickable Areas */}
        <div className="fixed top-20 right-1 z-50 w-[180px]">
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 70 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <img
              src="https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/404be2d1-1bee-4031-a47d-14184c9db869-1769158484257-1769158483418-240_F_386668700_EmK1sLisBQmWe6pLv4o67UYQLXULFUAJ-removebg-preview.png"
              alt="Download on App Store and Google Play"
              className="w-full h-auto drop-shadow-lg rounded-lg"
            />
            {/* Invisible clickable areas - App Store is BOTTOM, Google Play is TOP */}
            <a
              href="https://apps.apple.com/ae/app/deskive-ai-team-workspace/id6756350570"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-0 left-0 w-full h-[50%] cursor-pointer"
              aria-label="Download on App Store"
            />
            <a
              href="https://play.google.com/store/apps/details?id=com.deskive.app&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-0 left-0 w-full h-[50%] cursor-pointer"
              aria-label="Get it on Google Play"
            />
          </motion.div>
        </div>
      </main>
    </PublicLayout>
  );
}