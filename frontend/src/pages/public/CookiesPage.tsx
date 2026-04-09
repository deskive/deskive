/**
 * Cookie Policy Page
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { Cookie, Shield, Eye, Settings, Bell, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

export default function CookiesPage() {
  const intl = useIntl();
  const sections = [
    {
      icon: Cookie,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section1.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.6' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section1.content.7' }),
      ]
    },
    {
      icon: CheckCircle,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section2.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section2.content.6' }),
      ]
    },
    {
      icon: Settings,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section3.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.6' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.7' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section3.content.8' }),
      ]
    },
    {
      icon: Eye,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section4.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.6' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.7' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.8' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.9' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.10' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section4.content.11' }),
      ]
    },
    {
      icon: Bell,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section5.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.6' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.7' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.8' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.9' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section5.content.10' }),
      ]
    },
    {
      icon: Globe,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section6.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section6.content.6' }),
      ]
    },
    {
      icon: Settings,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section7.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.6' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section7.content.7' }),
      ]
    },
    {
      icon: Shield,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section8.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.5' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.6' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section8.content.7' }),
      ]
    },
    {
      icon: AlertCircle,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section9.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section9.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section9.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section9.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section9.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section9.content.4' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section9.content.5' }),
      ]
    },
    {
      icon: Cookie,
      title: intl.formatMessage({ id: 'legal.cookies.sections.section10.title' }),
      content: [
        intl.formatMessage({ id: 'legal.cookies.sections.section10.content.0' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section10.content.1' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section10.content.2' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section10.content.3' }),
        intl.formatMessage({ id: 'legal.cookies.sections.section10.content.4' }),
      ]
    },
  ];

  const cookieTypes = [
    {
      name: intl.formatMessage({ id: 'legal.cookies.cookieTypes.essential.name' }),
      badge: intl.formatMessage({ id: 'legal.cookies.cookieTypes.essential.badge' }),
      badgeColor: 'bg-red-500',
      description: intl.formatMessage({ id: 'legal.cookies.cookieTypes.essential.description' }),
      retention: intl.formatMessage({ id: 'legal.cookies.cookieTypes.essential.retention' })
    },
    {
      name: intl.formatMessage({ id: 'legal.cookies.cookieTypes.functional.name' }),
      badge: intl.formatMessage({ id: 'legal.cookies.cookieTypes.functional.badge' }),
      badgeColor: 'bg-blue-500',
      description: intl.formatMessage({ id: 'legal.cookies.cookieTypes.functional.description' }),
      retention: intl.formatMessage({ id: 'legal.cookies.cookieTypes.functional.retention' })
    },
    {
      name: intl.formatMessage({ id: 'legal.cookies.cookieTypes.analytics.name' }),
      badge: intl.formatMessage({ id: 'legal.cookies.cookieTypes.analytics.badge' }),
      badgeColor: 'bg-green-500',
      description: intl.formatMessage({ id: 'legal.cookies.cookieTypes.analytics.description' }),
      retention: intl.formatMessage({ id: 'legal.cookies.cookieTypes.analytics.retention' })
    },
    {
      name: intl.formatMessage({ id: 'legal.cookies.cookieTypes.marketing.name' }),
      badge: intl.formatMessage({ id: 'legal.cookies.cookieTypes.marketing.badge' }),
      badgeColor: 'bg-purple-500',
      description: intl.formatMessage({ id: 'legal.cookies.cookieTypes.marketing.description' }),
      retention: intl.formatMessage({ id: 'legal.cookies.cookieTypes.marketing.retention' })
    },
  ];

  return (
    <PublicLayout>
      <PageSEO
        title="Cookie Policy - How We Use Cookies"
        description="Understand how Deskive uses cookies to improve your experience. Manage your cookie preferences and learn about our cookie policy."
        keywords={['cookie policy', 'cookies', 'tracking', 'privacy']}
      />
      <div className="bg-gradient-to-b from-sky-50/50 via-blue-50/30 to-white min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-sky-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-100 to-blue-100 rounded-full mb-6 border border-sky-200"
              >
                <Cookie className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-semibold text-sky-700">{intl.formatMessage({ id: 'legal.cookies.badge' })}</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
                {intl.formatMessage({ id: 'legal.cookies.title' }).split(' ')[0]}{' '}
                <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 bg-clip-text text-transparent">
                  {intl.formatMessage({ id: 'legal.cookies.title' }).split(' ').slice(1).join(' ')}
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {intl.formatMessage({ id: 'legal.cookies.description' })}
              </p>
              <p className="text-sm text-gray-500 mt-6">
                {intl.formatMessage({ id: 'legal.cookies.lastUpdated' }, { date: intl.formatDate(new Date('2024-10-17'), { year: 'numeric', month: 'long', day: 'numeric' }) })}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Cookie Types Quick Reference */}
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">{intl.formatMessage({ id: 'legal.cookies.glance.title' })}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {cookieTypes.map((type, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-sky-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{type.name}</h3>
                      <Badge className={`${type.badgeColor} text-white text-xs`}>
                        {type.badge}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Retention:</span> {type.retention}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="mb-12 bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-sky-200 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">
                        {section.title}
                      </h2>
                    </div>
                    <div className="space-y-4 pl-0 md:pl-16">
                      {section.content.map((paragraph, pIndex) => (
                        <p key={pIndex} className="text-gray-700 leading-relaxed text-base">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                );
              })}

              {/* Important Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mt-16 p-8 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-2xl"
              >
                <h3 className="text-2xl font-black text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'legal.cookies.controlSection.title' })}
                </h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {intl.formatMessage({ id: 'legal.cookies.controlSection.description' })}
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="/privacy"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-300"
                  >
                    {intl.formatMessage({ id: 'legal.cookies.controlSection.privacyButton' })}
                  </a>
                  <a
                    href="/terms"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-sky-300 transition-all duration-300"
                  >
                    {intl.formatMessage({ id: 'legal.cookies.controlSection.termsButton' })}
                  </a>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
