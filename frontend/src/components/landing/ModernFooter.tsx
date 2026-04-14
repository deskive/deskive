import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useIntl } from 'react-intl';

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
    }
  ];

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

                          if (window.location.pathname !== basePath && basePath !== '/') {
                            navigate(link.href);
                          } else {
                            if (window.location.pathname !== '/' && basePath === '/') {
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

        {/* Bottom Section */}
        <div className="pt-8 md:pt-10 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
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
