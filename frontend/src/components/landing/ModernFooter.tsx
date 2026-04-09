import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Linkedin,
  Facebook,
  ArrowRight,
  Github,
  Sparkles
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { FaXTwitter } from 'react-icons/fa6';
import { SITE_CONFIG } from '../../lib/config';

interface FooterLink {
  label: string;
  href: string;
  isHash?: boolean;
  isExternal?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const ModernFooter: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [email, setEmail] = useState('');

  const footerSections: FooterSection[] = [
    {
      title: intl.formatMessage({ id: 'footer.sections.products' }),
      links: [
        { label: intl.formatMessage({ id: 'footer.products.chat' }), href: '/products/chat' },
        { label: intl.formatMessage({ id: 'footer.products.projects' }), href: '/products/projects' },
        { label: intl.formatMessage({ id: 'footer.products.files' }), href: '/products/files' },
        { label: intl.formatMessage({ id: 'footer.products.calendar' }), href: '/products/calendar' },
        { label: intl.formatMessage({ id: 'footer.products.notes' }), href: '/products/notes' },
        { label: intl.formatMessage({ id: 'footer.products.videoCalls' }), href: '/products/video-calls' },
      ]
    },
    {
      title: intl.formatMessage({ id: 'footer.sections.company' }),
      links: [
        { label: intl.formatMessage({ id: 'footer.company.pricing' }), href: '/#pricing', isHash: true },
        { label: intl.formatMessage({ id: 'footer.company.faq', defaultMessage: 'FAQ' }), href: '/#faq', isHash: true },
        { label: intl.formatMessage({ id: 'footer.company.contact' }), href: '/#contact', isHash: true },
        { label: intl.formatMessage({ id: 'footer.company.support', defaultMessage: 'Support' }), href: '/support' },
      ]
    },
    {
      title: intl.formatMessage({ id: 'footer.sections.legal' }),
      links: [
        { label: intl.formatMessage({ id: 'footer.legal.privacy' }), href: '/privacy' },
        { label: intl.formatMessage({ id: 'footer.legal.terms' }), href: '/terms' },
        { label: intl.formatMessage({ id: 'footer.legal.cookies' }), href: '/cookies' },
        { label: intl.formatMessage({ id: 'footer.legal.dataDeletion' }), href: '/data-deletion' },
        { label: intl.formatMessage({ id: 'footer.legal.sitemap' }), href: '/sitemap.xml', isExternal: true },
      ]
    }
  ];

  const socialLinks: Array<{ icon: any; href: string; label: string }> = [
    { icon: FaXTwitter, href: SITE_CONFIG.social.twitter, label: 'X' },
    { icon: Facebook, href: SITE_CONFIG.social.facebook, label: 'Facebook' },
    // { icon: Linkedin, href: SITE_CONFIG.social.linkedin, label: 'LinkedIn' },
    // { icon: Github, href: SITE_CONFIG.social.github, label: 'GitHub' }
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribe:', email);
    setEmail('');
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 lg:gap-12 mb-12 md:mb-16">
          {/* Logo and Description */}
          <div className="lg:col-span-2 space-y-6">
            <div
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <img
                src="https://cdn.deskive.com/deskive/logo.png"
                alt="Deskive Logo"
                className="w-10 sm:w-12 h-10 sm:h-12 flex-shrink-0 transition-all duration-300 group-hover:scale-110"
              />
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">
                  Deskive
                </span>
                <div className="flex items-center">
                  {/* BETA Badge */}
                  <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-gradient-to-r from-blue-500 to-sky-500 rounded-md sm:rounded-lg relative shadow-lg">
                    <Sparkles className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 w-2 sm:w-3 h-2 sm:h-3 text-yellow-300 fill-yellow-300" />
                    <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-wide whitespace-nowrap">
                      {intl.formatMessage({ id: 'footer.beta' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-400 text-sm md:text-base max-w-sm leading-relaxed">
              {intl.formatMessage({ id: 'footer.tagline' })}
            </p>

            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gradient-to-br hover:from-sky-500 hover:to-blue-600 hover:text-white transition-all duration-300"
                    aria-label={social.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-white font-bold text-base md:text-lg">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-colors duration-300 text-sm md:text-base inline-block"
                      >
                        {link.label}
                      </a>
                    ) : link.isHash ? (
                      <a
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          const hash = link.href.split('#')[1];
                          const basePath = link.href.split('#')[0] || '/';

                          // If we're on a different page, navigate first then scroll
                          if (window.location.pathname !== basePath && basePath !== '/') {
                            navigate(link.href);
                          } else {
                            // Same page or home page - just scroll to element
                            if (window.location.pathname !== '/' && basePath === '/') {
                              // Navigate to home first, then scroll
                              navigate('/');
                              setTimeout(() => {
                                const element = document.getElementById(hash);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth' });
                                }
                              }, 100);
                            } else {
                              const element = document.getElementById(hash);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth' });
                              }
                            }
                          }
                        }}
                        className="text-gray-400 hover:text-white transition-colors duration-300 text-sm md:text-base inline-block cursor-pointer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        onClick={() => window.scrollTo(0, 0)}
                        className="text-gray-400 hover:text-white transition-colors duration-300 text-sm md:text-base inline-block"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="py-10 md:py-12 border-y border-gray-800">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-bold text-white">
                {intl.formatMessage({ id: 'footer.newsletter.title' })}
              </h3>
              <p className="text-gray-400 text-sm md:text-base">
                {intl.formatMessage({ id: 'footer.newsletter.description' })}
              </p>
            </div>
            <div className="flex items-center">
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'footer.newsletter.placeholder' })}
                  required
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm md:text-base"
                />
                <button
                  type="submit"
                  className="group px-5 md:px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-xl border-0 hover:scale-105 transition-all duration-300 flex items-center justify-center whitespace-nowrap text-sm md:text-base"
                >
                  {intl.formatMessage({ id: 'footer.newsletter.button' })}
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 md:pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-gray-400 text-xs md:text-sm">
            {intl.formatMessage({ id: 'footer.copyright' }, { year: new Date().getFullYear() })}
          </p>
          <p className="text-gray-400 text-xs md:text-sm">
            {intl.formatMessage({ id: 'footer.madeWith' })}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ModernFooter;
export { ModernFooter };
