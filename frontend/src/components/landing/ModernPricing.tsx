import React, { useState } from 'react';
import { Check, Sparkles, Zap, Rocket, Building2, X, ArrowRight, Gift, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import enMessages from '../../i18n/en.json';
import jaMessages from '../../i18n/ja.json';

interface PricingTier {
  name: string;
  price: string;
  originalPrice?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  period: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  highlighted?: boolean;
  badge?: string;
  icon: React.ElementType;
  color: string;
  buttonText: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
}

const ModernPricing: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleGetStarted = (tierName: string) => {
    if (tierName === 'Enterprise' || tierName === 'エンタープライズ') {
      // Scroll to contact section
      const contactElement = document.getElementById('contact');
      if (contactElement) {
        contactElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/auth/register');
    }
  };

  const locale = intl.locale;
  const messages: any = locale === 'ja' ? jaMessages : enMessages;
  const pricingData = messages?.pricing || {};

  const pricingTiers: PricingTier[] = [
    {
      name: pricingData.free?.name || 'Free',
      price: '$0',
      monthlyPrice: 0,
      yearlyPrice: 0,
      period: isAnnual ? 'per year' : 'per month',
      description: pricingData.free?.description || 'Perfect for individuals and small teams getting started',
      icon: Sparkles,
      color: 'from-gray-400 to-gray-600',
      buttonText: pricingData.free?.cta || 'Get Started Free',
      buttonVariant: 'outline',
      features: pricingData.free?.features || [
        '5 team members',
        '1 GB storage',
        'Basic chat & messaging',
        'Basic file sharing',
        'Mobile app access',
        'Community support'
      ],
      notIncluded: [
        'Advanced integrations',
        'Priority support',
        'Custom branding'
      ]
    },
    {
      name: pricingData.starter?.name || 'Starter',
      price: isAnnual ? '$99.99' : '$9.99',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      period: isAnnual ? 'per year' : 'per month',
      description: pricingData.starter?.description || 'Ideal for growing teams that need more power',
      icon: Zap,
      color: 'from-blue-500 to-cyan-500',
      buttonText: pricingData.starter?.cta || 'Start 14-Day Trial',
      buttonVariant: 'outline',
      features: pricingData.starter?.features || [
        '25 team members',
        '25 GB storage',
        'Advanced chat with threads',
        'Video calls (up to 10 participants)',
        'Project management tools',
        'Calendar integration',
        'Email support',
        'API access'
      ],
      notIncluded: [
        'SSO authentication',
        'Advanced security'
      ]
    },
    {
      name: pricingData.professional?.name || 'Professional',
      price: isAnnual ? '$199.99' : '$19.99',
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      period: isAnnual ? 'per year' : 'per month',
      description: pricingData.professional?.description || 'Complete solution for professional teams',
      icon: Rocket,
      color: 'from-sky-500 to-blue-600',
      buttonText: pricingData.professional?.cta || 'Start 14-Day Trial',
      highlighted: true,
      badge: pricingData.professional?.badge || 'Most Popular',
      features: pricingData.professional?.features || [
        '100 team members',
        '100 GB storage',
        'Unlimited video calls',
        'Advanced project management',
        'AI-powered features',
        'Custom integrations',
        'Advanced analytics',
        'Priority support',
        '99.9% uptime SLA'
      ]
    },
    {
      name: pricingData.enterprise?.name || 'Enterprise',
      price: isAnnual ? '$499.99' : '$49.99',
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      period: isAnnual ? 'per year' : 'per month',
      description: pricingData.enterprise?.description || 'Tailored solutions for large organizations',
      icon: Building2,
      color: 'from-purple-500 to-indigo-600',
      buttonText: pricingData.enterprise?.cta || 'Contact Sales',
      buttonVariant: 'outline',
      features: pricingData.enterprise?.features || [
        'Unlimited team members',
        '1 TB+ storage',
        'Enterprise SSO (SAML)',
        'Advanced security & compliance',
        'Custom AI training',
        'Dedicated account manager',
        '24/7 phone support',
        'On-premise option',
        'Custom SLA'
      ]
    }
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Promotional Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden">
              {/* Sparkle decorations */}
              <div className="absolute top-2 left-4">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
              </div>
              <div className="absolute top-6 right-8">
                <Star className="w-3 h-3 text-yellow-300 fill-yellow-300 animate-pulse delay-300" />
              </div>
              <div className="absolute bottom-4 left-12">
                <Star className="w-3 h-3 text-yellow-300 fill-yellow-300 animate-pulse delay-500" />
              </div>
              <div className="absolute bottom-6 right-16">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse delay-700" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-3">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium uppercase tracking-wide">{pricingData.banner?.title || 'Limited Time Offer'}</p>
                    <h3 className="text-white text-xl md:text-2xl font-bold">
                      {pricingData.banner?.subtitle || 'Get 2 Months Free with Annual Plans'}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-400 text-yellow-900 border-0 text-sm font-bold px-4 py-1.5">
                    🎉 Best Value
                  </Badge>
                </div>
              </div>
              <p className="text-white/80 text-center mt-3 text-sm md:text-base">
                Join thousands of teams already using Deskive. Start free, upgrade anytime.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">
            {pricingData.title || 'Simple Pricing'}
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            {pricingData.heading || 'Choose Your'}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">Plan</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {pricingData.subtitle || 'Start free and scale as you grow. No hidden fees, no surprises.'}
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={`text-sm font-medium ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
            {pricingData.monthly || 'Monthly'}
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              isAnnual ? 'bg-sky-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                isAnnual ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
            {pricingData.annual || 'Annual'}
          </span>
          {isAnnual && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              {pricingData.twoMonthsFree || '2 months free'}
            </Badge>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={tier.highlighted ? 'lg:-mt-4 lg:mb-4' : ''}
            >
              <Card className={`relative h-full bg-white border-2 transition-all duration-300 hover:shadow-xl ${
                tier.highlighted
                  ? 'border-sky-500 shadow-lg shadow-sky-500/20'
                  : 'border-gray-200 hover:border-sky-300'
              }`}>
                {tier.badge && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-sky-500 to-blue-600 text-white border-0 shadow-lg">
                    {tier.badge}
                  </Badge>
                )}

                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${tier.color} p-2.5 mb-4 shadow-lg`}>
                    <tier.icon className="w-full h-full text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">{tier.name}</CardTitle>
                  <CardDescription className="text-gray-600 mt-2 min-h-[48px]">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-4">
                    {isAnnual && tier.monthlyPrice > 0 ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-gray-900">
                            ${(tier.monthlyPrice * 0.83).toFixed(2)}
                          </span>
                          <span className="text-gray-500 text-sm">/mo</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          <span className="line-through">${tier.monthlyPrice.toFixed(2)}/mo</span>
                          <span className="ml-2 text-green-600 font-medium">Save 17%</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-gray-900">${tier.monthlyPrice.toFixed(2)}</span>
                          <span className="text-gray-500 text-sm">/mo</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pb-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Check className="w-5 h-5 text-sky-500" />
                        </div>
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                    {tier.notIncluded?.map((feature, i) => (
                      <li key={`not-${i}`} className="flex items-start gap-3 opacity-50">
                        <div className="flex-shrink-0 mt-0.5">
                          <X className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-gray-500 text-sm line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full group font-semibold transition-all duration-300 ${
                      tier.highlighted
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                        : 'bg-gray-900 hover:bg-gray-800 text-white hover:scale-[1.02]'
                    }`}
                    onClick={() => handleGetStarted(tier.name)}
                  >
                    {tier.buttonText}
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm mb-4">{pricingData.trust?.title || 'Trusted by teams worldwide'}</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-400">
            {(pricingData.trust?.features || ['14-day free trial', 'No credit card required', 'Cancel anytime']).map((feature: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ModernPricing;
export { ModernPricing };
