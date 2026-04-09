import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/ui/button';
import { PageSEO } from '../../../components/seo';
import { generateProductSchema } from '../../../schemas/product';
import ModernHeader from '../../../components/landing/ModernHeader';
import ModernFooter from '../../../components/landing/ModernFooter';
import {
  MessageSquare,
  Users,
  Hash,
  Reply,
  Smile,
  Paperclip,
  Search,
  Bell,
  Video,
  Zap,
  Link as LinkIcon,
  ArrowRight,
  Bot,
  Folder,
  TrendingUp,
  Smartphone,
  Sparkles,
  FileText,
  CheckSquare,
  GitMerge,
  Calendar,
  Clock,
  Star,
  Archive,
  Send,
  Mic,
  Image,
  Code,
  BarChart3,
  Workflow,
  MessageCircle,
  Layout,
  Filter,
  Tag,
  BookmarkPlus,
  Download,
  Radio,
  AtSign,
  Copy
} from 'lucide-react';

const ChatProductPage: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  const aiFeatures = [
    {
      icon: Sparkles,
      title: intl.formatMessage({ id: 'productPages.chat.aiFeatures.chatSummary.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.aiFeatures.chatSummary.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Bot,
      title: intl.formatMessage({ id: 'productPages.chat.aiFeatures.smartReplies.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.aiFeatures.smartReplies.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'productPages.chat.aiFeatures.chatToNote.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.aiFeatures.chatToNote.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: CheckSquare,
      title: intl.formatMessage({ id: 'productPages.chat.aiFeatures.chatToTask.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.aiFeatures.chatToTask.description' }),
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: BarChart3,
      title: intl.formatMessage({ id: 'productPages.chat.aiFeatures.sentimentAnalysis.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.aiFeatures.sentimentAnalysis.description' }),
      color: 'from-pink-500 to-rose-600'
    },
    {
      icon: Workflow,
      title: intl.formatMessage({ id: 'productPages.chat.aiFeatures.autoCategorization.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.aiFeatures.autoCategorization.description' }),
      color: 'from-indigo-500 to-blue-600'
    }
  ];

  const advancedFeatures = [
    {
      icon: GitMerge,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.mergeChats.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.mergeChats.description' }),
      highlight: true
    },
    {
      icon: Calendar,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.scheduledMessages.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.scheduledMessages.description' })
    },
    {
      icon: Star,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.pinMessages.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.pinMessages.description' })
    },
    {
      icon: Layout,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.messageTemplates.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.messageTemplates.description' })
    },
    {
      icon: BarChart3,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.pollsSurveys.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.pollsSurveys.description' })
    },
    {
      icon: Send,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.messageForwarding.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.messageForwarding.description' })
    },
    {
      icon: Download,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.chatExport.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.chatExport.description' })
    },
    {
      icon: Archive,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.autoArchive.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.autoArchive.description' })
    },
    {
      icon: BookmarkPlus,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.bookmarks.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.bookmarks.description' })
    },
    {
      icon: Tag,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.tagsLabels.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.tagsLabels.description' })
    },
    {
      icon: Filter,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.advancedFilters.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.advancedFilters.description' })
    },
    {
      icon: Copy,
      title: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.messageThreads.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.advancedFeatures.messageThreads.description' })
    }
  ];

  const collaborationFeatures = [
    {
      icon: Video,
      title: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.screenSharing.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.screenSharing.description' })
    },
    {
      icon: Code,
      title: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.codeSnippets.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.codeSnippets.description' })
    },
    {
      icon: Mic,
      title: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.voiceMessages.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.voiceMessages.description' })
    },
    {
      icon: Image,
      title: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.richMedia.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.richMedia.description' })
    },
    {
      icon: Smile,
      title: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.customEmojis.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.customEmojis.description' })
    },
    {
      icon: Radio,
      title: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.liveTranscription.title' }),
      description: intl.formatMessage({ id: 'productPages.chat.collaborationFeatures.liveTranscription.description' })
    }
  ];

  const coreFeatures = [
    { icon: Hash, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.channels' }) },
    { icon: Users, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.directMessages' }) },
    { icon: Reply, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.threads' }) },
    { icon: Video, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.voiceVideo' }) },
    { icon: Bell, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.notifications' }) },
    { icon: Smile, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.reactions' }) },
    { icon: Search, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.search' }) },
    { icon: Paperclip, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.fileSharing' }) },
    { icon: AtSign, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.mentions' }) },
    { icon: Zap, label: intl.formatMessage({ id: 'productPages.chat.coreFeatures.realtimeSync' }) }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageSEO
        title="Team Chat & Messaging - Real-Time Collaboration"
        description="Powerful team chat with channels, direct messages, threads, and integrations. Stay connected with real-time messaging, file sharing, and video calls."
        keywords={['team chat', 'messaging', 'real-time communication', 'slack alternative', 'chat software', 'team communication']}
        ogImage="/og-images/products/chat.png"
        structuredData={generateProductSchema({
          name: 'Deskive Chat',
          description: 'Powerful team chat with AI-powered features, channels, direct messages, threads, and real-time collaboration.',
          category: 'BusinessApplication',
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/products/chat`,
          features: [
            'AI Chat Summary',
            'Smart Replies',
            'Chat to Task/Note Conversion',
            'Channels & Direct Messages',
            'Message Threads',
            'Voice & Video Calls',
            'File Sharing',
            'Real-time Sync',
          ],
        })}
      />
      <ModernHeader />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 border border-sky-200 rounded-full mb-8"
            >
              <MessageSquare className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.chat.badge' })}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight"
            >
              {intl.formatMessage({ id: 'productPages.chat.title' })}
              <br />
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'productPages.chat.titleHighlight' })}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              {intl.formatMessage({ id: 'productPages.chat.subtitle' })}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-16"
            >
              <Button
                onClick={() => navigate('/auth/register')}
                className="group bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-semibold px-8 py-4 text-sm border-0 rounded-lg hover:scale-105 hover:shadow-xl transition-all duration-300"
              >
                {intl.formatMessage({ id: 'productPages.chat.cta' })}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-gray-500 text-xs mt-3">{intl.formatMessage({ id: 'productPages.shared.freeForever' })} • {intl.formatMessage({ id: 'productPages.shared.noCreditCard' })}</p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* AI-Powered Features Section */}
      <section className="py-24 bg-gradient-to-b from-white to-sky-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-bold text-violet-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.chat.sections.aiSuperpowers' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.chat.sections.aiTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.chat.sections.aiSubtitle' })}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100"
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>

                    {/* Gradient Border on Hover */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity -z-10`}></div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 border border-sky-200 rounded-full mb-4">
                <Zap className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.shared.popular' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.chat.sections.advancedTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.chat.sections.advancedSubtitle' })}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {advancedFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className={`relative bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border-2 transition-all hover:shadow-xl hover:-translate-y-1 group ${
                      feature.highlight
                        ? 'border-sky-300 shadow-lg shadow-sky-100'
                        : 'border-gray-200 hover:border-sky-200'
                    }`}
                  >
                    {feature.highlight && (
                      <div className="absolute -top-3 -right-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        {intl.formatMessage({ id: 'productPages.shared.popular' })}
                      </div>
                    )}
                    <Icon className={`w-10 h-10 mb-4 group-hover:scale-110 transition-transform ${
                      feature.highlight ? 'text-sky-600' : 'text-gray-600'
                    }`} />
                    <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Features Section */}
      <section className="py-24 bg-gradient-to-b from-sky-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-full mb-4">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.shared.mobileApps' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.chat.sections.collaborationTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.chat.sections.collaborationSubtitle' })}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {collaborationFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
                {intl.formatMessage({ id: 'productPages.shared.essentialsTitle' })}
              </h2>
              <p className="text-sm text-gray-600">
                {intl.formatMessage({ id: 'productPages.chat.sections.essentialsSubtitle' })}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {coreFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 text-center hover:border-sky-300 hover:shadow-lg transition-all group"
                  >
                    <Icon className="w-8 h-8 text-sky-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-gray-900 font-semibold text-xs">{feature.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Section */}
      <section className="py-20 bg-gradient-to-br from-sky-50 via-blue-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 border border-sky-200 rounded-full mb-4">
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span className="text-xs font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.shared.mobileApps' })}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  {intl.formatMessage({ id: 'productPages.chat.sections.mobileTitle' })}
                </h2>
                <p className="text-gray-600 mb-8">
                  {intl.formatMessage({ id: 'productPages.chat.sections.mobileSubtitle' })}
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.chat.mobileSection.lightningFastTitle' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.chat.mobileSection.lightningFastDesc' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.chat.mobileSection.uptimeTitle' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.chat.mobileSection.uptimeDesc' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Folder className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.chat.mobileSection.offlineModeTitle' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.chat.mobileSection.offlineModeDesc' })}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative max-w-sm mx-auto"
              >
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=600&fit=crop&q=90"
                    alt="Mobile App"
                    className="rounded-2xl shadow-xl"
                  />
                  <div className="absolute -inset-3 bg-gradient-to-r from-sky-300 to-blue-300 rounded-2xl blur-2xl opacity-30 -z-10"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
};

export default ChatProductPage;
