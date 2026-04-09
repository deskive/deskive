import React from 'react';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  MessageSquare,
  Kanban,
  Calendar,
  FileText,
  Video,
  Brain,
  ArrowRight,
  Check,
  Zap,
  Users,
  TrendingUp,
  Lock
} from 'lucide-react';

const FeatureHighlights: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const highlights = [
    {
      id: 'project-management',
      icon: Kanban,
      badge: 'Project Management',
      title: 'Visualize your work in multiple ways',
      description: 'From Kanban boards to Gantt charts, manage projects the way you want. Track progress, assign tasks, and hit deadlines with powerful project management tools.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&h=900&fit=crop&q=90',
      color: 'from-sky-500 to-sky-600',
      features: [
        'Kanban boards & List views',
        'Gantt charts & Timelines',
        'Sprint planning & tracking',
        'Custom workflows',
        'Time tracking built-in',
        'Progress & velocity reports'
      ],
      stats: [
        { value: '25K+', label: 'Projects' },
        { value: '500K+', label: 'Tasks' },
        { value: '98%', label: 'On-time delivery' }
      ]
    },
    {
      id: 'team-collaboration',
      icon: MessageSquare,
      badge: 'Team Collaboration',
      title: 'Everything your team needs in one place',
      description: 'Real-time chat, video calls, and file sharing keep your team connected. No more switching between apps - collaborate seamlessly within your workspace.',
      image: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=1400&h=900&fit=crop&q=90',
      color: 'from-cyan-500 to-cyan-600',
      features: [
        'Real-time messaging',
        'Video & audio calls',
        'Screen sharing',
        'File sharing & preview',
        'Thread conversations',
        '@mentions & reactions'
      ],
      stats: [
        { value: '50K+', label: 'Active users' },
        { value: '10M+', label: 'Messages sent' },
        { value: '99.9%', label: 'Uptime' }
      ],
      reverse: true
    },
    {
      id: 'smart-scheduling',
      icon: Calendar,
      badge: 'Smart Scheduling',
      title: 'AI-powered calendar that works for you',
      description: 'Intelligent scheduling with AI suggestions, calendar sync, and automated meeting rooms. Never double-book or miss a meeting again.',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1400&h=900&fit=crop&q=90',
      color: 'from-emerald-500 to-emerald-600',
      features: [
        'Smart AI scheduling',
        'Google Calendar sync',
        'Meeting room booking',
        'Timezone management',
        'Recurring events',
        'Availability tracking'
      ],
      stats: [
        { value: '100K+', label: 'Meetings' },
        { value: '500K+', label: 'Events' },
        { value: '50+', label: 'Integrations' }
      ]
    },
    {
      id: 'knowledge-management',
      icon: FileText,
      badge: 'Knowledge Management',
      title: 'Build your team knowledge base',
      description: 'Notion-style docs with real-time collaboration, templates, and powerful search. Create, organize, and share knowledge effortlessly.',
      image: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1400&h=900&fit=crop&q=90',
      color: 'from-orange-500 to-orange-600',
      features: [
        'Block-based editor',
        'Real-time collaboration',
        'Rich formatting & embeds',
        'Templates library',
        'Version history',
        'AI writing assistant'
      ],
      stats: [
        { value: '200K+', label: 'Documents' },
        { value: '500+', label: 'Templates' },
        { value: '30K+', label: 'Active writers' }
      ],
      reverse: true
    },
    {
      id: 'ai-powered',
      icon: Brain,
      badge: 'AI Powered',
      title: 'Let AI handle the repetitive work',
      description: 'ChatGPT-powered assistant for content generation, meeting summaries, and task automation. Work smarter, not harder with AI at your fingertips.',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&h=900&fit=crop&q=90',
      color: 'from-amber-500 to-amber-600',
      features: [
        'AI content generation',
        'Meeting transcription',
        'Smart task suggestions',
        'Automated workflows',
        'Image creation (DALL-E)',
        'Code assistance'
      ],
      stats: [
        { value: '1M+', label: 'AI requests' },
        { value: '95%', label: 'Accuracy' },
        { value: '<1s', label: 'Response time' }
      ]
    }
  ];

  return (
    <section className="relative">
      {highlights.map((highlight, index) => {
        const Icon = highlight.icon;
        const isReverse = highlight.reverse;

        return (
          <div
            key={highlight.id}
            className="relative py-20 md:py-32 overflow-hidden"
            style={{
              background: isReverse
                ? 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'
                : 'linear-gradient(135deg, #faf5ff 0%, #fce7f3 100%)'
            }}
          >
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className={`absolute w-96 h-96 rounded-full blur-3xl opacity-20 ${
                  isReverse ? 'top-0 right-0 bg-blue-400' : 'bottom-0 left-0 bg-sky-400'
                }`}
              ></div>
              <div
                className={`absolute w-96 h-96 rounded-full blur-3xl opacity-20 ${
                  isReverse ? 'bottom-0 left-0 bg-cyan-400' : 'top-0 right-0 bg-blue-400'
                }`}
              ></div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isReverse ? 'lg:flex-row-reverse' : ''}`}
              >
                {/* Content Side */}
                <div className={`space-y-8 ${isReverse ? 'lg:order-2' : ''}`}>
                  {/* Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white shadow-lg border border-gray-100"
                  >
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${highlight.color} flex items-center justify-center shadow-md`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-base font-bold text-gray-900">
                      {highlight.badge}
                    </span>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight"
                  >
                    {highlight.title}
                  </motion.h2>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    viewport={{ once: true }}
                    className="text-xl md:text-2xl text-gray-700 leading-relaxed font-medium"
                  >
                    {highlight.description}
                  </motion.p>

                  {/* Features List */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {highlight.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + idx * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${highlight.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-900 text-base font-semibold">{feature}</span>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Stats */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    viewport={{ once: true }}
                    className="flex flex-wrap gap-12 pt-6"
                  >
                    {highlight.stats.map((stat, idx) => (
                      <div key={idx} className="relative">
                        <div className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${highlight.color} bg-clip-text text-transparent mb-2`}>
                          {stat.value}
                        </div>
                        <div className="text-base text-gray-600 font-bold uppercase tracking-wider">{stat.label}</div>
                      </div>
                    ))}
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    viewport={{ once: true }}
                    className="pt-4"
                  >
                    <Button
                      onClick={() => navigate(`/features#${highlight.id}`)}
                      size="lg"
                      className={`group bg-gradient-to-r ${highlight.color} hover:scale-105 text-white font-bold px-10 py-7 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl text-lg`}
                    >
                      <span className="flex items-center gap-3">
                        {intl.formatMessage({ id: 'common.explore' }, { feature: highlight.badge })}
                        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                      </span>
                    </Button>
                  </motion.div>
                </div>

                {/* Image Side */}
                <div className={`relative ${isReverse ? 'lg:order-1' : ''}`}>
                  {/* Floating Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    viewport={{ once: true }}
                    className="absolute -top-6 left-6 z-20 bg-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3"
                  >
                    <Zap className={`w-6 h-6 bg-gradient-to-r ${highlight.color} bg-clip-text`} style={{ color: 'transparent' }} />
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase">Featured</div>
                      <div className="text-sm font-bold text-gray-900">{highlight.badge}</div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotateY: isReverse ? -15 : 15 }}
                    whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="relative rounded-3xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.25)] hover:shadow-[0_30px_100px_rgba(0,0,0,0.3)] transition-all duration-500 transform hover:scale-[1.02]"
                    style={{
                      perspective: '1000px',
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    {/* Screenshot with gradient border */}
                    <div className={`p-1 bg-gradient-to-br ${highlight.color} rounded-3xl`}>
                      <div className="bg-white rounded-[1.3rem] overflow-hidden">
                        {/* Browser Chrome */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                          <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
                          </div>
                          <div className="flex-1 bg-white rounded-lg px-4 py-2 text-sm text-gray-600 font-medium shadow-sm">
                            https://deskive.com/{highlight.id}
                          </div>
                        </div>

                        {/* Screenshot */}
                        <div className="relative">
                          <img
                            src={highlight.image}
                            alt={highlight.title}
                            className="w-full h-auto object-cover"
                            style={{ aspectRatio: '16/10' }}
                          />

                          {/* Interactive overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-all duration-500 flex items-end p-8">
                            <div className="text-white transform translate-y-4 hover:translate-y-0 transition-transform duration-500">
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${highlight.color} mb-4`}>
                                <Icon className="w-5 h-5" />
                                <span className="font-bold">{highlight.badge}</span>
                              </div>
                              <div className="text-2xl font-bold mb-2">{highlight.title}</div>
                              <div className="text-sm text-white/90">{highlight.description}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Large Glow Effect */}
                  <div
                    className="absolute -inset-20 -z-10 blur-[100px] opacity-30"
                    style={{
                      background: `radial-gradient(circle at center, ${
                        highlight.color.includes('purple') ? 'rgba(14, 165, 233, 0.8)' :
                        highlight.color.includes('cyan') ? 'rgba(6, 182, 212, 0.8)' :
                        highlight.color.includes('emerald') ? 'rgba(16, 185, 129, 0.8)' :
                        highlight.color.includes('orange') ? 'rgba(249, 115, 22, 0.8)' :
                        'rgba(251, 191, 36, 0.8)'
                      }, transparent 60%)`,
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default FeatureHighlights;
