/**
 * HomePage — Landing page aligned with README.md
 */

import { useEffect } from 'react';
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
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { PublicLayout } from '../layouts/PublicLayout';
import { PageSEO } from '../components/seo';
import { generateOrganizationSchema } from '../schemas/organization';
import { generateWebsiteSchema } from '../schemas/website';
import { Button } from '../components/ui/button';

const GITHUB_URL = 'https://github.com/deskive/deskive';

const CAPABILITIES = [
  { icon: MessageSquare, title: 'Real-Time Chat', desc: 'Channels, DMs, threads, reactions, mentions, and GIFs.' },
  { icon: Video, title: 'HD Video Calls', desc: 'Screen sharing, recording, and transcription via LiveKit.' },
  { icon: Kanban, title: 'Project Management', desc: 'Kanban, sprints, milestones, dependencies, time tracking.' },
  { icon: FolderOpen, title: 'File Management', desc: 'Versioning, sharing, and Google Drive integration.' },
  { icon: FileText, title: 'Collaborative Notes', desc: 'Block-based editor with real-time collaboration.' },
  { icon: Calendar, title: 'Calendar & Scheduling', desc: 'Events, recurring meetings, rooms, availability.' },
  { icon: PenTool, title: 'Whiteboard', desc: 'Visual workspace for brainstorming and planning.' },
  { icon: Bot, title: 'AI AutoPilot', desc: 'Scheduling, meeting intelligence, document analysis.' },
  { icon: FormInput, title: 'Forms & Analytics', desc: 'Custom form builder with response tracking.' },
  { icon: CheckSquare, title: 'Approval Workflows', desc: 'Built-in approvals for documents and processes.' },
  { icon: Wallet, title: 'Budget Tracking', desc: 'Expenses, billing rates, budget monitoring.' },
  { icon: Plug, title: 'Integrations', desc: 'Slack, Google Drive, GitHub, Dropbox, and more.' },
  { icon: Search, title: 'Semantic Search', desc: 'AI-powered search across all content types.' },
  { icon: Globe, title: 'Internationalization', desc: 'Multi-language support, expandable.' },
];

const STEPS = [
  { n: 1, title: 'Create Your Workspace', desc: 'Set up team workspaces with channels, projects, and custom roles.' },
  { n: 2, title: 'Communicate in Real-Time', desc: 'Chat with threads, reactions, mentions, GIFs, and HD video calls.' },
  { n: 3, title: 'Manage Projects', desc: 'Kanban boards, sprints, task dependencies, and time tracking.' },
  { n: 4, title: 'Collaborate on Documents', desc: 'Share notes, whiteboards, and files with version control.' },
  { n: 5, title: 'Automate with AI', desc: 'Let AutoPilot handle scheduling, summaries, and daily briefings.' },
];

const PAIN_POINTS = [
  { title: 'Tool Fragmentation', desc: 'Switching between 5+ tools daily disrupts focus and productivity.' },
  { title: 'Rising Costs', desc: 'SaaS subscriptions add up to $50+/user/month for basic collaboration.' },
  { title: 'Data Lock-In', desc: 'Your data lives on someone else\'s servers with limited export options.' },
  { title: 'Privacy Concerns', desc: 'Sensitive business data shared with multiple third-party vendors.' },
  { title: 'Integration Complexity', desc: 'Each tool requires separate API integrations and authentication.' },
  { title: 'Feature Gaps', desc: 'No single platform offers comprehensive collaboration features.' },
];

const SOLUTIONS = [
  { title: 'All-in-One Platform', desc: 'Chat, video, projects, files, calendar, notes, and AI in one app.' },
  { title: 'Self-Hosted & Open Source', desc: 'Complete data ownership with GNU AGPL 3.0 license.' },
  { title: 'Zero Per-User Costs', desc: 'One infrastructure cost regardless of team size.' },
  { title: 'Deep Integration', desc: 'All features share context and data seamlessly.' },
  { title: 'Enterprise-Ready', desc: 'Digital signatures, approvals, audit logs, and SSO support.' },
];

