import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Calendar,
  FileText,
  MessageSquare,
  Video,
  Kanban,
  Brain,
  Bot,
  Network,
  Sparkles,
  ArrowRight,
  Mail,
  HammerIcon,
  Zap,
} from 'lucide-react';
import enMessages from '../../i18n/en.json';
import jaMessages from '../../i18n/ja.json';
import zhMessages from '../../i18n/zh.json';
import koMessages from '../../i18n/ko.json';
import esMessages from '../../i18n/es.json';
import frMessages from '../../i18n/fr.json';
import deMessages from '../../i18n/de.json';
import ptMessages from '../../i18n/pt.json';
import arMessages from '../../i18n/ar.json';
import hiMessages from '../../i18n/hi.json';
import ruMessages from '../../i18n/ru.json';

const allLocaleMessages: Record<string, any> = {
  en: enMessages, ja: jaMessages, zh: zhMessages, ko: koMessages, es: esMessages,
  fr: frMessages, de: deMessages, pt: ptMessages, ar: arMessages, hi: hiMessages, ru: ruMessages,
};

// Feature and bot capabilities data
const featuresData: Record<string, string[]> = {
  chat: ['Team messaging', 'Direct messages', 'Channels & groups', 'File sharing', 'AI-powered responses'],
  videoCalls: ['HD video calls', 'Screen sharing', 'Recording', 'Virtual backgrounds', 'AI meeting notes'],
  projects: ['Kanban boards', 'Task assignments', 'Deadlines & milestones', 'Progress tracking', 'AI task suggestions'],
  files: ['Unlimited storage', 'Version control', 'Smart search', 'File sharing', 'AI file organization'],
  calendar: ['Event scheduling', 'Team calendars', 'Reminders', 'Time zones', 'AI scheduling assistant'],
  notes: ['Rich text editor', 'Templates', 'Collaboration', 'Version history', 'AI content generation'],
  email: ['Unified inbox', 'Smart filters', 'Templates', 'Scheduling', 'AI email drafting'],
  tools: ['WhiteBoard', 'Document Builder', 'Request and Approval', 'Budgeting', 'Custom Bots']
};

const botCapabilitiesData: Record<string, string[]> = {
  chat: ['🤖 Auto-respond to messages', '💬 Keyword-triggered actions', '🧠 AI-powered chat assistance', '📢 Broadcast announcements', '🔔 @mention notifications'],
  videoCalls: ['📅 Auto-schedule meetings', '📝 AI meeting notes & summaries', '🎥 Auto-start recordings', '⏰ Meeting reminders', '👥 Auto-invite participants'],
  projects: ['✅ Auto-create tasks from chat', '🎯 Smart task assignment', '⏰ Deadline reminders', '📊 Progress tracking alerts', '🔄 Workflow automation'],
  files: ['📁 Auto-organize & tag files', '🔍 Smart search indexing', '🔄 Version control automation', '📤 Auto-share notifications', '🗂️ Backup & sync alerts'],
  calendar: ['📆 Auto-schedule events', '⏰ Smart reminders', '🔄 Recurring event automation', '🕐 Time blocking suggestions', '📧 Event invite automation'],
  notes: ['📝 Auto-generate documentation', '✨ Content suggestions', '📋 Template automation', '🔗 Smart linking', '📊 Meeting notes capture'],
  email: ['📧 Auto-draft responses', '📮 Smart email routing', '🔖 Auto-categorization', '⏰ Scheduled sending', '🤖 AI email assistant'],
  tools: ['🔗 Webhook integrations', '⚙️ Custom workflow automation', '🔄 API connections', '📊 Analytics automation', '🎯 Task orchestration']
};

// Get translated features
const getFeatures = (moduleId: string, intl: ReturnType<typeof useIntl>) => {
  const locale = intl.locale;
  const messages: any = allLocaleMessages[locale] || enMessages;
  const moduleFeatures = messages?.interconnectedEcosystem?.modules?.[moduleId]?.features;
  return Array.isArray(moduleFeatures) ? moduleFeatures : (featuresData[moduleId] || []);
};

