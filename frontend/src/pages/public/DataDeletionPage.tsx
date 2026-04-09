/**
 * Data Deletion Page
 * Information about account and data deletion process
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PageSEO } from '../../components/seo';
import {
  Trash2,
  AlertCircle,
  Database,
  Clock,
  Shield,
  CheckCircle,
  ArrowRight,
  FileText,
  MessageSquare,
  Calendar,
  Video,
  Image,
  Users,
  Settings
} from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function DataDeletionPage() {
  const intl = useIntl();
  const navigate = useNavigate();

  const deletedDataTypes = [
    {
      icon: Users,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.profile.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.profile.description' })
    },
    {
      icon: MessageSquare,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.messages.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.messages.description' })
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.files.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.files.description' })
    },
    {
      icon: Calendar,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.calendar.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.calendar.description' })
    },
    {
      icon: Video,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.videos.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.videos.description' })
    },
    {
      icon: Image,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.media.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.media.description' })
    },
    {
      icon: Database,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.workspaces.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.workspaces.description' })
    },
    {
      icon: Settings,
      title: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.preferences.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.preferences.description' })
    }
  ];

  const deletionSteps = [
    {
      number: '1',
      title: intl.formatMessage({ id: 'legal.dataDeletion.process.step1.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.process.step1.description' })
    },
    {
      number: '2',
      title: intl.formatMessage({ id: 'legal.dataDeletion.process.step2.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.process.step2.description' })
    },
    {
      number: '3',
      title: intl.formatMessage({ id: 'legal.dataDeletion.process.step3.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.process.step3.description' })
    },
    {
      number: '4',
      title: intl.formatMessage({ id: 'legal.dataDeletion.process.step4.title' }),
      description: intl.formatMessage({ id: 'legal.dataDeletion.process.step4.description' })
    }
  ];

  return (
    <PublicLayout>
      <PageSEO
        title="Account & Data Deletion - Your Data, Your Control"
        description="Learn how to delete your Deskive account and all associated data. GDPR compliant permanent data removal process."
        keywords={['data deletion', 'account deletion', 'GDPR', 'right to be forgotten', 'data removal']}
      />
      <div className="bg-gradient-to-b from-red-50/30 via-orange-50/20 to-white min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-72 h-72 bg-red-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-orange-100 rounded-full mb-6 border border-red-200"
              >
                <Shield className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">
                  {intl.formatMessage({ id: 'legal.dataDeletion.badge' })}
                </span>
              </motion.div>

              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
                {intl.formatMessage({ id: 'legal.dataDeletion.title' }).split(' ').slice(0, 2).join(' ')}{' '}
                <span className="bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  {intl.formatMessage({ id: 'legal.dataDeletion.title' }).split(' ').slice(2).join(' ')}
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {intl.formatMessage({ id: 'legal.dataDeletion.description' })}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-8 text-white"
            >
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-black mb-3">
                    {intl.formatMessage({ id: 'legal.dataDeletion.warning.title' })}
                  </h2>
                  <p className="text-white/90 leading-relaxed mb-4">
                    {intl.formatMessage({ id: 'legal.dataDeletion.warning.description' })}
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {intl.formatMessage({ id: 'legal.dataDeletion.warning.item1' })}
                    </li>
                    <li className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      {intl.formatMessage({ id: 'legal.dataDeletion.warning.item2' })}
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {intl.formatMessage({ id: 'legal.dataDeletion.warning.item3' })}
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* What Gets Deleted */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.title' })}
                </h2>
                <p className="text-lg text-gray-600">
                  {intl.formatMessage({ id: 'legal.dataDeletion.whatDeleted.description' })}
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {deletedDataTypes.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Deletion Process */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'legal.dataDeletion.process.title' })}
                </h2>
                <p className="text-lg text-gray-600">
                  {intl.formatMessage({ id: 'legal.dataDeletion.process.description' })}
                </p>
              </motion.div>

              <div className="space-y-8">
                {deletionSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex gap-6 items-start"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-xl">
                      {step.number}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                      <p className="text-gray-700 leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 border-2 border-gray-200"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                      {intl.formatMessage({ id: 'legal.dataDeletion.timeline.title' })}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {intl.formatMessage({ id: 'legal.dataDeletion.timeline.description' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pl-16">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'legal.dataDeletion.timeline.immediate.title' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {intl.formatMessage({ id: 'legal.dataDeletion.timeline.immediate.description' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'legal.dataDeletion.timeline.days30.title' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {intl.formatMessage({ id: 'legal.dataDeletion.timeline.days30.description' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">
                        {intl.formatMessage({ id: 'legal.dataDeletion.timeline.days90.title' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {intl.formatMessage({ id: 'legal.dataDeletion.timeline.days90.description' })}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
                  {intl.formatMessage({ id: 'legal.dataDeletion.cta.title' })}
                </h2>
                <p className="text-lg text-gray-300 mb-8">
                  {intl.formatMessage({ id: 'legal.dataDeletion.cta.description' })}
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button
                    onClick={() => navigate('/auth/login')}
                    size="lg"
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                  >
                    {intl.formatMessage({ id: 'legal.dataDeletion.cta.deleteButton' })}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => navigate('/privacy')}
                    variant="outline"
                    size="lg"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-semibold"
                  >
                    {intl.formatMessage({ id: 'legal.dataDeletion.cta.privacyButton' })}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8"
              >
                <h3 className="text-2xl font-black text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'legal.dataDeletion.contact.title' })}
                </h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {intl.formatMessage({ id: 'legal.dataDeletion.contact.description' })}
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href="mailto:privacy@deskive.com"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300"
                  >
                    {intl.formatMessage({ id: 'legal.dataDeletion.contact.emailButton' })}
                  </a>
                  <a
                    href="/terms"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border-2 border-gray-200 hover:border-red-300 transition-all duration-300"
                  >
                    {intl.formatMessage({ id: 'legal.dataDeletion.contact.termsButton' })}
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