const UNIQUE = [
  { title: 'Truly Unified Platform', desc: 'All features share the same data and permission model — tasks, messages, docs, and events are first-class citizens of the same workspace.' },
  { title: 'Pluggable Infrastructure', desc: 'Storage, AI, email, push, search, auth, and video backends all swappable via env var. R2 → GCS, OpenAI → Ollama, Gmail → Postmark — no code changes.' },
  { title: 'Self-Hosting Without Compromise', desc: 'Full feature parity with SaaS alternatives, including video calls and AI.' },
  { title: 'Modern Tech Stack', desc: 'Built with React 19, NestJS 11, TypeScript, Tiptap/Yjs, Excalidraw, LiveKit, and Qdrant.' },
  { title: 'AI-Native Design', desc: 'Vector search, conversation memory, and AutoPilot agent built into the core platform.' },
  { title: 'Cost-Effective Scaling', desc: 'One infrastructure cost serves unlimited users, unlike per-seat SaaS pricing.' },
];

const COMPARISON_ROWS: Array<{ feature: string; deskive: string; slack: string; notion: string; asana: string; teams: string }> = [
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
  { title: 'Communication', modules: 'Chat, Video Calls, Email (Gmail OAuth, SMTP/IMAP), Notifications' },
  { title: 'Project Management', modules: 'Tasks, Milestones, Sprints, Kanban, Time Tracking, Dependencies' },
  { title: 'Content', modules: 'Notes, Documents (digital signatures), Whiteboards, File Management' },
  { title: 'Productivity', modules: 'Calendar, Forms, Approvals, Budgets' },
  { title: 'AI & Automation', modules: 'AutoPilot, Meeting Intelligence, Document Analysis, Bots' },
  { title: 'Platform', modules: 'Auth (OAuth, SSO), Roles & Permissions, Search, Analytics, Integrations' },
];

