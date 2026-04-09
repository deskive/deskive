import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import WorkflowBranching from './WorkflowBranching';
import { Button } from '../ui/button';
import {
  MessageSquare,
  Calendar,
  FolderOpen,
  Kanban,
  Video,
  FileText,
  Brain,
  BarChart3,
  Search,
  CheckSquare,
  Users,
  Bell,
  Target,
  Clock,
  Settings,
  PieChart,
  TrendingUp,
  Link,
  Tag,
  List,
  Table,
  GitBranch,
  Workflow,
  Headphones,
  Mail,
  Copy,
  Edit3,
  UserPlus,
  ArrowRight
} from 'lucide-react';

const ModernFeaturesGrid: React.FC = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  // Refs for viewport detection
  const featuresGridRef = useRef(null);

  // Track if sections are in viewport
  const isFeaturesInView = useInView(featuresGridRef, { once: false, amount: 0.2 });

  // Auto-cycle through features randomly - only when features grid is in viewport
  useEffect(() => {
    if (!isFeaturesInView) return;

    const interval = setInterval(() => {
      // Pick a random feature index
      const randomIndex = Math.floor(Math.random() * features.length);
      setActiveFeatureIndex(randomIndex);
    }, 1500); // Change every 1.5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFeaturesInView]);

  // All features organized in a grid - 5 rows x 6 columns (all same size)
  const features = [
    // Row 1
    { icon: CheckSquare, label: intl.formatMessage({ id: 'featuresGrid.tasks' }) },
    { icon: Kanban, label: intl.formatMessage({ id: 'featuresGrid.kanbanBoards' }) },
    { icon: FileText, label: intl.formatMessage({ id: 'featuresGrid.docs' }) },
    { icon: Brain, label: intl.formatMessage({ id: 'featuresGrid.aiAssistant' }) },
    { icon: Calendar, label: intl.formatMessage({ id: 'featuresGrid.calendar' }) },
    { icon: MessageSquare, label: intl.formatMessage({ id: 'featuresGrid.chat' }) },

    // Row 2
    { icon: Video, label: intl.formatMessage({ id: 'featuresGrid.videoCalls' }) },
    { icon: FolderOpen, label: intl.formatMessage({ id: 'featuresGrid.files' }) },
    { icon: Kanban, label: intl.formatMessage({ id: 'featuresGrid.projects' }) },
    { icon: BarChart3, label: intl.formatMessage({ id: 'featuresGrid.reporting' }) },
    { icon: Target, label: intl.formatMessage({ id: 'featuresGrid.goals' }) },
    { icon: Workflow, label: intl.formatMessage({ id: 'featuresGrid.automations' }) },

    // Row 3
    { icon: Settings, label: intl.formatMessage({ id: 'featuresGrid.customFields' }) },
    { icon: Clock, label: intl.formatMessage({ id: 'featuresGrid.timeTracking' }) },
    { icon: PieChart, label: intl.formatMessage({ id: 'featuresGrid.dashboards' }) },
    { icon: List, label: intl.formatMessage({ id: 'featuresGrid.forms' }) },
    { icon: Bell, label: intl.formatMessage({ id: 'featuresGrid.reminders' }) },
    { icon: MessageSquare, label: intl.formatMessage({ id: 'featuresGrid.collaboration' }) },

    // Row 4
    { icon: Link, label: intl.formatMessage({ id: 'featuresGrid.integrations' }) },
    { icon: Search, label: intl.formatMessage({ id: 'featuresGrid.smartSearch' }) },
    { icon: TrendingUp, label: intl.formatMessage({ id: 'featuresGrid.ganttCharts' }) },
    { icon: Tag, label: intl.formatMessage({ id: 'featuresGrid.tags' }) },
    { icon: Mail, label: intl.formatMessage({ id: 'featuresGrid.emails' }) },
    { icon: Edit3, label: intl.formatMessage({ id: 'featuresGrid.proofing' }) },

    // Row 5
    { icon: Copy, label: intl.formatMessage({ id: 'featuresGrid.templates' }) },
    { icon: UserPlus, label: intl.formatMessage({ id: 'featuresGrid.guests' }) },
    { icon: Headphones, label: intl.formatMessage({ id: 'featuresGrid.support24_7' }) },
    { icon: Users, label: intl.formatMessage({ id: 'featuresGrid.teams' }) },
    { icon: GitBranch, label: intl.formatMessage({ id: 'featuresGrid.roadmaps' }) },
    { icon: Table, label: intl.formatMessage({ id: 'featuresGrid.spreadsheets' }) },
  ];

  return (
    <section id="features-grid" className="mt-20 pt-32 md:pt-40 pb-20 md:pb-32 relative overflow-hidden bg-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: `
              linear-gradient(rgba(168, 85, 247, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(168, 85, 247, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Animated Workflow Interconnection */}
        <WorkflowBranching />


        {/* Header */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="text-sky-600 font-semibold text-sm uppercase tracking-wider mb-4 block">
              {intl.formatMessage({ id: 'featureHighlights.badge' })}
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              {intl.formatMessage({ id: 'featureHighlights.title' })}
              <br />
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                {intl.formatMessage({ id: 'featureHighlights.titleHighlight' })}
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {intl.formatMessage({ id: 'featureHighlights.subtitle' })}
            </p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          ref={featuresGridRef}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 auto-rows-auto"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isActive = activeFeatureIndex === index;

            return (
              <motion.div
                key={`${feature.label}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.02 }}
                viewport={{ once: true }}
                animate={{
                  scale: isActive ? 1.08 : 1,
                  y: isActive ? -3 : 0,
                }}
                className={`group relative bg-white rounded-xl p-4 border-2 transition-all duration-300 cursor-pointer col-span-1 ${
                  isActive
                    ? 'border-sky-500 shadow-xl'
                    : 'border-gray-200 hover:border-sky-300 hover:shadow-lg'
                }`}
              >
                {/* Normal Card */}
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <motion.div
                    animate={{
                      backgroundColor: isActive ? 'rgb(14, 165, 233)' : 'rgb(243, 244, 246)',
                    }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 transition-colors"
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-600 group-hover:text-sky-600'
                      }`}
                    />
                  </motion.div>
                  <span
                    className={`font-medium text-xs leading-tight transition-colors ${
                      isActive ? 'text-sky-600 font-bold' : 'text-gray-700 group-hover:text-gray-900'
                    }`}
                  >
                    {feature.label}
                  </span>
                </div>

                {/* Active Gradient Effect */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 pointer-events-none"
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
};

export default ModernFeaturesGrid;
