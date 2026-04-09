import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useIntl, FormattedMessage } from 'react-intl';

const ModernCTA: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const intl = useIntl();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      navigate('/auth/register');
    }
  };

  // Get features from locale
  const getFeatures = () => {
    const en = ['Free 14-day trial', 'No credit card required', 'Cancel anytime', 'Setup in 5 minutes'];
    const ja = ['14日間無料トライアル', 'クレジットカード不要', 'いつでもキャンセル可能', '5分でセットアップ'];
    const locale = intl.locale === 'ja' ? ja : en;
    return locale;
  };

  const benefits = getFeatures();

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          className="w-full h-full"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Main Content */}
          <div className="text-center space-y-8">
            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900"
            >
              <FormattedMessage id="cta.readyToStart.title" />
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            >
              <FormattedMessage id="cta.readyToStart.subtitle" />
            </motion.p>

            {/* CTA Button */}
            {!isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="pt-8 md:pt-10"
              >
                <Button
                  className="group bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold border-0 hover:scale-105 transition-all duration-300 text-base md:text-lg px-6 md:px-8 py-3 md:py-4 h-auto"
                  onClick={handleGetStarted}
                >
                  <FormattedMessage id="cta.readyToStart.button" />
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            )}

            {/* Benefits List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-wrap items-center justify-center gap-6 pt-6"
            >
              {benefits.map((benefit, index) => (
                <div
                  key={benefit}
                  className="flex items-center gap-2 text-gray-700"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModernCTA;
