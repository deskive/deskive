import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  MessageSquare,
  FileText,
  Kanban,
  CheckSquare,
  Calendar,
  BarChart3,
  ArrowRight,
  Zap,
  Share2
} from 'lucide-react';

const WorkflowBranching: React.FC = () => {
  const intl = useIntl();
  const [activeConnection, setActiveConnection] = useState(0);
  const workflowRef = useRef(null);
  const isWorkflowInView = useInView(workflowRef, { once: false, amount: 0.3 });

  // Define workflow nodes - using a network graph layout
  // Card width is 160px in a 1200px container = 13.3%
  const cardWidth = 13.3; // percentage of container width

  const nodes = [
    {
      id: 'chat',
      icon: MessageSquare,
      label: intl.formatMessage({ id: 'featuresGrid.chat' }),
      description: intl.formatMessage({ id: 'interconnectedEcosystem.modules.chat.desc' }),
      color: 'from-blue-500 to-cyan-500',
      content: {
        type: 'chat',
        messages: [
          { author: 'Sarah', text: 'We need analytics!', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
          { author: 'Mike', text: 'Let\'s build', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' }
        ],
        action: intl.formatMessage({ id: 'smartTools.content.shareToNotesProjects' })
      },
      x: 10,
      y: 50
    },
    {
      id: 'notes',
      icon: FileText,
      label: intl.formatMessage({ id: 'interconnectedEcosystem.modules.notes.name' }),
      description: intl.formatMessage({ id: 'smartTools.features.fromChat' }),
      color: 'from-sky-500 to-blue-500',
      content: {
        type: 'note',
        title: 'Note Title',
        items: [
          'User analytics',
          'Activity timeline',
        ],
        source: 'From Chat'
      },
      x: 35,
      y: 20
    },
    {
      id: 'projects',
      icon: Kanban,
      label: intl.formatMessage({ id: 'interconnectedEcosystem.modules.projects.name' }),
      description: intl.formatMessage({ id: 'smartTools.features.fromChat' }),
      color: 'from-orange-500 to-red-500',
      content: {
        type: 'project',
        name: 'Dashboard v2.0',
        status: intl.formatMessage({ id: 'smartTools.content.inProgress' }),
        team: 3,
        source: intl.formatMessage({ id: 'smartTools.features.fromChat' })
      },
      x: 35,
      y: 70
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      label: intl.formatMessage({ id: 'featuresGrid.tasks' }),
      description: intl.formatMessage({ id: 'smartTools.features.breakDownWork' }),
      color: 'from-green-500 to-emerald-500',
      content: {
        type: 'tasks',
        tasks: [
          { name: 'Design mockups', done: true },
          { name: 'Build components', done: false },
        ],
        source: 'From Notes & Project'
      },
      x: 62,
      y: 22
    },
    {
      id: 'calendar',
      icon: Calendar,
      label: intl.formatMessage({ id: 'featuresGrid.calendar' }),
      description: intl.formatMessage({ id: 'interconnectedEcosystem.modules.calendar.desc' }),
      color: 'from-amber-500 to-yellow-500',
      content: {
        type: 'calendar',
        event: 'Dashboard Launch',
        date: 'Friday, Dec 22',
        attendees: 5,
        source: 'From Project'
      },
      x: 62,
      y: 65
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: intl.formatMessage({ id: 'featuresGrid.reporting' }),
      description: intl.formatMessage({ id: 'hero.slides.analytics.features.smartAnalytics' }),
      color: 'from-sky-500 to-blue-600',
      content: {
        type: 'report',
        metrics: [
          { label: 'Progress', value: '65%' },
          { label: 'Velocity', value: '+12%' }
        ],
        insight: 'On track! 🎉',
        source: 'From Tasks & Calendar'
      },
      x: 88,
      y: 50
    }
  ];

  // Define connections - showing workflow
  const connections = [
    { from: 'chat', to: 'notes', label: intl.formatMessage({ id: 'smartTools.connections.share' }), color: '#0EA5E9', type: 'forward' },
    { from: 'chat', to: 'projects', label: intl.formatMessage({ id: 'smartTools.connections.create' }), color: '#06B6D4', type: 'forward' },
    { from: 'notes', to: 'tasks', label: intl.formatMessage({ id: 'smartTools.connections.convert' }), color: '#10B981', type: 'forward' },
    { from: 'projects', to: 'tasks', label: intl.formatMessage({ id: 'smartTools.connections.assign' }), color: '#22C55E', type: 'forward' },
    { from: 'projects', to: 'calendar', label: intl.formatMessage({ id: 'smartTools.connections.schedule' }), color: '#F59E0B', type: 'forward' },
    { from: 'tasks', to: 'analytics', label: intl.formatMessage({ id: 'smartTools.connections.track' }), color: '#3B82F6', type: 'forward' },
    { from: 'calendar', to: 'analytics', label: intl.formatMessage({ id: 'smartTools.connections.monitor' }), color: '#0EA5E9', type: 'forward' },

    // Reverse connections
    { from: 'notes', to: 'projects', label: intl.formatMessage({ id: 'smartTools.connections.update' }), color: '#F97316', type: 'reverse' }
  ];

  // Auto-cycle through connections
  useEffect(() => {
    if (!isWorkflowInView) return;
    const interval = setInterval(() => {
      setActiveConnection((prev) => (prev + 1) % connections.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isWorkflowInView, connections.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="pb-20 bg-gradient-to-b from-white via-sky-50/30 to-white relative overflow-hidden mb-40"
    >


      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <span className="text-sky-600 font-semibold text-sm uppercase tracking-wider mb-4 block">
          {intl.formatMessage({ id: 'smartTools.badge' })}
        </span>
        <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {intl.formatMessage({ id: 'smartTools.title' })}{' '}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            {intl.formatMessage({ id: 'smartTools.titleHighlight' })}
          </span>
        </h3>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {intl.formatMessage({ id: 'smartTools.subtitle' })}
        </p>
      </div>

      {/* Desktop Network Visualization */}
      <div ref={workflowRef} className="relative max-w-6xl mx-auto" style={{ height: '600px' }}>
        {/* SVG Layer for Arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            {/* Arrow markers */}
            {connections.map((conn, idx) => (
              <React.Fragment key={`arrow-${idx}`}>
                <marker
                  id={`arrowhead-${idx}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" fill={conn.color} />
                </marker>
                <marker
                  id={`arrowhead-inactive-${idx}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 0, 8 4, 0 8" fill="#D1D5DB" />
                </marker>
              </React.Fragment>
            ))}
          </defs>

          {/* Draw connection lines */}
          {connections.map((conn, index) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const isActive = index === activeConnection;
            const isReverse = conn.type === 'reverse';

            // Get container dimensions
            const container = workflowRef.current;
            if (!container) return null;

            const containerWidth = 1152; // max-w-6xl ≈ 1152px
            const containerHeight = 600;

            // Calculate pixel positions from card edges
            // For reverse connections going left, start from inside the card to avoid edge cutting
            const fromEdgeAdjust = (isReverse && fromNode.x > toNode.x) ? -10 : 0;

            const fromXPx = (fromNode.x / 100) * containerWidth + (160 / 2) + fromEdgeAdjust;
            const fromYPx = (fromNode.y / 100) * containerHeight;
            const toXPx = (toNode.x / 100) * containerWidth - (160 / 2);
            const toYPx = (toNode.y / 100) * containerHeight;

            let pathD;

            const dx = toXPx - fromXPx;
            const dy = toYPx - fromYPx;

            // Add offset for reverse connections to avoid overlap
            const yOffset = isReverse ? 20 : 0;

            // If nodes are roughly on same Y level (±5%), use straight line
            if (Math.abs(dy) < containerHeight * 0.05) {
              pathD = `M ${fromXPx} ${fromYPx + yOffset} L ${toXPx} ${toYPx + yOffset}`;
            }
            // If vertical distance is large, use curved line
            else {
              const controlOffset = isReverse ? Math.abs(dx) * 0.6 : Math.abs(dx) * 0.4;
              pathD = `M ${fromXPx} ${fromYPx + yOffset} C ${fromXPx + controlOffset} ${fromYPx + yOffset}, ${toXPx - controlOffset} ${toYPx + yOffset}, ${toXPx} ${toYPx + yOffset}`;
            }

            return (
              <g key={index}>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={isActive ? conn.color : '#D1D5DB'}
                  strokeWidth={isActive ? 2.5 : 2}
                  strokeDasharray={isReverse ? '8,4' : 'none'}
                  markerEnd={isActive ? `url(#arrowhead-${index})` : `url(#arrowhead-inactive-${index})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    opacity: isReverse ? 0.7 : 1
                  }}
                  transition={{
                    pathLength: { duration: 0.8, ease: 'easeInOut' },
                    opacity: { duration: 0.3 }
                  }}
                />

                {/* Animated dot */}
                {isActive && (
                  <motion.circle
                    r="4"
                    fill={conn.color}
                  >
                    <animateMotion
                      dur={isReverse ? "3s" : "2.5s"}
                      repeatCount="indefinite"
                      path={pathD}
                    />
                  </motion.circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node, index) => {
          const Icon = node.icon;
          const nodeConnections = connections.filter(
            c => c.from === node.id || c.to === node.id
          );
          const isNodeActive = nodeConnections.some((_, idx) =>
            connections.findIndex(c => c === _) === activeConnection
          );

          return (
            <motion.div
              key={node.id}
              className="absolute"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                width: '160px'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: isNodeActive ? 1.08 : 1
              }}
              transition={{
                duration: 0.3,
                delay: index * 0.1
              }}
            >
              <div className={`bg-white rounded-xl p-3 border-2 shadow-xl transition-all duration-300 ${
                isNodeActive ? 'border-sky-500 shadow-sky-300' : 'border-gray-200 shadow-lg'
              }`}>
                <div className="flex flex-col items-center text-center gap-1.5">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${node.color} flex items-center justify-center shadow-lg relative`}>
                    <Icon className="w-6 h-6 text-white" />
                    {isNodeActive && (
                      <motion.div
                        className="absolute -top-1 -right-1"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Zap className="w-5 h-5 text-sky-500 drop-shadow-lg" fill="currentColor" />
                      </motion.div>
                    )}
                  </div>

                  {/* Label */}
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 mb-0.5">
                      {node.label}
                    </h4>
                    <p className="text-[10px] text-gray-600">
                      {node.description}
                    </p>
                  </div>

                  {/* Active Content Preview */}
                  {isNodeActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="w-full space-y-1"
                    >
                      {/* Content Display */}
                      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg px-2 py-1.5 border border-sky-200">
                        {node.content.type === 'chat' && (
                          <div className="space-y-1">
                            {(node.content.messages || []).map((msg: any, idx: number) => (
                              <div key={idx} className="bg-white/70 rounded px-1.5 py-0.5 flex flex-row gap-1">
                                <img
                                  src={msg.avatar}
                                  alt={msg.author}
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                />
                                <div className="flex flex-col items-start">
                                  <span className="text-[7px] font-bold text-blue-700 block leading-tight">{msg.author}:</span>
                                  <p className="text-[8px] text-gray-800 leading-tight text-start">{msg.text}</p>
                                </div>
                              </div>
                            ))}
                            <div className="text-center pt-1 border-t border-sky-200 mt-1">
                              <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-md px-1.5 py-1 shadow-md inline-flex items-center gap-0.5 animate-pulse">
                                <Share2 className="w-2 h-2" />
                                <p className="text-[7px] font-bold">{node.content.action}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {node.content.type === 'note' && (
                          <div className="space-y-1">
                            {/* Created From Badge */}
                            <div className="flex items-center gap-0.5 bg-blue-100 px-1.5 py-0.5 rounded-full mb-1">
                              <MessageSquare className="w-2 h-2 text-blue-600" />
                              <ArrowRight className="w-2 h-2 text-blue-600" />
                              <FileText className="w-2 h-2 text-sky-600" />
                              <span className="text-[7px] text-blue-700 font-semibold ml-0.5">{intl.formatMessage({ id: 'smartTools.content.createdFromChat' })}</span>
                            </div>

                            {/* Note Content - Document Style */}
                            <div className="bg-white/90 rounded border border-sky-200 px-1.5 py-1 space-y-1">
                              {/* Note Header */}
                              <div className="flex items-center gap-1 pb-0.5 border-b border-sky-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                                <p className="text-[9px] text-sky-900 font-bold">{node.content.title}</p>
                              </div>

                              {/* Note Items */}
                              <div className="space-y-0.5">
                                {(node.content.items || []).map((item: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-1 bg-sky-50/50 rounded px-1 py-0.5">
                                    <span className="text-[7px] text-sky-600 font-bold mt-[1px]">{idx + 1}.</span>
                                    <span className="text-[8px] text-gray-800 flex-1">{item}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Author Info */}
                              <div className="flex items-center gap-1 pt-0.5 border-t border-sky-100">
                                <img
                                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                                  alt="Sarah"
                                  className="w-2.5 h-2.5 rounded-full"
                                />
                                <span className="text-[7px] text-gray-600">Created by Sarah</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {node.content.type === 'project' && (
                          <div className="space-y-1">
                            {/* Created From Badge */}
                            <div className="flex items-center gap-0.5 bg-blue-100 px-1.5 py-0.5 rounded-full mb-1">
                              <MessageSquare className="w-2 h-2 text-blue-600" />
                              <ArrowRight className="w-2 h-2 text-orange-600" />
                              <Kanban className="w-2 h-2 text-orange-600" />
                              <span className="text-[7px] text-orange-700 font-semibold ml-0.5">{intl.formatMessage({ id: 'smartTools.content.createdFromChat' })}</span>
                            </div>

                            {/* Project Content - Kanban Card Style */}
                            <div className="bg-white/90 rounded border border-orange-200 px-1.5 py-1 space-y-1">
                              {/* Project Header */}
                              <div className="flex items-center justify-between pb-0.5 border-b border-orange-100">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-sm bg-orange-500"></div>
                                  <p className="text-[9px] text-orange-900 font-bold">{node.content.name}</p>
                                </div>
                              </div>

                              {/* Project Details */}
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-semibold text-[7px]">{node.content.status}</span>
                                  <span className="text-[7px] text-gray-500">{intl.formatMessage({ id: 'smartTools.content.daysAgo' }, { count: 2 })}</span>
                                </div>
                              </div>

                              {/* Team Members */}
                              <div className="flex items-center gap-1 pt-0.5 border-t border-orange-100">
                                <div className="flex -space-x-1">
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                </div>
                                <span className="text-[7px] text-gray-600">{intl.formatMessage({ id: 'smartTools.content.members' }, { count: node.content.team })}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {node.content.type === 'tasks' && (
                          <div className="space-y-1">
                            {/* Created From Badge */}
                            <div className="flex items-center gap-0.5 bg-sky-100 px-1.5 py-0.5 rounded-full mb-1">
                              <FileText className="w-2 h-2 text-sky-600" />
                              <ArrowRight className="w-2 h-2 text-green-600" />
                              <CheckSquare className="w-2 h-2 text-green-600" />
                              <span className="text-[7px] text-green-700 font-semibold ml-0.5">Tasks from notes</span>
                            </div>

                            {/* Tasks Content - Todo List Style */}
                            <div className="bg-white/90 rounded border border-green-200 px-1.5 py-1 space-y-1">
                              {/* Tasks Header */}
                              <div className="flex items-center justify-between pb-0.5 border-b border-green-100">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-sm bg-green-500"></div>
                                  <p className="text-[8px] text-green-900 font-bold">Dashboard Tasks</p>
                                </div>
                              </div>

                              {/* Task Items */}
                              <div className="space-y-0.5">
                                {(node.content.tasks || []).map((task: any, idx: number) => (
                                  <div key={idx} className={`flex items-center gap-1 px-1 py-0.5 rounded ${task.done ? 'bg-green-50' : 'bg-gray-50'}`}>
                                    <div className={`w-2.5 h-2.5 rounded border-2 ${task.done ? 'bg-green-500 border-green-500' : 'border-gray-300'} flex items-center justify-center flex-shrink-0`}>
                                      {task.done && <span className="text-white text-[6px] font-bold">✓</span>}
                                    </div>
                                    <span className={`text-[8px] flex-1 ${task.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                      {task.name}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {/* Progress Footer */}
                              <div className="flex items-center justify-between pt-0.5 border-t border-green-100">
                                <div className="flex items-center gap-1">
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" className="w-2.5 h-2.5 rounded-full" alt="" />
                                  <span className="text-[7px] text-gray-600">Assigned to Mike</span>
                                </div>
                                <span className="text-[7px] text-green-600 font-bold">
                                  {(node.content.tasks || []).filter((t: any) => t.done).length}/{(node.content.tasks || []).length}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {node.content.type === 'calendar' && (
                          <div className="space-y-1">
                            {/* Created From Badge */}
                            <div className="flex items-center gap-0.5 bg-orange-100 px-1.5 py-0.5 rounded-full mb-1">
                              <Kanban className="w-2 h-2 text-orange-600" />
                              <ArrowRight className="w-2 h-2 text-amber-600" />
                              <Calendar className="w-2 h-2 text-amber-600" />
                              <span className="text-[7px] text-amber-700 font-semibold ml-0.5">Scheduled event</span>
                            </div>

                            {/* Calendar Content - Event Card Style */}
                            <div className="bg-white/90 rounded border border-amber-200 px-1.5 py-1 space-y-1">
                              {/* Event Header */}
                              <div className="flex items-start gap-1 pb-0.5 border-b border-amber-100">
                                <div className="w-1.5 h-1.5 rounded-sm bg-amber-500 mt-0.5"></div>
                                <div className="flex-1">
                                  <p className="text-[9px] text-amber-900 font-bold leading-tight">{node.content.event}</p>
                                  <p className="text-[7px] text-amber-700">Project Milestone</p>
                                </div>
                              </div>

                              {/* Event Details */}
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 bg-amber-50 rounded px-1 py-0.5">
                                  <span className="text-[8px]">📅</span>
                                  <span className="text-[8px] text-gray-700 font-semibold">{node.content.date}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-amber-50 rounded px-1 py-0.5">
                                  <span className="text-[8px]">⏰</span>
                                  <span className="text-[7px] text-gray-600">10:00 AM - 11:30 AM</span>
                                </div>
                              </div>

                              {/* Attendees */}
                              <div className="flex items-center justify-between pt-0.5 border-t border-amber-100">
                                <div className="flex -space-x-1">
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" className="w-2.5 h-2.5 rounded-full border border-white" alt="" />
                                </div>
                                <span className="text-[7px] text-gray-600">{node.content.attendees} going</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {node.content.type === 'report' && (
                          <div className="space-y-1">
                            {/* Created From Badge */}
                            <div className="flex items-center gap-0.5 bg-green-100 px-1.5 py-0.5 rounded-full mb-1">
                              <CheckSquare className="w-2 h-2 text-green-600" />
                              <ArrowRight className="w-2 h-2 text-sky-600" />
                              <BarChart3 className="w-2 h-2 text-sky-600" />
                              <span className="text-[7px] text-sky-700 font-semibold ml-0.5">Live analytics</span>
                            </div>

                            {/* Analytics Content - Dashboard Style */}
                            <div className="bg-white/90 rounded border border-sky-200 px-1.5 py-1 space-y-1">
                              {/* Analytics Header */}
                              <div className="flex items-center justify-between pb-0.5 border-b border-sky-100">
                                <div className="flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-sm bg-sky-500"></div>
                                  <p className="text-[8px] text-sky-900 font-bold">Project Analytics</p>
                                </div>
                                <span className="text-[6px] text-green-600 bg-green-100 px-1 py-0.5 rounded-full font-bold">LIVE</span>
                              </div>

                              {/* Metrics */}
                              <div className="space-y-0.5">
                                {node.content.metrics?.map((metric: any, idx: number) => (
                                  <div key={idx} className="bg-gradient-to-r from-sky-50 to-blue-50 rounded px-1 py-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[7px] text-gray-600">{metric.label}</span>
                                      <span className="text-[10px] font-bold text-sky-900">{metric.value}</span>
                                    </div>
                                    <div className="w-full h-0.5 bg-gray-200 rounded-full mt-0.5 overflow-hidden">
                                      <div className={`h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full`}
                                           style={{ width: metric.value }}></div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Insight Footer */}
                              <div className="flex items-center justify-between pt-0.5 border-t border-sky-100">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px]">🎯</span>
                                  <p className="text-[8px] text-green-600 font-bold">{node.content.insight}</p>
                                </div>
                                <span className="text-[6px] text-gray-500">Updated now</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Connection Labels */}
        {connections.map((conn, index) => {
          const isActive = index === activeConnection;
          if (!isActive) return null;

          const fromNode = nodes.find(n => n.id === conn.from);
          const toNode = nodes.find(n => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2 - 4;

          return (
            <motion.div
              key={`label-${index}`}
              className="absolute pointer-events-none"
              style={{
                left: `${midX}%`,
                top: `${midY}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 20
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <Share2 className="w-3 h-3" />
                <span className="text-xs font-bold">{conn.label}</span>
              </div>
            </motion.div>
          );
        })}

        {/* Branch Highlight - Show branching visually */}
        {(activeConnection === 0 || activeConnection === 1) && (
          <motion.div
            className="absolute top-4 right-4 bg-white rounded-lg px-4 py-2 shadow-lg border-2 border-sky-500"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-sky-900">
                {intl.formatMessage({ id: 'smartTools.chatToNotes' })}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile: Simple Cards */}
      <div className="md:hidden space-y-4 max-w-md mx-auto">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          const conn = connections.find(c => c.from === node.id);

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${node.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-900">{node.label}</h4>
                    <p className="text-xs text-gray-600">{node.description}</p>
                  </div>
                </div>
              </div>

              {/* Arrow to next */}
              {conn && (
                <div className="flex justify-center my-2">
                  <div className="flex flex-col items-center gap-1">
                    <ArrowRight className="w-5 h-5 text-sky-500 rotate-90" />
                    {index === 0 && (
                      <span className="text-[10px] text-sky-600 font-semibold">
                        Branches to both
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      </div>
    </motion.div>
  );
};

export default WorkflowBranching;