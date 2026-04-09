/**
 * Terms and Conditions Page
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import { ScrollText, CheckCircle, AlertCircle, Shield, Users } from 'lucide-react';

export default function TermsPage() {
  const intl = useIntl();

  // Define sections with their icons and translation keys
  const sectionsConfig = [
    { icon: CheckCircle, key: 'section1', contentCount: 2 },
    { icon: Users, key: 'section2', contentCount: 4 },
    { icon: Shield, key: 'section3', contentCount: 4 },
    { icon: AlertCircle, key: 'section4', contentCount: 4 },
    { icon: ScrollText, key: 'section5', contentCount: 4 },
    { icon: Shield, key: 'section6', contentCount: 3 },
    { icon: AlertCircle, key: 'section7', contentCount: 2 },
    { icon: CheckCircle, key: 'section8', contentCount: 3 },
    { icon: ScrollText, key: 'section9', contentCount: 4 },
    { icon: Users, key: 'section10', contentCount: 4 },
  ];

  // Build sections array from translation keys
  const sections = sectionsConfig.map(({ icon, key, contentCount }) => ({
    icon,
    title: intl.formatMessage({ id: `legal.terms.sections.${key}.title` }),
    content: Array.from({ length: contentCount }, (_, i) =>
      intl.formatMessage({ id: `legal.terms.sections.${key}.content.${i}` })
    ),
  }));

  return (
    <PublicLayout>
      <PageSEO
        title="Terms of Service - Usage Guidelines"
        description="Read Deskive's terms of service, acceptable use policy, and user agreement. Understand your rights and responsibilities as a Deskive user."
        keywords={['terms of service', 'user agreement', 'terms and conditions', 'legal']}
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
                <ScrollText className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-semibold text-sky-700">{intl.formatMessage({ id: 'legal.terms.badge' })}</span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
                {intl.formatMessage({ id: 'legal.terms.title' }).split('of')[0]}{' '}
                <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 bg-clip-text text-transparent">
                  {intl.formatMessage({ id: 'legal.terms.title' }).split('of').slice(1).join('of')}
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {intl.formatMessage({ id: 'legal.terms.description' })}
              </p>
              <p className="text-sm text-gray-500 mt-6">
                {intl.formatMessage({ id: 'legal.terms.lastUpdated' }, { date: intl.formatDate(new Date('2024-10-17'), { year: 'numeric', month: 'long', day: 'numeric' }) })}
              </p>
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

              {/* Agreement Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mt-16 p-8 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-2xl"
              >
                <h3 className="text-2xl font-black text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'legal.terms.agreement.title' })}
                </h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {intl.formatMessage({ id: 'legal.terms.agreement.description' })}
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-300"
                  >
                    {intl.formatMessage({ id: 'legal.terms.agreement.contactButton' })}
                  </a>
                  <a
                    href="/privacy"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-sky-300 transition-all duration-300"
                  >
                    {intl.formatMessage({ id: 'legal.terms.agreement.privacyButton' })}
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
