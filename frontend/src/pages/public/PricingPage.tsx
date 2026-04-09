/**
 * PricingPage Component
 * Dedicated pricing page with comprehensive plan details
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Rocket,
  Building2,
  ArrowRight,
  Star,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { generateFAQSchema } from '../../schemas/faq';
import { getBillingPlans } from '../../services/workspaceService';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface PricingTier {
  name: string;
  price: string;
  yearlyPrice?: string;
  monthlyPriceNum: number;
  yearlyPriceNum: number;
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

// Note: This function needs to be inside the component to access intl
// We'll move it inside the component function below


export default function PricingPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [apiPlans, setApiPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspace } = useWorkspace();

  // Get messages from intl
  const messages = intl.messages as any;

  // Static pricing tiers with translations
  const pricingTiers: PricingTier[] = [
    {
      name: intl.formatMessage({ id: 'pricing.plans.free.name' }),
      price: intl.formatMessage({ id: 'pricing.plans.free.price' }),
      monthlyPriceNum: 0,
      yearlyPriceNum: 0,
      period: intl.formatMessage({ id: 'pricing.plans.free.period' }),
      description: intl.formatMessage({ id: 'pricing.plans.free.description' }),
      icon: Sparkles,
      color: 'from-gray-400 to-gray-600',
      buttonText: intl.formatMessage({ id: 'pricing.plans.free.buttonText' }),
      buttonVariant: 'outline',
      features: messages.pricing?.plans?.free?.features || [],
      notIncluded: messages.pricing?.plans?.free?.notIncluded || []
    },
    {
      name: intl.formatMessage({ id: 'pricing.plans.starter.name' }),
      price: intl.formatMessage({ id: 'pricing.plans.starter.price' }),
      yearlyPrice: intl.formatMessage({ id: 'pricing.plans.starter.yearlyPrice' }),
      monthlyPriceNum: 9.99,
      yearlyPriceNum: 99.99,
      period: intl.formatMessage({ id: 'pricing.plans.starter.period' }),
      description: intl.formatMessage({ id: 'pricing.plans.starter.description' }),
      icon: Zap,
      color: 'from-blue-400 to-cyan-600',
      buttonText: intl.formatMessage({ id: 'pricing.plans.starter.buttonText' }),
      buttonVariant: 'outline',
      features: messages.pricing?.plans?.starter?.features || [],
      notIncluded: messages.pricing?.plans?.starter?.notIncluded || []
    },
    {
      name: intl.formatMessage({ id: 'pricing.plans.professional.name' }),
      price: intl.formatMessage({ id: 'pricing.plans.professional.price' }),
      yearlyPrice: intl.formatMessage({ id: 'pricing.plans.professional.yearlyPrice' }),
      monthlyPriceNum: 19.99,
      yearlyPriceNum: 199.99,
      period: intl.formatMessage({ id: 'pricing.plans.professional.period' }),
      description: intl.formatMessage({ id: 'pricing.plans.professional.description' }),
      icon: Rocket,
      color: 'from-cyan-400 to-teal-600',
      buttonText: intl.formatMessage({ id: 'pricing.plans.professional.buttonText' }),
      highlighted: true,
      badge: intl.formatMessage({ id: 'pricing.plans.professional.badge' }),
      features: messages.pricing?.plans?.professional?.features || []
    },
    {
      name: intl.formatMessage({ id: 'pricing.plans.enterprise.name' }),
      price: intl.formatMessage({ id: 'pricing.plans.enterprise.price' }),
      yearlyPrice: intl.formatMessage({ id: 'pricing.plans.enterprise.yearlyPrice' }),
      monthlyPriceNum: 49.99,
      yearlyPriceNum: 499.99,
      period: intl.formatMessage({ id: 'pricing.plans.enterprise.period' }),
      description: intl.formatMessage({ id: 'pricing.plans.enterprise.description' }),
      icon: Building2,
      color: 'from-purple-400 to-pink-600',
      buttonText: intl.formatMessage({ id: 'pricing.plans.enterprise.buttonText' }),
      buttonVariant: 'outline',
      features: messages.pricing?.plans?.enterprise?.features || []
    }
  ];

  const faqs = messages.pricing?.faq?.questions || [];

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      // If no workspace, show static plans for public pricing page
      if (!currentWorkspace?.id) {
        console.log('[PricingPage] No workspace found, using static plans');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('[PricingPage] Fetching plans for workspace:', currentWorkspace.id);
        const plans = await getBillingPlans(currentWorkspace.id);
        console.log('[PricingPage] Received plans from API:', plans);
        setApiPlans(plans);
      } catch (err: any) {
        console.error('[PricingPage] Failed to fetch billing plans:', err);
        setError(err.message || 'Failed to load pricing plans');
        // Fall back to static plans on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [currentWorkspace?.id]);

  const handleGetStarted = (tierName: string) => {
    navigate('/auth/register');
  };

  // Map API plans to UI format if available
  const displayPlans = React.useMemo(() => {
    if (apiPlans.length > 0) {
      console.log('[PricingPage] Using API plans:', apiPlans.length, 'plans');

      const iconMap: Record<string, React.ElementType> = {
        'Free': Sparkles,
        'Starter': Zap,
        'Professional': Rocket,
        'Enterprise': Building2,
      };

      const colorMap: Record<string, string> = {
        'Free': 'from-gray-400 to-gray-600',
        'Starter': 'from-blue-400 to-cyan-600',
        'Professional': 'from-cyan-400 to-teal-600',
        'Enterprise': 'from-purple-400 to-pink-600',
      };

      return apiPlans.map(plan => {
        // Format price based on billing period
        const monthlyPrice = plan.price === 0 ? '$0' : `$${(plan.price / 100).toFixed(2)}`;
        const yearlyPrice = plan.yearlyPrice ? `$${(plan.yearlyPrice / 100).toFixed(2)}` : undefined;

        const mappedPlan = {
          name: plan.name || 'Unknown',
          price: monthlyPrice,
          yearlyPrice: yearlyPrice,
          monthlyPriceNum: plan.price / 100,
          yearlyPriceNum: plan.yearlyPrice ? plan.yearlyPrice / 100 : 0,
          period: plan.price === 0 ? 'forever' : 'per month',
          description: plan.description || '',
          icon: iconMap[plan.name] || Sparkles,
          color: colorMap[plan.name] || 'from-gray-400 to-gray-600',
          buttonText: 'Get Started',
          highlighted: plan.isPopular || false,
          badge: plan.isPopular ? 'Most Popular' : undefined,
          buttonVariant: (plan.isPopular ? 'default' : 'outline') as 'default' | 'outline',
          features: plan.features || [],
          notIncluded: [],
        };

        console.log('[PricingPage] Mapped plan:', plan.name, mappedPlan);
        return mappedPlan as PricingTier;
      });
    }

    console.log('[PricingPage] Using static plans');
    return pricingTiers;
  }, [apiPlans]);


  return (
    <PublicLayout>
      <PageSEO
        title={intl.formatMessage({ id: 'pricing.meta.title' })}
        description={intl.formatMessage({ id: 'pricing.meta.description' })}
        keywords={intl.formatMessage({ id: 'pricing.meta.keywords' }).split(', ')}
        ogImage="/og-images/pricing.png"
        ogType="website"
        structuredData={generateFAQSchema(faqs)}
      />
      {/* Main Content */}
      <div className="bg-gradient-to-b from-sky-50/50 via-blue-50/30 to-white min-h-screen">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sky-200 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-cyan-200 rounded-full blur-3xl opacity-15"></div>
        </div>

        <div className="relative max-w-7xl mx-auto pt-32 pb-16 px-4">
          {/* Header Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-100 to-blue-100 rounded-full mb-6 border border-sky-200"
            >
              <Star className="w-4 h-4 text-sky-600 fill-sky-600" />
              <span className="text-sm font-semibold text-sky-700">
                {intl.formatMessage({ id: 'pricing.header.badge' })}
              </span>
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
              {intl.formatMessage({ id: 'pricing.header.title' })}{' '}
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'pricing.header.titleHighlight' })}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {intl.formatMessage({ id: 'pricing.header.subtitle' })}<br />
              <span className="text-sky-600 font-semibold">
                {intl.formatMessage({ id: 'pricing.header.subtitleBold' })}
              </span>
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center mb-16"
          >
            <Tabs value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'monthly' | 'yearly')}>
              <TabsList className="bg-white border-2 border-gray-200 shadow-lg p-1.5">
                <TabsTrigger
                  value="monthly"
                  className="text-gray-700 font-semibold px-8 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                >
                  {intl.formatMessage({ id: 'pricing.billing.monthly' })}
                </TabsTrigger>
                <TabsTrigger
                  value="yearly"
                  className="relative text-gray-700 font-semibold px-8 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all"
                >
                  {intl.formatMessage({ id: 'pricing.billing.yearly' })}
                  <Badge className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-xl z-20">
                    {intl.formatMessage({ id: 'pricing.billing.yearlyDiscount' })}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 max-w-4xl mx-auto"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}. {intl.formatMessage({ id: 'pricing.error.text' })}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && currentWorkspace?.id && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-12 h-12 animate-spin text-sky-600 mb-4" />
              <p className="text-gray-600 text-lg">
                {intl.formatMessage({ id: 'pricing.loading.text' })}
              </p>
            </motion.div>
          )}

        {/* Pricing Cards */}
        {!isLoading && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
          >
            {displayPlans.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 + 0.3 }}
              className={tier.highlighted ? 'lg:scale-105 mt-0' : 'mt-6'}
              whileHover={{
                y: -8,
                transition: { duration: 0.3, ease: "easeOut" }
              }}
            >
              <Card className={`relative h-full bg-white border-2 backdrop-blur-sm transform-gpu ${
                tier.highlighted
                  ? 'border-sky-400 shadow-2xl ring-4 ring-sky-200/50 bg-gradient-to-b from-sky-50/50 to-white'
                  : 'border-gray-200 hover:border-sky-300'
              } hover:shadow-2xl transition-all duration-500 overflow-visible group`}>
                  {/* Background gradient effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                  {tier.badge && (
                    <Badge className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-sky-500 via-blue-500 to-sky-500 text-white border-0 shadow-2xl px-5 py-1.5 text-xs font-bold z-50 whitespace-nowrap">
                      ⭐ {tier.badge}
                    </Badge>
                  )}

                  <CardHeader className="pb-6 relative z-10">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} p-3 mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <tier.icon className="w-full h-full text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">{tier.name}</CardTitle>
                    <CardDescription className="text-gray-600 mt-2 leading-relaxed">
                      {tier.description}
                    </CardDescription>
                    <div className="mt-6">
                      {billingPeriod === 'yearly' && tier.yearlyPriceNum > 0 ? (
                        <>
                          <span className="text-5xl font-black text-gray-900 tracking-tight">
                            ${(tier.yearlyPriceNum / 12).toFixed(2)}
                          </span>
                          <span className="text-base text-gray-600 font-semibold ml-2">/mo</span>
                          <p className="text-sm text-gray-500 mt-2">
                            <span className="line-through">${(tier.monthlyPriceNum * 12).toFixed(2)}</span>
                            <span className="ml-2 text-green-600 font-medium">${tier.yearlyPriceNum.toFixed(2)}/year</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-5xl font-black text-gray-900 tracking-tight">
                            {tier.price}
                          </span>
                          {tier.period !== 'forever' && tier.period !== 'contact sales' && (
                            <span className="text-gray-600 ml-2 text-lg font-semibold">/mo</span>
                          )}
                          {tier.period === 'forever' && (
                            <span className="text-gray-600 ml-2 text-lg font-semibold">{tier.period}</span>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pb-6 relative z-10">
                    <ul className="space-y-3.5">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 bg-green-100 rounded-full p-0.5">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          </div>
                          <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                      {tier.notIncluded?.map((feature, i) => (
                        <li key={`not-${i}`} className="flex items-start gap-3 opacity-40">
                          <div className="mt-0.5 bg-gray-100 rounded-full p-0.5">
                            <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                          <span className="text-gray-400 text-sm line-through leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="relative z-10">
                    <Button
                      className={`w-full group font-bold py-6 border-0 transition-all duration-300 shadow-lg hover:shadow-xl ${
                        tier.highlighted
                          ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-sky-500 hover:from-sky-600 hover:via-blue-600 hover:to-sky-600 text-white'
                          : 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white'
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
          </motion.div>
        )}

          {/* FAQ Section */}
          <motion.div
            className="mt-24 pb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-100 to-blue-100 rounded-full mb-6 border border-sky-200"
              >
                <span className="text-sm font-semibold text-sky-700">
                  {intl.formatMessage({ id: 'pricing.faq.badge' })}
                </span>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                {intl.formatMessage({ id: 'pricing.faq.title' })}{' '}
                <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  {intl.formatMessage({ id: 'pricing.faq.titleHighlight' })}
                </span>
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
                {intl.formatMessage({ id: 'pricing.faq.subtitle' })}
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible className="w-full space-y-5">
                {faqs.map((faq: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <AccordionItem
                      value={`item-${index}`}
                      className="group border-0 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      <AccordionTrigger className="text-gray-900 hover:text-sky-600 text-left font-bold text-base md:text-lg px-8 py-6 hover:no-underline data-[state=open]:bg-gradient-to-r data-[state=open]:from-sky-50 data-[state=open]:to-blue-50 transition-all duration-300">
                        <span className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {index + 1}
                          </span>
                          {faq.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 text-base leading-relaxed px-8 pb-6 pt-2">
                        <div className="pl-11 border-l-4 border-sky-200 ml-4">
                          <p className="pl-4">{faq.answer}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>

            {/* Contact CTA */}
            <motion.div
              className="text-center mt-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <p className="text-gray-600 mb-4 text-lg">
                {intl.formatMessage({ id: 'pricing.faq.contact.text' })}
              </p>
              <Button
                className="group bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold px-8 py-6 border-0 hover:scale-105 transition-all duration-300 shadow-lg"
                onClick={() => navigate('/home#contact')}
              >
                {intl.formatMessage({ id: 'pricing.faq.contact.buttonText' })}
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}