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
  FolderOpen,
  Upload,
  Share2,
  History,
  Search,
  Eye,
  Lock,
  Zap,
  Grid,
  ArrowRight,
  Download,
  Link as LinkIcon,
  Tags,
  Cloud,
  Sparkles,
  Bot,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Trash2,
  Copy,
  Move,
  Filter,
  MessageCircle,
  Smartphone,
  RotateCcw,
  Folder,
  List,
  Table,
  CalendarDays,
  MapPin,
  Images,
  Star,
  Pin,
  AlertCircle
} from 'lucide-react';

const FilesProductPage: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const fileViews = [
    {
      icon: Grid,
      title: intl.formatMessage({ id: 'productPages.files.views.grid.title' }),
      description: intl.formatMessage({ id: 'productPages.files.views.grid.description' }),
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: List,
      title: intl.formatMessage({ id: 'productPages.files.views.list.title' }),
      description: intl.formatMessage({ id: 'productPages.files.views.list.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: Images,
      title: intl.formatMessage({ id: 'productPages.files.views.gallery.title' }),
      description: intl.formatMessage({ id: 'productPages.files.views.gallery.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Table,
      title: intl.formatMessage({ id: 'productPages.files.views.table.title' }),
      description: intl.formatMessage({ id: 'productPages.files.views.table.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: CalendarDays,
      title: intl.formatMessage({ id: 'productPages.files.views.timeline.title' }),
      description: intl.formatMessage({ id: 'productPages.files.views.timeline.description' }),
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: Folder,
      title: intl.formatMessage({ id: 'productPages.files.views.tree.title' }),
      description: intl.formatMessage({ id: 'productPages.files.views.tree.description' }),
      color: 'from-pink-500 to-rose-600'
    }
  ];

  const aiFeatures = [
    {
      icon: Sparkles,
      title: intl.formatMessage({ id: 'productPages.files.aiFeatures.fileOrganization.title' }),
      description: intl.formatMessage({ id: 'productPages.files.aiFeatures.fileOrganization.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Bot,
      title: intl.formatMessage({ id: 'productPages.files.aiFeatures.smartTagging.title' }),
      description: intl.formatMessage({ id: 'productPages.files.aiFeatures.smartTagging.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: Search,
      title: intl.formatMessage({ id: 'productPages.files.aiFeatures.semanticSearch.title' }),
      description: intl.formatMessage({ id: 'productPages.files.aiFeatures.semanticSearch.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Image,
      title: intl.formatMessage({ id: 'productPages.files.aiFeatures.imageGeneration.title' }),
      description: intl.formatMessage({ id: 'productPages.files.aiFeatures.imageGeneration.description' }),
      color: 'from-pink-500 to-rose-600'
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'productPages.files.aiFeatures.documentAnalysis.title' }),
      description: intl.formatMessage({ id: 'productPages.files.aiFeatures.documentAnalysis.description' }),
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: AlertCircle,
      title: intl.formatMessage({ id: 'productPages.files.aiFeatures.duplicateDetection.title' }),
      description: intl.formatMessage({ id: 'productPages.files.aiFeatures.duplicateDetection.description' }),
      color: 'from-orange-500 to-amber-600'
    }
  ];

  const advancedFeatures = [
    {
      icon: History,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.versionControl.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.versionControl.description' }),
      highlight: true
    },
    {
      icon: RotateCcw,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.fileRecovery.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.fileRecovery.description' })
    },
    {
      icon: Copy,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.bulkOperations.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.bulkOperations.description' })
    },
    {
      icon: Eye,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.richPreview.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.richPreview.description' })
    },
    {
      icon: Download,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.smartDownload.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.smartDownload.description' })
    },
    {
      icon: LinkIcon,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.shareLinks.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.shareLinks.description' })
    },
    {
      icon: Tags,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.customTags.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.customTags.description' })
    },
    {
      icon: Filter,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.advancedFilters.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.advancedFilters.description' })
    },
    {
      icon: Star,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.favorites.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.favorites.description' })
    },
    {
      icon: Pin,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.pinnedFiles.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.pinnedFiles.description' })
    },
    {
      icon: Video,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.mediaPlayback.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.mediaPlayback.description' })
    },
    {
      icon: Archive,
      title: intl.formatMessage({ id: 'productPages.files.advancedFeatures.fileCompression.title' }),
      description: intl.formatMessage({ id: 'productPages.files.advancedFeatures.fileCompression.description' })
    }
  ];



  const coreFeatures = [
    { icon: FolderOpen, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.folders' }) },
    { icon: Upload, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.multiUpload' }) },
    { icon: History, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.versions' }) },
    { icon: Share2, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.sharing' }) },
    { icon: Eye, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.preview' }) },
    { icon: Search, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.smartSearch' }) },
    { icon: Grid, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.viewModes' }) },
    { icon: Lock, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.security' }) },
    { icon: Download, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.downloads' }) },
    { icon: Tags, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.tags' }) },
    { icon: Cloud, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.cloudSync' }) },
    { icon: Trash2, label: intl.formatMessage({ id: 'productPages.files.coreFeatures.recovery' }) }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageSEO
        title="File Management - Secure Cloud Storage & Sharing"
        description="Store, organize, and share files securely. Version control, advanced search, and seamless collaboration on documents with cloud storage."
        keywords={['file management', 'cloud storage', 'file sharing', 'document management', 'version control', 'secure storage']}
        ogImage="/og-images/products/files.png"
        structuredData={generateProductSchema({
          name: 'Deskive Files',
          description: 'Secure cloud storage with AI-powered organization, version control, rich file previews, and real-time collaboration.',
          category: 'BusinessApplication',
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/products/files`,
          features: [
            'AI File Organization',
            'Smart Tagging',
            'Version Control',
            'File Recovery',
            'Rich Preview (40+ types)',
            'Secure Sharing',
            'Advanced Search',
            'Bulk Operations',
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
              <FolderOpen className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.files.badge' })}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight"
            >
              {intl.formatMessage({ id: 'productPages.files.title' })}
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'productPages.files.titleHighlight' })}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              {intl.formatMessage({ id: 'productPages.files.subtitle' })}
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
                {intl.formatMessage({ id: 'productPages.files.cta' })}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-gray-500 text-xs mt-3">{intl.formatMessage({ id: 'productPages.shared.freeForever' })} • {intl.formatMessage({ id: 'productPages.shared.noCreditCard' })}</p>
            </motion.div>          </div>
        </div>
      </section>

      {/* Multiple File Views */}
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
                <Grid className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wide">Flexible Views</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.files.sections.viewsTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.files.sections.viewsSubtitle' })}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fileViews.map((view, index) => {
                const Icon = view.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100"
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${view.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{view.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{view.description}</p>
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${view.color} opacity-0 group-hover:opacity-10 transition-opacity -z-10`}></div>
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
                <span className="text-sm font-bold text-violet-600 uppercase tracking-wide">AI-Powered</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.files.sections.aiTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.files.sections.aiSubtitle' })}
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
                <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">Power Features</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.files.sections.powerTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.files.sections.powerSubtitle' })}
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
                        Popular
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
                {intl.formatMessage({ id: 'productPages.files.sections.essentialsSubtitle' })}
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
                  {intl.formatMessage({ id: 'productPages.files.sections.mobileTitle' })}
                </h2>
                <p className="text-gray-600 mb-8">
                  {intl.formatMessage({ id: 'productPages.files.sections.mobileSubtitle' })}
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Cloud className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.files.mobile.offlineAccess.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.files.mobile.offlineAccess.description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.files.mobile.cameraUpload.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.files.mobile.cameraUpload.description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.files.mobile.quickShare.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.files.mobile.quickShare.description' })}</p>
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

export default FilesProductPage;