// Get translated bot capabilities
const getBotCapabilities = (moduleId: string, intl: ReturnType<typeof useIntl>) => {
  const locale = intl.locale;
  const messages: any = allLocaleMessages[locale] || enMessages;
  const moduleBotCaps = messages?.interconnectedEcosystem?.modules?.[moduleId]?.botCapabilities;
  return Array.isArray(moduleBotCaps) ? moduleBotCaps : (botCapabilitiesData[moduleId] || []);
};

// All 8 Core Modules connected to AI Autopilot
const getCoreModules = (intl: ReturnType<typeof useIntl>) => [
  {
    id: 'chat',
    icon: MessageSquare,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.chat.name' }),
    color: 'from-blue-500 to-cyan-500',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.chat.desc' }),
    features: getFeatures('chat', intl),
    botCapabilities: getBotCapabilities('chat', intl)
  },
  {
    id: 'videoCalls',
    icon: Video,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.videoCalls.name' }),
    color: 'from-sky-500 to-blue-600',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.videoCalls.desc' }),
    features: getFeatures('videoCalls', intl),
    botCapabilities: getBotCapabilities('videoCalls', intl)
  },
  {
    id: 'projects',
    icon: Kanban,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.projects.name' }),
    color: 'from-orange-500 to-red-500',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.projects.desc' }),
    features: getFeatures('projects', intl),
    botCapabilities: getBotCapabilities('projects', intl)
  },
  {
    id: 'files',
    icon: FileText,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.files.name' }),
    color: 'from-green-500 to-emerald-500',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.files.desc' }),
    features: getFeatures('files', intl),
    botCapabilities: getBotCapabilities('files', intl)
  },
  {
    id: 'calendar',
    icon: Calendar,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.calendar.name' }),
    color: 'from-blue-500 to-sky-600',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.calendar.desc' }),
    features: getFeatures('calendar', intl),
    botCapabilities: getBotCapabilities('calendar', intl)
  },
  {
    id: 'notes',
    icon: FileText,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.notes.name' }),
    color: 'from-violet-500 to-fuchsia-500',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.notes.desc' }),
    features: getFeatures('notes', intl),
    botCapabilities: getBotCapabilities('notes', intl)
  },
  {
    id: 'email',
    icon: Mail,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.email.name' }),
    color: 'from-red-500 to-pink-500',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.email.desc' }),
    features: getFeatures('email', intl),
    botCapabilities: getBotCapabilities('email', intl)
  },
  {
    id: 'tools',
    icon: HammerIcon,
    name: intl.formatMessage({ id: 'interconnectedEcosystem.modules.tools.name' }),
    color: 'from-indigo-500 to-purple-500',
    desc: intl.formatMessage({ id: 'interconnectedEcosystem.modules.tools.desc' }),
    features: getFeatures('tools', intl),
    botCapabilities: getBotCapabilities('tools', intl)
  },
];

