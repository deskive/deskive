import React from 'react';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { PageSEO } from '../../../components/seo';
import { generateProductSchema } from '../../../schemas/product';
import ModernHeader from '../../../components/landing/ModernHeader';
import ModernFooter from '../../../components/landing/ModernFooter';
import {
  Video,
  Monitor,
  Mic,
  Users,
  MessageSquare,
  FileText,
  Globe,
  Shield,
  Zap,
  ArrowRight,
  Camera,
  Volume2,
  Settings,
  UserPlus,
  Sparkles,
  Bot,
  Brain,
  Languages,
  Layers,
  Clock,
  Play,
  Pause,
  Square,
  Hand,
  Grid3x3,
  PictureInPicture,
  Presentation,
  Radio,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Headphones,
  Image,
  FileVideo,
  Download
} from 'lucide-react';

const VideoCallsProductPage: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  const meetingTypes = [
    {
      icon: Users,
      title: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.teamMeetings.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.teamMeetings.description' }),
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Presentation,
      title: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.webinars.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.webinars.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: Video,
      title: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.oneOnOne.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.oneOnOne.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Radio,
      title: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.liveStreaming.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.liveStreaming.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Globe,
      title: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.breakoutRooms.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.breakoutRooms.description' }),
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: Calendar,
      title: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.scheduledMeetings.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.scheduledMeetings.description' }),
      color: 'from-pink-500 to-rose-600'
    }
  ];

  const aiFeatures = [
    {
      icon: Sparkles,
      title: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.transcription.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.transcription.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Bot,
      title: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.summaries.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.summaries.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: Brain,
      title: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.highlights.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.highlights.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Languages,
      title: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.translation.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.translation.description' }),
      color: 'from-pink-500 to-rose-600'
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.noteTaking.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.noteTaking.description' }),
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Eye,
      title: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.sentiment.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.sentiment.description' }),
      color: 'from-orange-500 to-amber-600'
    }
  ];

  const advancedFeatures = [
    {
      icon: Monitor,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.screenSharing.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.screenSharing.description' }),
      highlight: true
    },
    {
      icon: FileVideo,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.recording.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.recording.description' })
    },
    {
      icon: Image,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.backgrounds.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.backgrounds.description' })
    },
    {
      icon: Hand,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.reactions.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.reactions.description' })
    },
    {
      icon: Grid3x3,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.galleryView.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.galleryView.description' })
    },
    {
      icon: PictureInPicture,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.picInPic.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.picInPic.description' })
    },
    {
      icon: Lock,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.waitingRooms.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.waitingRooms.description' })
    },
    {
      icon: EyeOff,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.filters.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.filters.description' })
    },
    {
      icon: Volume2,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.noiseCancellation.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.noiseCancellation.description' })
    },
    {
      icon: Layers,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.whiteboard.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.whiteboard.description' })
    },
    {
      icon: Download,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.export.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.export.description' })
    },
    {
      icon: Settings,
      title: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.controls.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.controls.description' })
    }
  ];

  const collaborationFeatures = [
    {
      icon: MessageSquare,
      title: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.chat.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.chat.description' })
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.notes.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.notes.description' })
    },
    {
      icon: Users,
      title: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.coHosts.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.coHosts.description' })
    },
    {
      icon: Presentation,
      title: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.polls.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.polls.description' })
    },
    {
      icon: Clock,
      title: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.timer.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.timer.description' })
    },
    {
      icon: UserPlus,
      title: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.guestAccess.title' }),
      description: intl.formatMessage({ id: 'productPages.videoCalls.collaborationFeatures.guestAccess.description' })
    }
  ];

  const coreFeatures = [
    { icon: Video, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.hdVideo' }) },
    { icon: Monitor, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.screenShare' }) },
    { icon: Mic, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.recording' }) },
    { icon: Camera, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.backgrounds' }) },
    { icon: MessageSquare, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.chat' }) },
    { icon: Globe, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.breakoutRooms' }) },
    { icon: FileText, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.transcription' }) },
    { icon: Shield, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.security' }) },
    { icon: Zap, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.quickJoin' }) },
    { icon: Volume2, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.audioControls' }) },
    { icon: Settings, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.hostControls' }) },
    { icon: UserPlus, label: intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.guestInvite' }) }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageSEO
        title={intl.formatMessage({ id: 'productPages.videoCalls.meta.title' })}
        description={intl.formatMessage({ id: 'productPages.videoCalls.meta.description' })}
        keywords={['video calls', 'video conferencing', 'zoom alternative', 'screen sharing', 'online meetings', 'webinars']}
        ogImage="/og-images/products/video-calls.png"
        structuredData={generateProductSchema({
          name: 'Deskive Video Calls',
          description: intl.formatMessage({ id: 'productPages.videoCalls.meta.description' }),
          category: 'BusinessApplication',
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/products/video-calls`,
          features: [
            intl.formatMessage({ id: 'productPages.videoCalls.coreFeatures.hdVideo' }),
            intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.transcription.title' }),
            intl.formatMessage({ id: 'productPages.videoCalls.aiFeatures.summaries.title' }),
            intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.screenSharing.title' }),
            intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.recording.title' }),
            intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.breakoutRooms.title' }),
            intl.formatMessage({ id: 'productPages.videoCalls.advancedFeatures.backgrounds.title' }),
            intl.formatMessage({ id: 'productPages.videoCalls.meetingTypes.liveStreaming.title' }),
          ],
        })}
      />
      <ModernHeader />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-sky-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 border border-sky-200 rounded-full mb-6"
            >
              <Video className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.videoCalls.badge' })}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight"
            >
              {intl.formatMessage({ id: 'productPages.videoCalls.title' })}
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'productPages.videoCalls.titleHighlight' })}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              {intl.formatMessage({ id: 'productPages.videoCalls.subtitle' })}
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
                {intl.formatMessage({ id: 'productPages.videoCalls.cta' })}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-gray-500 text-xs mt-3">{intl.formatMessage({ id: 'productPages.shared.freeForever' })} • {intl.formatMessage({ id: 'productPages.shared.noCreditCard' })}</p>
            </motion.div>          </div>
        </div>
      </section>

      {/* Meeting Types */}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-200 rounded-full mb-4">
                <Video className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.videoCalls.sections.meetingTypesTitle' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.meetingTypesTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.meetingTypesSubtitle' })}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetingTypes.map((type, index) => {
                const Icon = type.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100"
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${type.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{type.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{type.description}</p>
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 transition-opacity -z-10`}></div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Features */}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 border border-violet-200 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-bold text-violet-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.videoCalls.sections.aiTitle' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.aiTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.aiSubtitle' })}
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
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity -z-10`}></div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features */}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 border border-sky-200 rounded-full mb-4">
                <Zap className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.videoCalls.sections.powerTitle' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.powerTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.powerSubtitle' })}
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

      {/* Collaboration Features */}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-full mb-4">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.videoCalls.sections.collaborationTitle' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.collaborationTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.collaborationSubtitle' })}
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
                    className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all group border border-gray-100"
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
      <section className="py-20 bg-gradient-to-b from-sky-50 to-white">
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
                {intl.formatMessage({ id: 'productPages.videoCalls.sections.essentialsSubtitle' })}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {coreFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 text-center hover:border-sky-300 hover:shadow-lg transition-all group"
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
      <section className="py-20 bg-white">
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
                  {intl.formatMessage({ id: 'productPages.videoCalls.sections.mobileTitle' })}
                </h2>
                <p className="text-gray-600 mb-8">
                  {intl.formatMessage({ id: 'productPages.videoCalls.sections.mobileSubtitle' })}
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-sky-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.videoCalls.mobile.hdCalls.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.videoCalls.mobile.hdCalls.description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-sky-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.videoCalls.mobile.audioOnly.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.videoCalls.mobile.audioOnly.description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-sky-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.videoCalls.mobile.oneTapJoin.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.videoCalls.mobile.oneTapJoin.description' })}</p>
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

export default VideoCallsProductPage;