const DOCKER_SNIPPET = `git clone https://github.com/deskive/deskive.git
cd deskive
cp .env.docker .env
docker compose up -d`;

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    if (accessToken) {
      navigate(`/auth/callback?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const handleGetStarted = () => {
    navigate(isAuthenticated ? '/' : '/auth/register');
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

      <main className="relative bg-white text-slate-900">
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-50 via-white to-white" />
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-300/30 blur-3xl" />
            <div className="absolute top-20 -right-20 w-96 h-96 rounded-full bg-pink-300/30 blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-purple-200 text-sm text-purple-700 shadow-sm mb-6">
                <Star className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                Open-source · GNU AGPL 3.0 · Self-hostable
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                One workspace for
                <span className="block bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                  chat, video, projects &amp; AI
                </span>
              </h1>

              <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Deskive replaces Slack + Notion + Zoom + Asana with a single open-source app.
                Real-time chat, HD video, project management, files, calendar, notes, and AI — all in one place.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 px-7 text-base shadow-lg shadow-purple-500/25"
                >
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="lg" className="h-12 px-7 text-base border-slate-300">
                    <Github className="w-4 h-4 mr-2" /> View on GitHub
                  </Button>
                </a>
              </div>

              <p className="mt-5 text-sm text-slate-500">
                No credit card required · Self-host in under 5 minutes with Docker
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-16 max-w-6xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-2xl shadow-purple-500/10 bg-white">
                <img
                  src="/dashboard.png"
                  alt="Deskive workspace dashboard"
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============ WHAT IS DESKIVE ============ */}
        <section className="py-20 md:py-28 border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-6 text-center">
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
        <section className="py-20 md:py-28 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">How it works</h2>
              <p className="mt-4 text-lg text-slate-600">Get your team collaborating in five steps.</p>
            </div>

            <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {STEPS.map((s) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: s.n * 0.05 }}
                  className="relative p-6 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center font-bold">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ KEY CAPABILITIES ============ */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Key capabilities</h2>
              <p className="mt-4 text-lg text-slate-600">
                Everything your team needs — no plugins, no add-ons, no per-feature upsells.
              </p>
            </div>

            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="p-6 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PROBLEM / SOLUTION ============ */}
        <section className="py-20 md:py-28 bg-slate-50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The collaboration tool fragmentation dilemma</h2>
              <p className="mt-4 text-lg text-slate-600">
                Modern teams juggle Slack, Zoom, Asana, and Notion — costing $50+/user/month and scattering data across vendors.
                Deskive consolidates all of it.
              </p>
            </div>

            <div className="mt-14 grid lg:grid-cols-2 gap-8">
              <div className="p-8 rounded-2xl bg-white border border-rose-200">
                <div className="flex items-center gap-2 text-rose-600 font-semibold mb-4">
                  <X className="w-5 h-5" /> Common pain points
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

              <div className="p-8 rounded-2xl bg-white border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-4">
                  <Check className="w-5 h-5" /> Deskive's solution
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
        </section>

        {/* ============ COMPARISON ============ */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Why Deskive?</h2>
              <p className="mt-4 text-lg text-slate-600">Side-by-side with the tools you're likely already paying for.</p>
            </div>

            <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-700">Feature</th>
                    <th className="px-5 py-4 font-semibold text-purple-700 bg-purple-50">Deskive</th>
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
                      <td className="px-5 py-3.5 bg-purple-50/50 text-slate-900">{row.deskive}</td>
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
        <section className="py-20 md:py-28 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">What makes Deskive unique</h2>
              <p className="mt-4 text-lg text-slate-300">
                Breadth under one data model. Pluggable infrastructure. No per-seat pricing.
              </p>
            </div>

            <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {UNIQUE.map((u, i) => (
                <div key={u.title} className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-sm font-mono text-purple-400">0{i + 1}</div>
                  <h3 className="mt-3 text-lg font-semibold">{u.title}</h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">{u.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ ARCHITECTURE / MODULES ============ */}
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-14 items-start">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Built on a modern stack</h2>
                <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                  React 19 and NestJS 11 on the surface. PostgreSQL, Redis, Qdrant, and LiveKit under the hood.
                  Storage, AI, email, push, search, auth, and video are all swappable via env var — no code changes.
                </p>
                <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <dt className="font-semibold text-slate-900">Frontend</dt>
                    <dd className="text-slate-600 mt-1">React 19 · Vite · TypeScript · Tailwind · Radix UI</dd>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <dt className="font-semibold text-slate-900">Backend</dt>
                    <dd className="text-slate-600 mt-1">NestJS 11 · 40+ modules · Raw SQL</dd>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <dt className="font-semibold text-slate-900">AI &amp; Search</dt>
                    <dd className="text-slate-600 mt-1">Qdrant vectors · OpenAI · Whisper</dd>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <dt className="font-semibold text-slate-900">Video</dt>
                    <dd className="text-slate-600 mt-1">LiveKit · recording · transcription</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">40+ integrated modules</h3>
                <div className="space-y-3">
                  {MODULE_CATEGORIES.map((cat) => (
                    <div key={cat.title} className="p-4 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors">
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
        <section className="py-20 md:py-28 bg-slate-950 text-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Run it yourself in minutes</h2>
              <p className="mt-4 text-lg text-slate-300">
                Docker Compose is the recommended path. Access the app at <code className="text-purple-300">localhost:5175</code>.
              </p>
            </div>

            <div className="mt-12 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Terminal className="w-4 h-4" />
                  <span className="font-mono">bash</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(DOCKER_SNIPPET)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
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
        <section className="py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-10 md:p-16 text-white text-center shadow-2xl shadow-purple-500/30">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to unify your team?</h2>
                <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
                  Start free, self-host when you're ready, and join a growing community building the future of open-source collaboration.
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={handleGetStarted}
                    size="lg"
                    className="bg-white text-purple-700 hover:bg-slate-100 h-12 px-7 text-base font-semibold"
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
