/**
 * Image Alt Text Constants
 * Centralized alt text for all images across the platform
 * Following SEO best practices with descriptive, keyword-rich alt text
 */

/**
 * Logo and Branding
 */
export const BRANDING_ALT = {
  logo: 'Deskive - All-in-One Workspace Platform',
  logoWhite: 'Deskive Logo in White',
  logoDark: 'Deskive Logo in Dark Mode',
  icon: 'Deskive Icon',
  favicon: 'Deskive Favicon',
} as const;

/**
 * Product Features
 */
export const FEATURES_ALT = {
  chat: 'Team chat and messaging interface with real-time collaboration',
  projects: 'Kanban board for project management and task tracking',
  files: 'File manager with drag-and-drop upload and folder organization',
  calendar: 'Calendar interface with event scheduling and meeting management',
  notes: 'Block-based note editor with rich text formatting',
  videoCalls: 'Video conferencing interface with screen sharing',
  aiAssistant: 'AI-powered assistant for document generation and chat support',
  analytics: 'Analytics dashboard with charts and performance metrics',
  teams: 'Team collaboration workspace with member management',
  integrations: 'Integration marketplace with third-party app connections',
  monitoring: 'Real-time monitoring dashboard with system metrics',
  automation: 'Workflow automation builder with drag-and-drop interface',
} as const;

/**
 * Product Screenshots
 */
export const SCREENSHOTS_ALT = {
  dashboard: 'Deskive dashboard showing workspace overview with recent activity',
  chatInterface: 'Real-time chat interface with channels, direct messages, and file sharing',
  kanbanBoard: 'Kanban board with drag-and-drop tasks organized in columns',
  fileManager: 'File manager showing folders, files, and upload interface',
  calendarView: 'Calendar view with scheduled events and meetings',
  noteEditor: 'Block-based note editor with formatting toolbar',
  videoCall: 'Video call interface with participants and screen sharing controls',
  aiChat: 'AI assistant chat interface with conversation history',
  settings: 'Workspace settings panel with configuration options',
} as const;

/**
 * Hero and Landing Page Images
 */
export const HERO_ALT = {
  hero: 'Teams collaborating on Deskive workspace platform',
  heroChat: 'Team members using Deskive chat for real-time communication',
  heroProjects: 'Project manager organizing tasks on Deskive Kanban board',
  heroRemote: 'Remote team collaborating through Deskive video calls',
  heroProductivity: 'Productive workspace setup with Deskive platform on screen',
} as const;

/**
 * Icons and UI Elements
 */
export const UI_ALT = {
  search: 'Search icon',
  notification: 'Notification bell icon',
  settings: 'Settings gear icon',
  profile: 'User profile icon',
  menu: 'Menu hamburger icon',
  close: 'Close icon',
  add: 'Add new item icon',
  edit: 'Edit icon',
  delete: 'Delete icon',
  download: 'Download icon',
  upload: 'Upload icon',
  star: 'Star icon for favorites',
  check: 'Check mark icon',
  arrow: 'Arrow icon',
  loading: 'Loading spinner',
} as const;

/**
 * User Avatars
 */
export const AVATAR_ALT = {
  default: 'User avatar',
  placeholder: 'Default user avatar placeholder',
  team: 'Team member avatar',
  author: 'Blog post author avatar',
} as const;

/**
 * Blog and Content
 */
export const CONTENT_ALT = {
  featuredImage: (title: string) => `Featured image for "${title}"`,
  thumbnail: (title: string) => `Thumbnail for "${title}"`,
  authorPhoto: (name: string) => `Photo of ${name}`,
  categoryIcon: (category: string) => `${category} category icon`,
  tagIcon: (tag: string) => `${tag} tag icon`,
} as const;

/**
 * Social Media
 */
export const SOCIAL_ALT = {
  twitter: 'Follow Deskive on Twitter',
  linkedin: 'Connect with Deskive on LinkedIn',
  facebook: 'Like Deskive on Facebook',
  github: 'View Deskive on GitHub',
  youtube: 'Subscribe to Deskive on YouTube',
  instagram: 'Follow Deskive on Instagram',
} as const;

/**
 * Illustrations and Graphics
 */
export const ILLUSTRATION_ALT = {
  emptyState: 'Empty state illustration',
  noResults: 'No search results found illustration',
  error404: '404 page not found illustration',
  error500: 'Server error illustration',
  success: 'Success celebration illustration',
  teamwork: 'Team working together illustration',
  productivity: 'Productivity and efficiency illustration',
  security: 'Security and privacy illustration',
} as const;

/**
 * Pricing and Plans
 */
export const PRICING_ALT = {
  free: 'Free plan features icon',
  pro: 'Pro plan features icon',
  enterprise: 'Enterprise plan features icon',
  checkmark: 'Feature included checkmark',
  comparison: 'Pricing plans comparison table',
} as const;

/**
 * Placeholders
 */
export const PLACEHOLDER_ALT = {
  image: 'Image placeholder',
  avatar: 'Avatar placeholder',
  thumbnail: 'Thumbnail placeholder',
  loading: 'Loading placeholder',
} as const;

/**
 * Get alt text for dynamic images
 * Helper functions for generating alt text programmatically
 */
export const getAltText = {
  /**
   * Generate alt text for user avatar
   */
  avatar: (userName?: string) => {
    return userName ? `${userName}'s avatar` : AVATAR_ALT.default;
  },

  /**
   * Generate alt text for workspace logo
   */
  workspaceLogo: (workspaceName?: string) => {
    return workspaceName ? `${workspaceName} workspace logo` : 'Workspace logo';
  },

  /**
   * Generate alt text for file thumbnail
   */
  file: (fileName: string, fileType: string) => {
    return `${fileName} ${fileType} file thumbnail`;
  },

  /**
   * Generate alt text for project screenshot
   */
  project: (projectName: string) => {
    return `${projectName} project view`;
  },

  /**
   * Generate alt text for blog featured image
   */
  blogFeatured: (postTitle: string) => {
    return `Featured image for blog post: ${postTitle}`;
  },

  /**
   * Generate alt text for category image
   */
  category: (categoryName: string) => {
    return `${categoryName} category illustration`;
  },
} as const;