// 180+ Integration Partners
const integrations = [
  { name: 'Slack', logo: 'https://cdn.simpleicons.org/slack/4A154B' },
  { name: 'Microsoft Teams', logo: 'https://cdn.simpleicons.org/microsoftteams/6264A7' },
  { name: 'Discord', logo: 'https://cdn.simpleicons.org/discord/5865F2' },
  { name: 'Telegram', logo: 'https://cdn.simpleicons.org/telegram/26A5E4' },
  { name: 'WhatsApp', logo: 'https://cdn.simpleicons.org/whatsapp/25D366' },
  { name: 'Zoom', logo: 'https://cdn.simpleicons.org/zoom/2D8CFF' },
  { name: 'Google Meet', logo: 'https://cdn.simpleicons.org/googlemeet/00897B' },
  { name: 'Skype', logo: 'https://cdn.simpleicons.org/skype/00AFF0' },
  { name: 'WebEx', logo: 'https://cdn.simpleicons.org/webex/000000' },
  { name: 'Asana', logo: 'https://cdn.simpleicons.org/asana/F06A6A' },
  { name: 'Trello', logo: 'https://cdn.simpleicons.org/trello/0052CC' },
  { name: 'Jira', logo: 'https://cdn.simpleicons.org/jira/0052CC' },
  { name: 'Monday.com', logo: 'https://cdn.simpleicons.org/monday/FF3D57' },
  { name: 'ClickUp', logo: 'https://cdn.simpleicons.org/clickup/7B68EE' },
  { name: 'Notion', logo: 'https://cdn.simpleicons.org/notion/000000' },
  { name: 'Basecamp', logo: 'https://cdn.simpleicons.org/basecamp/1D2D35' },
  { name: 'GitHub', logo: 'https://cdn.simpleicons.org/github/181717' },
  { name: 'GitLab', logo: 'https://cdn.simpleicons.org/gitlab/FC6D26' },
  { name: 'Bitbucket', logo: 'https://cdn.simpleicons.org/bitbucket/0052CC' },
  { name: 'Azure DevOps', logo: 'https://cdn.simpleicons.org/azuredevops/0078D7' },
  { name: 'Jenkins', logo: 'https://cdn.simpleicons.org/jenkins/D24939' },
  { name: 'CircleCI', logo: 'https://cdn.simpleicons.org/circleci/343434' },
  { name: 'Dropbox', logo: 'https://cdn.simpleicons.org/dropbox/0061FF' },
  { name: 'Google Drive', logo: 'https://cdn.simpleicons.org/googledrive/4285F4' },
  { name: 'OneDrive', logo: 'https://cdn.simpleicons.org/microsoftonedrive/0078D4' },
  { name: 'Box', logo: 'https://cdn.simpleicons.org/box/0061D5' },
  { name: 'iCloud', logo: 'https://cdn.simpleicons.org/icloud/3693F3' },
  { name: 'Figma', logo: 'https://cdn.simpleicons.org/figma/F24E1E' },
  { name: 'Adobe XD', logo: 'https://cdn.simpleicons.org/adobexd/FF61F6' },
  { name: 'Sketch', logo: 'https://cdn.simpleicons.org/sketch/F7B500' },
  { name: 'Canva', logo: 'https://cdn.simpleicons.org/canva/00C4CC' },
  { name: 'InVision', logo: 'https://cdn.simpleicons.org/invision/FF3366' },
  { name: 'HubSpot', logo: 'https://cdn.simpleicons.org/hubspot/FF7A59' },
  { name: 'Salesforce', logo: 'https://cdn.simpleicons.org/salesforce/00A1E0' },
  { name: 'Mailchimp', logo: 'https://cdn.simpleicons.org/mailchimp/FFE01B' },
  { name: 'Intercom', logo: 'https://cdn.simpleicons.org/intercom/0C8EE0' },
  { name: 'Zendesk', logo: 'https://cdn.simpleicons.org/zendesk/03363D' },
  { name: 'Google Analytics', logo: 'https://cdn.simpleicons.org/googleanalytics/E37400' },
  { name: 'Mixpanel', logo: 'https://cdn.simpleicons.org/mixpanel/7856FF' },
  { name: 'Amplitude', logo: 'https://cdn.simpleicons.org/amplitude/2D2D2D' },
  { name: 'Sentry', logo: 'https://cdn.simpleicons.org/sentry/362D59' },
  { name: 'Evernote', logo: 'https://cdn.simpleicons.org/evernote/00A82D' },
  { name: 'Todoist', logo: 'https://cdn.simpleicons.org/todoist/E44332' },
  { name: 'Zapier', logo: 'https://cdn.simpleicons.org/zapier/FF4A00' },
  { name: 'IFTTT', logo: 'https://cdn.simpleicons.org/ifttt/000000' },
  { name: 'QuickBooks', logo: 'https://cdn.simpleicons.org/quickbooks/2CA01C' },
  { name: 'Stripe', logo: 'https://cdn.simpleicons.org/stripe/008CDD' },
  { name: 'PayPal', logo: 'https://cdn.simpleicons.org/paypal/00457C' },
  { name: 'Xero', logo: 'https://cdn.simpleicons.org/xero/13B5EA' },
  { name: 'BambooHR', logo: 'https://cdn.simpleicons.org/bamboo/7DBA40' },
  { name: 'Workday', logo: 'https://cdn.simpleicons.org/workday/F37C20' },
  { name: 'LinkedIn', logo: 'https://cdn.simpleicons.org/linkedin/0A66C2' },
  { name: 'Indeed', logo: 'https://cdn.simpleicons.org/indeed/003A9B' },
  { name: 'Freshdesk', logo: 'https://cdn.simpleicons.org/freshdesk/00C1A5' },
  { name: 'Help Scout', logo: 'https://cdn.simpleicons.org/helpscout/1292EE' },
  { name: 'LiveChat', logo: 'https://cdn.simpleicons.org/livechat/FFD000' },
  { name: 'Twitter', logo: 'https://cdn.simpleicons.org/x/000000' },
  { name: 'Facebook', logo: 'https://cdn.simpleicons.org/facebook/0866FF' },
  { name: 'Instagram', logo: 'https://cdn.simpleicons.org/instagram/E4405F' },
  { name: 'Confluence', logo: 'https://cdn.simpleicons.org/confluence/172B4D' },
  { name: 'GitBook', logo: 'https://cdn.simpleicons.org/gitbook/3884FF' },
  { name: 'ReadMe', logo: 'https://cdn.simpleicons.org/readme/018EF5' },
  { name: 'Toggl', logo: 'https://cdn.simpleicons.org/toggl/E01B22' },
  { name: 'Harvest', logo: 'https://cdn.simpleicons.org/harvest/FF6A00' },
  { name: 'Clockify', logo: 'https://cdn.simpleicons.org/clockify/03A9F4' },
  { name: 'Airtable', logo: 'https://cdn.simpleicons.org/airtable/18BFFF' },
  { name: 'Coda', logo: 'https://cdn.simpleicons.org/coda/F46A54' },
  { name: 'Miro', logo: 'https://cdn.simpleicons.org/miro/050038' },
  { name: 'Loom', logo: 'https://cdn.simpleicons.org/loom/625DF5' },
  { name: 'Calendly', logo: 'https://cdn.simpleicons.org/calendly/006BFF' },
  { name: 'DocuSign', logo: 'https://cdn.simpleicons.org/docusign/FFCD00' },
  { name: 'PandaDoc', logo: 'https://cdn.simpleicons.org/pandadoc/19D393' },
  { name: 'Front', logo: 'https://cdn.simpleicons.org/front/000000' },
  { name: 'Linear', logo: 'https://cdn.simpleicons.org/linear/5E6AD2' },
  { name: 'Height', logo: 'https://cdn.simpleicons.org/heightapp/3633FF' },
  { name: 'Shortcut', logo: 'https://cdn.simpleicons.org/shortcut/4800E5' },
  { name: 'Productive', logo: 'https://cdn.simpleicons.org/producthunt/DA552F' },
  { name: 'Teamwork', logo: 'https://cdn.simpleicons.org/teamwork/5D29E8' },
  { name: 'Wrike', logo: 'https://cdn.simpleicons.org/wrike/77C04B' },
  { name: 'Smartsheet', logo: 'https://cdn.simpleicons.org/smartsheet/2F4C8B' },
  { name: 'Podio', logo: 'https://cdn.simpleicons.org/podio/F07C28' },
  { name: 'Firebase', logo: 'https://cdn.simpleicons.org/firebase/FFCA28' },
  { name: 'MongoDB', logo: 'https://cdn.simpleicons.org/mongodb/47A248' },
  { name: 'PostgreSQL', logo: 'https://cdn.simpleicons.org/postgresql/4169E1' },
  { name: 'MySQL', logo: 'https://cdn.simpleicons.org/mysql/4479A1' },
  { name: 'Redis', logo: 'https://cdn.simpleicons.org/redis/DC382D' },
  { name: 'Typeform', logo: 'https://cdn.simpleicons.org/typeform/262627' },
  { name: 'SurveyMonkey', logo: 'https://cdn.simpleicons.org/surveymonkey/00BF6F' },
  { name: 'Google Forms', logo: 'https://cdn.simpleicons.org/googleforms/7248B9' },
  { name: 'Shopify', logo: 'https://cdn.simpleicons.org/shopify/7AB55C' },
  { name: 'WooCommerce', logo: 'https://cdn.simpleicons.org/woocommerce/96588A' },
  { name: 'WordPress', logo: 'https://cdn.simpleicons.org/wordpress/21759B' },
  { name: 'Webflow', logo: 'https://cdn.simpleicons.org/webflow/4353FF' },
  { name: 'AWS', logo: 'https://cdn.simpleicons.org/amazonaws/232F3E' },
  { name: 'Google Cloud', logo: 'https://cdn.simpleicons.org/googlecloud/4285F4' },
  { name: 'Azure', logo: 'https://cdn.simpleicons.org/microsoftazure/0078D4' },
];

