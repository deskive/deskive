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
  Kanban,
  Calendar as CalendarIcon,
  Clock,
  BarChart3,
  Users,
  Target,
  CheckSquare,
  TrendingUp,
  Layers,
  ArrowRight,
  ListTodo,
  Workflow,
  GitBranch,
  Zap,
  Sparkles,
  Bot,
  FileText,
  AlertTriangle,
  Copy,
  Table,
  List,
  GanttChartSquare,
  Milestone,
  Settings,
  Filter,
  Tag,
  Boxes,
  FolderKanban,
  MessageCircle,
  Upload,
  GitCompare,
  Smartphone,
  Share2,
  Archive
} from 'lucide-react';

const ProjectsProductPage: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();

  const projectViews = [
    {
      icon: Kanban,
      title: intl.formatMessage({ id: 'productPages.projects.views.kanban.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.views.kanban.description' }),
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: List,
      title: intl.formatMessage({ id: 'productPages.projects.views.list.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.views.list.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: CalendarIcon,
      title: intl.formatMessage({ id: 'productPages.projects.views.calendar.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.views.calendar.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: GanttChartSquare,
      title: intl.formatMessage({ id: 'productPages.projects.views.gantt.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.views.gantt.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Table,
      title: intl.formatMessage({ id: 'productPages.projects.views.table.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.views.table.description' }),
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: Boxes,
      title: intl.formatMessage({ id: 'productPages.projects.views.portfolio.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.views.portfolio.description' }),
      color: 'from-pink-500 to-rose-600'
    }
  ];


  const advancedFeatures = [
    {
      icon: GitBranch,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.dependencies.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.dependencies.description' }),
      highlight: true
    },
    {
      icon: Milestone,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.milestones.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.milestones.description' })
    },
    {
      icon: Settings,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.customFields.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.customFields.description' })
    },
    {
      icon: Workflow,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.automations.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.automations.description' })
    },
    {
      icon: Copy,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.templates.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.templates.description' })
    },
    {
      icon: Tag,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.labelsAndTags.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.labelsAndTags.description' })
    },
    {
      icon: Clock,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.timeTracking.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.timeTracking.description' })
    },
    {
      icon: Filter,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.advancedFilters.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.advancedFilters.description' })
    },
    {
      icon: Share2,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.subtasks.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.subtasks.description' })
    },
    {
      icon: Archive,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.baselineTracking.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.baselineTracking.description' })
    },
    {
      icon: Upload,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.fileAttachments.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.fileAttachments.description' })
    },
    {
      icon: ListTodo,
      title: intl.formatMessage({ id: 'productPages.projects.advanced.checklists.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.advanced.checklists.description' })
    }
  ];

  const aiFeatures = [
    {
      icon: Sparkles,
      title: intl.formatMessage({ id: 'productPages.projects.ai.projectPlanning.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.ai.projectPlanning.description' }),
      color: 'from-violet-500 to-purple-600'
    },
    {
      icon: Bot,
      title: intl.formatMessage({ id: 'productPages.projects.ai.smartScheduling.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.ai.smartScheduling.description' }),
      color: 'from-sky-500 to-blue-600'
    },
    {
      icon: AlertTriangle,
      title: intl.formatMessage({ id: 'productPages.projects.ai.riskDetection.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.ai.riskDetection.description' }),
      color: 'from-red-500 to-orange-600'
    },
    {
      icon: TrendingUp,
      title: intl.formatMessage({ id: 'productPages.projects.ai.predictiveAnalytics.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.ai.predictiveAnalytics.description' }),
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'productPages.projects.ai.autoDocumentation.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.ai.autoDocumentation.description' }),
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: Users,
      title: intl.formatMessage({ id: 'productPages.projects.ai.resourceOptimization.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.ai.resourceOptimization.description' }),
      color: 'from-pink-500 to-rose-600'
    }
  ];



  const collaborationFeatures = [
    {
      icon: MessageCircle,
      title: intl.formatMessage({ id: 'productPages.projects.collaboration.taskComments.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.collaboration.taskComments.description' })
    },
    {
      icon: Users,
      title: intl.formatMessage({ id: 'productPages.projects.collaboration.teamCollaboration.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.collaboration.teamCollaboration.description' })
    },
    {
      icon: Share2,
      title: intl.formatMessage({ id: 'productPages.projects.collaboration.guestAccess.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.collaboration.guestAccess.description' })
    },
    {
      icon: Zap,
      title: intl.formatMessage({ id: 'productPages.projects.collaboration.realtimeUpdates.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.collaboration.realtimeUpdates.description' })
    },
    {
      icon: FileText,
      title: intl.formatMessage({ id: 'productPages.projects.collaboration.docsIntegration.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.collaboration.docsIntegration.description' })
    },
    {
      icon: GitCompare,
      title: intl.formatMessage({ id: 'productPages.projects.collaboration.versionHistory.title' }),
      description: intl.formatMessage({ id: 'productPages.projects.collaboration.versionHistory.description' })
    }
  ];

  const coreFeatures = [
    { icon: Kanban, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.kanbanBoards' }) },
    { icon: GanttChartSquare, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.ganttCharts' }) },
    { icon: Target, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.sprintPlanning' }) },
    { icon: CheckSquare, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.taskManagement' }) },
    { icon: Clock, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.timeTracking' }) },
    { icon: BarChart3, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.analytics' }) },
    { icon: Users, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.teamCollaboration' }) },
    { icon: Workflow, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.automation' }) },
    { icon: GitBranch, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.dependencies' }) },
    { icon: Milestone, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.milestones' }) },
    { icon: Settings, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.customFields' }) },
    { icon: Copy, label: intl.formatMessage({ id: 'productPages.projects.coreFeatures.templates' }) }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageSEO
        title={intl.formatMessage({ id: 'productPages.projects.meta.title' })}
        description={intl.formatMessage({ id: 'productPages.projects.meta.description' })}
        keywords={['project management', 'kanban board', 'task management', 'gantt chart', 'sprint planning', 'agile tools']}
        ogImage="/og-images/products/projects.png"
        structuredData={generateProductSchema({
          name: 'Deskive Projects',
          description: 'Powerful project management with Kanban boards, Gantt charts, AI planning, sprint management, and real-time collaboration.',
          category: 'BusinessApplication',
          url: `${typeof window !== 'undefined' ? window.location.origin : ''}/products/projects`,
          features: [
            'Kanban Boards',
            'Gantt Timeline',
            'AI Project Planning',
            'Sprint Management',
            'Task Dependencies',
            'Time Tracking',
            'Custom Fields',
            'Team Collaboration',
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
              <Kanban className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.projects.badge' })}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4 leading-tight"
            >
              {intl.formatMessage({ id: 'productPages.projects.title' })}
              <br />
              <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'productPages.projects.titleHighlight' })}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base md:text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              {intl.formatMessage({ id: 'productPages.projects.subtitle' })}
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
                {intl.formatMessage({ id: 'productPages.projects.cta' })}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-gray-500 text-xs mt-3">{intl.formatMessage({ id: 'productPages.shared.freeForever' })} • {intl.formatMessage({ id: 'productPages.shared.noCreditCard' })}</p>
            </motion.div>          </div>
        </div>
      </section>

      {/* Multiple Project Views */}
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
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.projects.sections.flexibleViews' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.projects.sections.viewsTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.projects.sections.viewsSubtitle' })}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectViews.map((view, index) => {
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
                <span className="text-sm font-bold text-violet-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.projects.sections.aiPowered' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.projects.sections.aiTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.projects.sections.aiSubtitle' })}
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
                <Layers className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.projects.sections.powerFeatures' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.projects.sections.powerTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.projects.sections.powerSubtitle' })}
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 border border-pink-200 rounded-full mb-4">
                <MessageCircle className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-bold text-pink-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.projects.sections.collaboration' })}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                {intl.formatMessage({ id: 'productPages.projects.sections.collaborationTitle' })}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {intl.formatMessage({ id: 'productPages.projects.sections.collaborationSubtitle' })}
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
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
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
                {intl.formatMessage({ id: 'productPages.projects.sections.essentialsTitle' })}
              </h2>
              <p className="text-sm text-gray-600">
                {intl.formatMessage({ id: 'productPages.projects.sections.essentialsSubtitle' })}
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
                  <span className="text-xs font-bold text-sky-600 uppercase tracking-wide">{intl.formatMessage({ id: 'productPages.projects.sections.mobileApps' })}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">
                  {intl.formatMessage({ id: 'productPages.projects.sections.mobileTitle' })}
                </h2>
                <p className="text-gray-600 mb-8">
                  {intl.formatMessage({ id: 'productPages.projects.sections.mobileSubtitle' })}
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.projects.mobile.offlineMode.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.projects.mobile.offlineMode.description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.projects.mobile.quickTaskEntry.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.projects.mobile.quickTaskEntry.description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{intl.formatMessage({ id: 'productPages.projects.mobile.timeTracking.title' })}</h3>
                      <p className="text-sm text-gray-600">{intl.formatMessage({ id: 'productPages.projects.mobile.timeTracking.description' })}</p>
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

export default ProjectsProductPage;
