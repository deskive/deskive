/**
 * HomePage — Landing page aligned with README.md
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  ArrowRight,
  Github,
  Star,
  MessageSquare,
  Video,
  Kanban,
  FolderOpen,
  FileText,
  Calendar,
  PenTool,
  Bot,
  FormInput,
  CheckSquare,
  Wallet,
  Plug,
  Search,
  Globe,
  X,
  Check,
  Terminal,
  Copy,
  Sparkles,
  Shield,
  Server,
  Zap,
  Users,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { PublicLayout } from '../layouts/PublicLayout';
import { PageSEO } from '../components/seo';
import { generateOrganizationSchema } from '../schemas/organization';
import { generateWebsiteSchema } from '../schemas/website';
import { Button } from '../components/ui/button';

const GITHUB_URL = 'https://github.com/deskive/deskive';

type Accent = 'violet' | 'sky' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'fuchsia';

const ACCENT_CLASSES: Record<Accent, { icon: string; ring: string; glow: string }> = {
  violet:  { icon: 'from-violet-500 to-purple-600',   ring: 'hover:ring-violet-300',   glow: 'group-hover:shadow-violet-500/20'   },
  sky:     { icon: 'from-sky-500 to-blue-600',        ring: 'hover:ring-sky-300',      glow: 'group-hover:shadow-sky-500/20'      },
  emerald: { icon: 'from-emerald-500 to-teal-600',    ring: 'hover:ring-emerald-300',  glow: 'group-hover:shadow-emerald-500/20'  },
  amber:   { icon: 'from-amber-500 to-orange-600',    ring: 'hover:ring-amber-300',    glow: 'group-hover:shadow-amber-500/20'    },
  rose:    { icon: 'from-rose-500 to-pink-600',       ring: 'hover:ring-rose-300',     glow: 'group-hover:shadow-rose-500/20'     },
  cyan:    { icon: 'from-cyan-500 to-teal-500',       ring: 'hover:ring-cyan-300',     glow: 'group-hover:shadow-cyan-500/20'     },
  indigo:  { icon: 'from-indigo-500 to-blue-600',     ring: 'hover:ring-indigo-300',   glow: 'group-hover:shadow-indigo-500/20'   },
  fuchsia: { icon: 'from-fuchsia-500 to-pink-600',    ring: 'hover:ring-fuchsia-300',  glow: 'group-hover:shadow-fuchsia-500/20'  },
};

const CAPABILITIES: Array<{ icon: typeof MessageSquare; title: string; desc: string; accent: Accent }> = [
  { icon: MessageSquare, accent: 'sky',     title: 'Real-Time Chat',        desc: 'Channels, DMs, threads, reactions, mentions, and GIFs.' },
  { icon: Video,         accent: 'rose',    title: 'HD Video Calls',        desc: 'Screen sharing, recording, and transcription via LiveKit.' },
  { icon: Kanban,        accent: 'violet',  title: 'Project Management',    desc: 'Kanban, sprints, milestones, dependencies, time tracking.' },
  { icon: FolderOpen,    accent: 'amber',   title: 'File Management',       desc: 'Versioning, sharing, and Google Drive integration.' },
  { icon: FileText,      accent: 'emerald', title: 'Collaborative Notes',   desc: 'Block-based editor with real-time collaboration.' },
  { icon: Calendar,      accent: 'indigo',  title: 'Calendar & Scheduling', desc: 'Events, recurring meetings, rooms, availability.' },
  { icon: PenTool,       accent: 'cyan',    title: 'Whiteboard',            desc: 'Visual workspace for brainstorming and planning.' },
  { icon: Bot,           accent: 'fuchsia', title: 'AI AutoPilot',          desc: 'Scheduling, meeting intelligence, document analysis.' },
  { icon: FormInput,     accent: 'sky',     title: 'Forms & Analytics',     desc: 'Custom form builder with response tracking.' },
  { icon: CheckSquare,   accent: 'emerald', title: 'Approval Workflows',    desc: 'Built-in approvals for documents and processes.' },
  { icon: Wallet,        accent: 'amber',   title: 'Budget Tracking',       desc: 'Expenses, billing rates, budget monitoring.' },
  { icon: Plug,          accent: 'violet',  title: 'Integrations',          desc: 'Slack, Google Drive, GitHub, Dropbox, and more.' },
  { icon: Search,        accent: 'indigo',  title: 'Semantic Search',       desc: 'AI-powered search across all content types.' },
  { icon: Globe,         accent: 'cyan',    title: 'Internationalization',  desc: 'Multi-language support, expandable.' },
];

const STEPS = [
  { n: 1, title: 'Create Your Workspace',     desc: 'Set up team workspaces with channels, projects, and custom roles.' },
  { n: 2, title: 'Communicate in Real-Time',  desc: 'Chat with threads, reactions, mentions, GIFs, and HD video calls.' },
  { n: 3, title: 'Manage Projects',           desc: 'Kanban boards, sprints, task dependencies, and time tracking.' },
  { n: 4, title: 'Collaborate on Documents',  desc: 'Share notes, whiteboards, and files with version control.' },
  { n: 5, title: 'Automate with AI',          desc: 'Let AutoPilot handle scheduling, summaries, and daily briefings.' },
];

const PAIN_POINTS = [
  { title: 'Tool Fragmentation',     desc: 'Switching between 5+ tools daily disrupts focus and productivity.' },
  { title: 'Rising Costs',           desc: 'SaaS subscriptions add up to $50+/user/month for basic collaboration.' },
  { title: 'Data Lock-In',           desc: 'Your data lives on someone else\'s servers with limited export options.' },
  { title: 'Privacy Concerns',       desc: 'Sensitive business data shared with multiple third-party vendors.' },
  { title: 'Integration Complexity', desc: 'Each tool requires separate API integrations and authentication.' },
  { title: 'Feature Gaps',           desc: 'No single platform offers comprehensive collaboration features.' },
];

const SOLUTIONS = [
  { title: 'All-in-One Platform',       desc: 'Chat, video, projects, files, calendar, notes, and AI in one app.' },
  { title: 'Self-Hosted & Open Source', desc: 'Complete data ownership with GNU AGPL 3.0 license.' },
  { title: 'Zero Per-User Costs',       desc: 'One infrastructure cost regardless of team size.' },
  { title: 'Deep Integration',          desc: 'All features share context and data seamlessly.' },
  { title: 'Enterprise-Ready',          desc: 'Digital signatures, approvals, audit logs, and SSO support.' },
];

const UNIQUE = [
  { icon: Sparkles, title: 'Truly Unified Platform',         desc: 'Tasks, messages, docs, and events are first-class citizens of the same workspace under one permission model.' },
  { icon: Plug,     title: 'Pluggable Infrastructure',       desc: 'Storage, AI, email, push, search, auth, and video all swappable via env var — no code changes.' },
  { icon: Server,   title: 'Self-Hosting Without Compromise', desc: 'Full feature parity with SaaS alternatives, including video calls and AI.' },
  { icon: Zap,      title: 'Modern Tech Stack',              desc: 'React 19, NestJS 11, TypeScript, Tiptap/Yjs, Excalidraw, LiveKit, and Qdrant.' },
  { icon: Bot,      title: 'AI-Native Design',               desc: 'Vector search, conversation memory, and AutoPilot agent built into the core platform.' },
  { icon: Shield,   title: 'Cost-Effective Scaling',         desc: 'One infrastructure cost serves unlimited users, unlike per-seat SaaS pricing.' },
];

const COMPARISON_ROWS = [
  { feature: 'Real-time Chat',     deskive: 'Channels, threads, reactions', slack: 'Yes', notion: 'Comments only', asana: 'Comments only', teams: 'Yes' },
  { feature: 'Video Calls',        deskive: 'HD, recording, transcription', slack: 'Huddles (basic)', notion: '—', asana: '—', teams: 'Yes' },
  { feature: 'Project Management', deskive: 'Kanban, sprints, dependencies', slack: '—', notion: 'Basic boards', asana: 'Full-featured', teams: 'Planner' },
  { feature: 'Notes & Docs',       deskive: 'Block editor, real-time collab', slack: 'Canvas (basic)', notion: 'Full-featured', asana: '—', teams: 'Loop' },
  { feature: 'Calendar',           deskive: 'Events, rooms, availability', slack: '—', notion: '—', asana: 'Timeline view', teams: 'Yes' },
  { feature: 'AI Assistant',       deskive: 'AutoPilot, meeting intel', slack: 'Summary', notion: 'Writing', asana: 'Status', teams: 'Copilot' },
  { feature: 'Self-Hosted',        deskive: 'Docker Compose', slack: '—', notion: '—', asana: '—', teams: '—' },
  { feature: 'Open Source',        deskive: 'GNU AGPL 3.0', slack: '—', notion: '—', asana: '—', teams: '—' },
  { feature: 'Pricing',            deskive: 'Free (self-hosted)', slack: '$8.75/user/mo', notion: '$10/user/mo', asana: '$10.99/user/mo', teams: '$4/user/mo' },
];

const MODULE_CATEGORIES = [
  { title: 'Communication',      modules: 'Chat, Video Calls, Email (Gmail OAuth, SMTP/IMAP), Notifications' },
  { title: 'Project Management', modules: 'Tasks, Milestones, Sprints, Kanban, Time Tracking, Dependencies' },
  { title: 'Content',            modules: 'Notes, Documents (digital signatures), Whiteboards, File Management' },
  { title: 'Productivity',       modules: 'Calendar, Forms, Approvals, Budgets' },
  { title: 'AI & Automation',    modules: 'AutoPilot, Meeting Intelligence, Document Analysis, Bots' },
  { title: 'Platform',           modules: 'Auth (OAuth, SSO), Roles & Permissions, Search, Analytics, Integrations' },
];

const STATS = [
  { label: 'Integrated modules', value: '40+' },
  { label: 'Database tables',     value: '148' },
  { label: 'Open source',         value: 'AGPL' },
  { label: 'Docker setup',        value: '< 5 min' },
];

const SHOWCASE_TABS = [
  { key: 'chat',     label: 'Chat',     icon: MessageSquare, image: '/chat_light.png',       caption: 'Channels, DMs, threads, reactions.' },
  { key: 'projects', label: 'Projects', icon: Kanban,        image: '/project.png',          caption: 'Kanban boards, sprints, milestones.' },
  { key: 'video',    label: 'Video',    icon: Video,         image: '/video_call_light.png', caption: 'HD video with recording and transcription.' },
  { key: 'calendar', label: 'Calendar', icon: Calendar,      image: '/main_calendar_light.png', caption: 'Events, rooms, availability.' },
] as const;

const DOCKER_SNIPPET = `git clone https://github.com/deskive/deskive.git
cd deskive
cp .env.docker .env
docker compose up -d`;

const DOT_GRID_BG =
  'bg-[radial-gradient(circle,rgba(139,92,246,0.15)_1px,transparent_1px)] [background-size:24px_24px]';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof SHOWCASE_TABS)[number]['key']>('chat');

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    if (accessToken) {
      navigate(`/auth/callback?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const handleGetStarted = () => {
    navigate(isAuthenticated ? '/' : '/auth/register');
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(DOCKER_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{intl.formatMessage({ id: 'home.loading', defaultMessage: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  const activeShowcase = SHOWCASE_TABS.find((t) => t.key === activeTab)!;

  return (
    <PublicLayout>
      <PageSEO
        title={intl.formatMessage({ id: 'home.seo.title', defaultMessage: 'Open-source workspace collaboration platform' })}
        description={intl.formatMessage({
          id: 'home.seo.description',
          defaultMessage: 'Deskive is the self-hostable, all-in-one workspace: real-time chat, HD video, project management, files, calendar, notes, and AI — in one open-source app.',
        })}
        keywords={['open source workspace', 'slack alternative', 'notion alternative', 'self-hosted collaboration', 'team chat', 'project management', 'video calls']}
        ogImage="/og_image.png"
        ogType="website"
        structuredData={[generateOrganizationSchema(), generateWebsiteSchema()]}
      />

      <main className="relative isolate text-slate-900 overflow-hidden bg-gradient-to-b from-violet-50 via-rose-50 to-sky-50">
        {/* Vibrant animated background orbs shared across the whole landing */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-[20%] -left-40 w-[36rem] h-[36rem] rounded-full bg-fuchsia-400/25 blur-3xl"
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[55%] -right-40 w-[40rem] h-[40rem] rounded-full bg-sky-400/25 blur-3xl"
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[85%] left-[30%] w-[32rem] h-[32rem] rounded-full bg-amber-300/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[130%] -left-20 w-[32rem] h-[32rem] rounded-full bg-violet-400/25 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[170%] right-[10%] w-[32rem] h-[32rem] rounded-full bg-emerald-300/20 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {/* ============ HERO ============ */}
        <section className="relative isolate overflow-hidden">
          {/* Background video */}
          <video
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src="/background.mp4" type="video/mp4" />
          </video>

          {/* Readability overlays on top of the video */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 via-transparent to-white/70" />
          {/* Soft radial vignette behind the text to lift legibility without hiding the video */}
          <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_40%_35%_at_50%_38%,rgba(255,255,255,0.55),rgba(255,255,255,0)_70%)]" />
          <motion.div
            className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-violet-400/10 blur-3xl pointer-events-none"
            animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-20 -right-20 w-[28rem] h-[28rem] rounded-full bg-pink-400/10 blur-3xl pointer-events-none"
            animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-violet-200 text-sm text-violet-700 shadow-sm mb-6 hover:border-violet-300 hover:shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                Open-source · GNU AGPL 3.0 · Self-hostable
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-slate-950 [text-shadow:0_1px_2px_rgba(255,255,255,0.9)]">
                One workspace for
                <span className="block bg-gradient-to-r from-violet-700 via-fuchsia-700 to-pink-700 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                  chat, video, projects &amp; AI
                </span>
              </h1>

              <p className="mt-6 text-lg md:text-xl text-slate-800 font-medium max-w-2xl mx-auto leading-relaxed [text-shadow:0_1px_2px_rgba(255,255,255,0.85)]">
                Deskive replaces Slack + Notion + Zoom + Asana with a single open-source app.
                Real-time chat, HD video, project management, files, calendar, notes, and AI — all in one place.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white h-12 px-7 text-base shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 transition-all"
                >
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="lg" className="h-12 px-7 text-base border-slate-300 bg-white/70 backdrop-blur hover:bg-white">
                    <Github className="w-4 h-4 mr-2" /> View on GitHub
                  </Button>
                </a>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-sm font-semibold text-slate-800">
                {[
                  'Docker in < 5 min',
                  'Unlimited users',
                  'Your data, your servers',
                ].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-sm ring-1 ring-slate-200 shadow-sm"
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
            >
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="text-center p-5 rounded-xl bg-white/80 backdrop-blur border border-slate-200 shadow-sm"
                >
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs md:text-sm text-slate-500">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============ WHAT IS DESKIVE ============ */}
        <section className="relative py-20 md:py-28 border-t border-white/40">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Overview</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">What is Deskive?</h2>
            <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed">
              A <strong>self-hostable workspace collaboration platform</strong> that brings together real-time
              communication, project management, and productivity tools. Built for teams who want complete
              control over their data — Slack + Notion + Zoom + Asana functionality in a single open-source
              application, without vendor lock-in or proprietary licensing.
            </p>
          </div>
        </section>

        {/* ============ HOW IT WORKS ============ */}
        <section className="py-20 md:py-28 bg-white/50 backdrop-blur-sm border-y border-white/40 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 opacity-40">
            <div className={`absolute inset-0 ${DOT_GRID_BG}`} />
          </div>
          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Workflow</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">How it works</h2>
              <p className="mt-4 text-lg text-slate-600">Get your team collaborating in five steps.</p>
            </div>

            <div className="mt-14 relative">
              <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 relative">
                {STEPS.map((s) => (
                  <motion.div
                    key={s.n}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.4, delay: s.n * 0.05 }}
                    className="relative p-6 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/30">
                      {s.n}
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============ KEY CAPABILITIES ============ */}
        <section className="relative py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Capabilities</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Everything your team needs</h2>
              <p className="mt-4 text-lg text-slate-600">
                No plugins, no add-ons, no per-feature upsells.
              </p>
            </div>

            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {CAPABILITIES.map(({ icon: Icon, title, desc, accent }) => {
                const a = ACCENT_CLASSES[accent];
                return (
                  <div
                    key={title}
                    className={`group relative p-6 rounded-2xl bg-white ring-1 ring-slate-200 ${a.ring} hover:ring-2 hover:shadow-xl ${a.glow} hover:-translate-y-1 transition-all overflow-hidden`}
                  >
                    <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${a.icon} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.icon} text-white flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ PRODUCT SHOWCASE (tabs) ============ */}
        <section className="relative py-20 md:py-28 bg-white/50 backdrop-blur-sm border-y border-white/40">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Product tour</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">See Deskive in action</h2>
              <p className="mt-4 text-lg text-slate-600">
                A quick glance at the modules your team will use every day.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {SHOWCASE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>

            <motion.div
              key={activeShowcase.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-10 max-w-6xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-2xl shadow-violet-500/10 bg-white">
                <img src={activeShowcase.image} alt={activeShowcase.label} className="w-full h-auto" loading="lazy" />
              </div>
              <p className="mt-4 text-center text-sm text-slate-500">{activeShowcase.caption}</p>
            </motion.div>
          </div>
        </section>

        {/* ============ PROBLEM / SOLUTION ============ */}
        <section className="relative py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Why now</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The fragmentation dilemma</h2>
              <p className="mt-4 text-lg text-slate-600">
                Modern teams juggle Slack, Zoom, Asana, and Notion — costing $50+/user/month and scattering data across vendors. Deskive consolidates all of it.
              </p>
            </div>

            <div className="mt-14 grid lg:grid-cols-2 gap-8">
              <div className="relative p-8 rounded-2xl bg-white border border-rose-200 shadow-sm overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-rose-100/60 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-rose-600 font-semibold mb-5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </div>
                    Common pain points
                  </div>
                  <ul className="space-y-4">
                    {PAIN_POINTS.map((p) => (
                      <li key={p.title} className="flex gap-3">
                        <X className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-slate-900">{p.title}</div>
                          <div className="text-sm text-slate-600">{p.desc}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="relative p-8 rounded-2xl bg-white border border-emerald-200 shadow-sm overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-emerald-100/60 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    Deskive's solution
                  </div>
                  <ul className="space-y-4">
                    {SOLUTIONS.map((s) => (
                      <li key={s.title} className="flex gap-3">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-slate-900">{s.title}</div>
                          <div className="text-sm text-slate-600">{s.desc}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ COMPARISON ============ */}
        <section className="relative py-20 md:py-28 bg-white/50 backdrop-blur-sm border-y border-white/40">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Comparison</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Why Deskive?</h2>
              <p className="mt-4 text-lg text-slate-600">Side-by-side with the tools you're likely already paying for.</p>
            </div>

            <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 shadow-md bg-white">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-gradient-to-r from-violet-50 to-pink-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-700">Feature</th>
                    <th className="px-5 py-4 font-semibold text-violet-700 bg-white/60">Deskive</th>
                    <th className="px-5 py-4 font-semibold text-slate-700">Slack</th>
                    <th className="px-5 py-4 font-semibold text-slate-700">Notion</th>
                    <th className="px-5 py-4 font-semibold text-slate-700">Asana</th>
                    <th className="px-5 py-4 font-semibold text-slate-700">MS Teams</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{row.feature}</td>
                      <td className="px-5 py-3.5 bg-violet-50/40 text-slate-900 font-medium">{row.deskive}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.slack}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.notion}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.asana}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.teams}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============ WHAT MAKES UNIQUE ============ */}
        <section className="py-20 md:py-28 relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
            <div className={`absolute inset-0 ${DOT_GRID_BG} opacity-30`} />
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl" />
          </div>
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-300 uppercase mb-3">The edge</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">What makes Deskive unique</h2>
              <p className="mt-4 text-lg text-slate-300">
                Breadth under one data model. Pluggable infrastructure. No per-seat pricing.
              </p>
            </div>

            <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {UNIQUE.map(({ icon: Icon, title, desc }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="relative p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-violet-400/40 transition-all group overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-violet-500/10 to-pink-500/10 -z-10" />
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-sm font-mono text-violet-300 pt-3">0{i + 1}</div>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ ARCHITECTURE / MODULES ============ */}
        <section className="relative py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-14 items-start">
              <div>
                <span className="inline-block text-xs font-semibold tracking-widest text-violet-600 uppercase mb-3">Stack</span>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Built on a modern stack</h2>
                <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                  React 19 and NestJS 11 on the surface. PostgreSQL, Redis, Qdrant, and LiveKit under the hood.
                  Storage, AI, email, push, search, auth, and video are all swappable via env var — no code changes.
                </p>
                <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
                  {[
                    { t: 'Frontend',      d: 'React 19 · Vite · TypeScript · Tailwind · Radix UI' },
                    { t: 'Backend',       d: 'NestJS 11 · 40+ modules · Raw SQL' },
                    { t: 'AI & Search',   d: 'Qdrant vectors · OpenAI · Whisper' },
                    { t: 'Video',         d: 'LiveKit · recording · transcription' },
                  ].map((item) => (
                    <div key={item.t} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all">
                      <dt className="font-semibold text-slate-900">{item.t}</dt>
                      <dd className="text-slate-600 mt-1">{item.d}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-600" /> 40+ integrated modules
                </h3>
                <div className="space-y-3">
                  {MODULE_CATEGORIES.map((cat) => (
                    <div
                      key={cat.title}
                      className="p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
                    >
                      <div className="font-semibold text-slate-900">{cat.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{cat.modules}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ QUICK START ============ */}
        <section className="py-20 md:py-28 relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 -z-10">
            <div className={`absolute inset-0 ${DOT_GRID_BG} opacity-20`} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-violet-600/10 blur-3xl" />
          </div>
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-block text-xs font-semibold tracking-widest text-violet-300 uppercase mb-3">Quick start</span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Run it yourself in minutes</h2>
              <p className="mt-4 text-lg text-slate-300">
                Docker Compose is the recommended path. Access the app at <code className="text-violet-300">localhost:5175</code>.
              </p>
            </div>

            <div className="mt-12 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl shadow-violet-500/10">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  </div>
                  <Terminal className="w-4 h-4 ml-2" />
                  <span className="font-mono">bash</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-5 text-sm font-mono text-slate-200 overflow-x-auto leading-relaxed">
{DOCKER_SNIPPET}
              </pre>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="h-12 px-7 bg-transparent border-slate-700 text-white hover:bg-white/10 hover:text-white">
                  <Github className="w-4 h-4 mr-2" /> Read the docs on GitHub
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="relative py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-10 md:p-16 text-white text-center shadow-2xl shadow-violet-500/30">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
              <motion.div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="relative">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to unify your team?</h2>
                <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                  Start free, self-host when you're ready, and join a growing community building the future of open-source collaboration.
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-white text-violet-700 hover:bg-slate-100 h-12 px-7 text-base font-semibold hover:-translate-y-0.5 transition-transform"
                  >
                    Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <a href={`${GITHUB_URL}/stargazers`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="lg" className="h-12 px-7 bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white">
                      <Star className="w-4 h-4 mr-2" /> Star on GitHub
                    </Button>
                  </a>
                </div>
                <p className="mt-6 text-sm text-white/80">
                  Open source · GNU AGPL 3.0 · <Link to="/about" className="underline hover:text-white">Learn more</Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