const allIntegrations = [...integrations, ...integrations];

// Bot capabilities for each module
const botCapabilities: Record<string, string[]> = {
  'Chat': [
    '🤖 Auto-respond to messages',
    '💬 Keyword-triggered actions',
    '🧠 AI-powered chat assistance',
    '📢 Broadcast announcements',
    '🔔 @mention notifications'
  ],
  'Video Calls': [
    '📅 Auto-schedule meetings',
    '📝 AI meeting notes & summaries',
    '🎥 Auto-start recordings',
    '⏰ Meeting reminders',
    '👥 Auto-invite participants'
  ],
  'Projects': [
    '✅ Auto-create tasks from chat',
    '🎯 Smart task assignment',
    '⏰ Deadline reminders',
    '📊 Progress tracking alerts',
    '🔄 Workflow automation'
  ],
  'Files': [
    '📁 Auto-organize & tag files',
    '🔍 Smart search indexing',
    '🔄 Version control automation',
    '📤 Auto-share notifications',
    '🗂️ Backup & sync alerts'
  ],
  'Calendar': [
    '📆 Auto-schedule events',
    '⏰ Smart reminders',
    '🔄 Recurring event automation',
    '🕐 Time blocking suggestions',
    '📧 Event invite automation'
  ],
  'Notes': [
    '📝 Auto-generate documentation',
    '✨ Content suggestions',
    '📋 Template automation',
    '🔗 Smart linking',
    '📊 Meeting notes capture'
  ],
  'Email': [
    '📧 Auto-draft responses',
    '📮 Smart email routing',
    '🔖 Auto-categorization',
    '⏰ Scheduled sending',
    '🤖 AI email assistant'
  ],
  'Tools': [
    '🔗 Webhook integrations',
    '⚙️ Custom workflow automation',
    '🔄 API connections',
    '📊 Analytics automation',
    '🎯 Task orchestration'
  ],
};

