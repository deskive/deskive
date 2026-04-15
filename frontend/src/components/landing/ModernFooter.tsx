import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

const ModernFooter: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="flex flex-col items-center text-center gap-5 mb-10 md:mb-12">
          <div
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img
              src="https://cdn.deskive.com/deskive/logo.png"
              alt="Deskive Logo"
              className="w-10 sm:w-12 h-10 sm:h-12 flex-shrink-0 transition-all duration-300 group-hover:scale-110"
            />
            <span className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">
              Deskive
            </span>
          </div>

          <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-md">
            {intl.formatMessage({ id: 'footer.tagline' })}
          </p>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 md:pt-10 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-gray-400 text-xs md:text-sm">
            {intl.formatMessage({ id: 'footer.copyright' }, { year: new Date().getFullYear() })}
          </p>
          <p className="text-gray-400 text-xs md:text-sm">
            A product by{' '}
            <span className="text-white font-semibold">Info Inlet</span>
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