const InterconnectedEcosystemSection: React.FC = () => {
  const intl = useIntl();
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);
  const [activatedModule, setActivatedModule] = React.useState<string | null>(null);

  const coreModules = getCoreModules(intl);

  // Show AI capabilities on hover
  const showBotCapabilities = (moduleName: string) => {
    setActivatedModule(moduleName);
  };

  const hideBotCapabilities = () => {
    setActivatedModule(null);
  };

  return (
    <section className="relative py-32 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-purple-400/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full px-6 py-3 mb-6"
          >
            <Network className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Unified Ecosystem
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black text-gray-900 mb-6 leading-tight"
          >
            {intl.formatMessage({ id: 'interconnectedEcosystem.title' })}{' '}
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'interconnectedEcosystem.titleConnected' })}
            </span>
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              {intl.formatMessage({ id: 'interconnectedEcosystem.titleSynchronized' })}
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-black max-w-3xl mx-auto"
          >
            {intl.formatMessage({ id: 'interconnectedEcosystem.subtitle' })}
          </motion.p>
        </div>

        {/* Connection Diagram - Cleaner Design */}
        <motion.div
          initial={{ opacity: 0, y: 50, x: 0 }}
          whileInView={{ opacity: 1, y: -70, x: -100 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative w-full mb-64"
          style={{ height: '1000px', maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto' }}
        >
          {/* Central AI Autopilot Hub */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            animate={{
              opacity: activatedModule ? 0 : 1,
              scale: activatedModule ? 0.5 : (hoveredCard === 'autopilot' ? 1.1 : 1),
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.3,
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            viewport={{ once: true }}
            className="absolute z-30"
            style={{
              left: '50%',
              top: 'calc(50% - 40px)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: activatedModule ? 'none' : 'auto'
            }}
            onMouseEnter={() => setHoveredCard('autopilot')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative">
              {/* Pulsing Glow */}
              <motion.div
                className="absolute -inset-8 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 rounded-full blur-2xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.7, 0.5]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              {/* Main Hub Circle */}
              <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 rounded-full p-1 shadow-2xl">
                <div className="bg-white rounded-full p-10 overflow-hidden">
                  {/* Background Video */}
                  <div className="absolute inset-0 rounded-full overflow-hidden opacity-20">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    >
                      <source src="https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/927b0ab9-10b3-426f-a787-a7a6c9d0cd74-1768897335558-1768897334075-ai_background.mp4" type="video/mp4" />
                    </video>
                  </div>

                  <div className="flex flex-col items-center relative z-10">
                    <div className="relative">
                      <Brain className="w-20 h-20 text-purple-600" />
                      <motion.div
                        className="absolute -top-2 -right-2"
                        animate={{
                          rotate: [0, 360],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Sparkles className="w-8 h-8 text-yellow-500" />
                      </motion.div>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mt-4">{intl.formatMessage({ id: 'interconnectedEcosystem.aiAutopilot.title' })}</h3>
                    <p className="text-sm font-bold bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
                      {intl.formatMessage({ id: 'interconnectedEcosystem.aiAutopilot.subtitle' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Card on Hover */}
              {hoveredCard === 'autopilot' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-5 w-80"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="font-black text-gray-900">{intl.formatMessage({ id: 'interconnectedEcosystem.aiAutopilot.heading' })}</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {(() => {
                      const locale = intl.locale;
                      const messages: any = allLocaleMessages[locale] || enMessages;
                      const features = messages?.interconnectedEcosystem?.aiAutopilot?.features || [];
                      return features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white" />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 8 Modules in Perfect Circle */}
          {coreModules.map((module, index) => {
            const Icon = module.icon;
            const angle = (index / coreModules.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 380; // Increased from 320 to 380 for more spacing
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={module.name}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "spring",
                  delay: 0.8 + index * 0.1,
                  stiffness: 150,
                  damping: 15
                }}
                viewport={{ once: true }}
                className={`absolute ${activatedModule === module.id ? 'z-50' : 'z-20'}`}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
                onMouseEnter={() => setHoveredCard(module.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <motion.div
                  className="relative bg-white rounded-xl p-4 shadow-xl border-2 overflow-visible"
                  animate={{
                    scale: (hoveredCard === module.id || activatedModule === module.id) ? 1.15 : (activatedModule && activatedModule !== module.id ? 0.85 : (hoveredCard && hoveredCard !== module.id ? 0.85 : 1)),
                    y: (hoveredCard === module.id || activatedModule === module.id) ? -10 : 0,
                    width: (hoveredCard === module.id || activatedModule === module.id) ? 260 : 160,
                    borderColor: activatedModule === module.id ? '#8b5cf6' : (hoveredCard === module.id ? '#a855f7' : '#f3f4f6'),
                    opacity: (activatedModule && activatedModule !== module.id) || (hoveredCard && hoveredCard !== module.id) ? 0 : 1,
                    filter: (activatedModule && activatedModule !== module.id) || (hoveredCard && hoveredCard !== module.id) ? 'blur(5px)' : 'blur(0px)',
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    pointerEvents: (activatedModule && activatedModule !== module.id) || (hoveredCard && hoveredCard !== module.id) ? 'none' : 'auto'
                  }}
                >
                  {/* Animated Gradient Background on Hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${module.color} transition-opacity duration-300`}
                    style={{ opacity: hoveredCard === module.id ? 0.1 : 0 }}
                  />

                  {/* AI Bot Button - Top Right - Hover to Activate */}
                  <motion.div
                    onMouseEnter={() => showBotCapabilities(module.id)}
                    onMouseLeave={hideBotCapabilities}
                    className="absolute -top-4 -right-4 z-30 cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    animate={{
                      scale: activatedModule === module.id ? 1.15 : 1,
                    }}
                    transition={{
                      scale: { duration: 0.3, ease: "easeOut" }
                    }}
                  >
                    {/* Pulsing glow effect on hover */}
                    <motion.div
                      className="absolute inset-0 bg-purple-400 rounded-full blur-md"
                      animate={{
                        opacity: activatedModule === module.id ? [0.3, 0.6, 0.3] : 0,
                        scale: activatedModule === module.id ? [1, 1.2, 1] : 1,
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: activatedModule === module.id ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    />

                    <div className={`relative w-14 h-14 rounded-full shadow-lg border-3 border-white transition-all duration-300 overflow-hidden ${activatedModule === module.id ? 'ring-2 ring-purple-400 ring-offset-2' : ''}`}>
                      <img
                        src="https://cdn-dev.deskive.com/projects/4493aede-e31a-4da4-8645-ca3c3a3d99a4/4c7ab96c-fdef-49e4-a805-cac0ac155312-1768971083162-1768971081319-chatbot.gif"
                        alt="AI Bot"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Sparkles - show on hover */}
                    <AnimatePresence>
                      {activatedModule === module.id && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{
                            scale: [1, 1.3, 1],
                            rotate: [0, 180, 360]
                          }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{
                            scale: { duration: 1.5, repeat: Infinity },
                            rotate: { duration: 2, repeat: Infinity, ease: "linear" }
                          }}
                          className="absolute -top-1 -right-1"
                        >
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Hover hint tooltip */}
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                    >
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded shadow-sm">
                        AI Features
                      </span>
                    </motion.div>
                  </motion.div>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center mb-3 mx-auto shadow-lg transition-all`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Module Info */}
                  <h4 className="text-base font-black text-gray-900 text-center mb-1">
                    {module.name}
                  </h4>
                  <p className="text-xs text-gray-600 text-center mb-2">
                    {module.desc}
                  </p>

                  {/* Features List - Shows on Hover OR Bot Capabilities when Activated */}
                  <AnimatePresence mode="wait">
                    {activatedModule === module.id ? (
                      <motion.div
                        key="bot-capabilities"
                        initial={{ height: 0, opacity: 0, scale: 0.9 }}
                        animate={{ height: 'auto', opacity: 1, scale: 1 }}
                        exit={{ height: 0, opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, type: "spring" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t-2 border-purple-300">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Bot className="w-4 h-4 text-purple-600" />
                            <p className="text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                              {intl.formatMessage({ id: 'interconnectedEcosystem.botCapabilities' })}
                            </p>
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                          </div>
                          <ul className="space-y-2">
                            {module.botCapabilities?.map((capability: string, idx: number) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                                className="text-xs text-gray-700 flex items-start gap-2 bg-purple-50 p-2 rounded-lg"
                              >
                                <span>{capability}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    ) : hoveredCard === module.id ? (
                      <motion.div
                        key="features"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs font-bold text-gray-700 mb-2 text-center">{intl.formatMessage({ id: 'interconnectedEcosystem.keyFeatures' })}</p>
                          <ul className="space-y-1.5">
                            {module.features.map((feature: string, idx: number) => (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="text-xs text-gray-600 flex items-start gap-1.5"
                              >
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span>{feature}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Active Indicator */}
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full">
                    <motion.div
                      className="absolute inset-0 bg-green-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>

                  {/* Glow Effect on Hover/Activation */}
                  <div
                    className={`absolute -inset-2 rounded-xl bg-gradient-to-br ${module.color} blur-xl transition-opacity duration-300 pointer-events-none -z-10`}
                    style={{ opacity: activatedModule === module.id ? 0.5 : (hoveredCard === module.id ? 0.3 : 0) }}
                  />

                  {/* Bot Activation Ring Animation */}
                  {activatedModule === module.id && (
                    <motion.div
                      className="absolute -inset-4 rounded-xl border-4 border-purple-500"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0.8, 1.2, 1.4],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    />
                  )}

                  {/* Bot Connection Particles */}
                  {activatedModule === module.id && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-purple-500 rounded-full"
                          style={{
                            left: '50%',
                            top: '50%',
                          }}
                          animate={{
                            x: [0, (Math.random() - 0.5) * 100],
                            y: [0, (Math.random() - 0.5) * 100],
                            opacity: [1, 0],
                            scale: [1, 0],
                          }}
                          transition={{
                            duration: 1,
                            delay: i * 0.15,
                            repeat: Infinity,
                            ease: "easeOut"
                          }}
                        />
                      ))}
                    </>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Integrations Infinite Scroll */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative z-10"
        >
          <div className="text-center mb-12">
            <motion.div
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full px-5 py-2 mb-4"
            >
              <Network className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-600">{intl.formatMessage({ id: 'interconnectedEcosystem.integrations.badge' })}</span>
            </motion.div>
            <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
              {intl.formatMessage({ id: 'interconnectedEcosystem.integrations.title' })}
            </h3>
            <p className="text-lg text-black">
              {intl.formatMessage({ id: 'interconnectedEcosystem.integrations.subtitle' })}
            </p>
          </div>

          {/* Infinite Scroll - Two Rows Moving Opposite Directions */}
          <div className="relative overflow-hidden py-8 space-y-6">
            {/* First Row - Moving Left */}
            <motion.div
              className="flex gap-6"
              animate={{ x: [0, -50 * (allIntegrations.length / 2)] }}
              transition={{
                x: {
                  duration: 60,
                  repeat: Infinity,
                  ease: "linear"
                }
              }}
            >
              {allIntegrations.slice(0, Math.ceil(allIntegrations.length / 2)).concat(allIntegrations.slice(0, Math.ceil(allIntegrations.length / 2))).map((integration, index) => (
                <motion.div
                  key={`row1-${integration.name}-${index}`}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="flex-shrink-0"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all w-40 h-40 flex flex-col items-center justify-center gap-3 border border-gray-100">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <img
                        src={integration.logo}
                        alt={integration.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback: show first letter in colored circle
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                <span class="text-white font-bold text-xl">${integration.name.charAt(0)}</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center">
                      {integration.name}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Second Row - Moving Right */}
            <motion.div
              className="flex gap-6"
              animate={{ x: [-50 * (allIntegrations.length / 2), 0] }}
              transition={{
                x: {
                  duration: 60,
                  repeat: Infinity,
                  ease: "linear"
                }
              }}
            >
              {allIntegrations.slice(Math.ceil(allIntegrations.length / 2)).concat(allIntegrations.slice(Math.ceil(allIntegrations.length / 2))).map((integration, index) => (
                <motion.div
                  key={`row2-${integration.name}-${index}`}
                  whileHover={{ scale: 1.1, y: -5 }}
                  className="flex-shrink-0"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all w-40 h-40 flex flex-col items-center justify-center gap-3 border border-gray-100">
                    <div className="w-12 h-12 flex items-center justify-center">
                      <img
                        src={integration.logo}
                        alt={integration.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback: show first letter in colored circle
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                <span class="text-white font-bold text-xl">${integration.name.charAt(0)}</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center">
                      {integration.name}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
            >
              {intl.formatMessage({ id: 'interconnectedEcosystem.integrations.viewAll' })}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 20s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
};

export default InterconnectedEcosystemSection;
