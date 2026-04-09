// Dashboard Type Definitions

export interface DashboardMetrics {
  totalMessages: number
  totalProjects: number
  totalFiles: number
  totalMembers: number
  completedTasks: number
  totalTasks: number
  storageUsed: number
  storageLimit: number
  activeIntegrations?: number
  totalEvents?: number
  totalNotes?: number
  totalSearches?: number
}

export interface RecentActivity {
  id: string
  type: 'message' | 'project' | 'file' | 'calendar' | 'integration' | 'video' | 'note'
  title: string
  description: string
  timestamp: Date
  user: {
    name: string
    avatar?: string
  }
  metadata?: {
    channel?: string
    project?: string
    fileType?: string
  }
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  action: () => void
}

export interface ProjectData {
  name: string
  value: number
  color: string
  status: string
}

export interface ActivityData {
  date: string
  messages: number
  files: number
  tasks: number
  meetings: number
  notes?: number
  integrations?: number
  videoCalls?: number
}

export interface TeamProductivity {
  member: string
  tasks: number
  messages: number
  files: number
  meetings: number
  productivity: number
}

export interface IntegrationUsage {
  name: string
  usage: number
  status: 'active' | 'inactive' | 'error'
  lastSync: string
  icon: string
}

export interface PerformanceMetric {
  name: string
  value: number
  previousValue: number
  target: number
  unit: string
}

export interface SystemStatus {
  name: string
  status: 'operational' | 'degraded' | 'down'
  uptime: number
  responseTime: number
  icon: React.ComponentType<{ className?: string }>
}

export interface HeatmapData {
  hour: number
  day: string
  value: number
}

export interface TreemapData {
  name: string
  size: number
  fill?: string
  children?: TreemapData[]
}

export interface TopProject {
  id: string
  name: string
  progress: number
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  members: number
  status: string
  tasksCompleted: number
  totalTasks: number
}

export interface UpcomingEvent {
  id: string
  title: string
  time: string
  date: string
  attendees: number
  type: string
  priority: 'high' | 'medium' | 'low'
}

export interface TeamActivityMember {
  id: string
  name: string
  role: string
  email: string
  status: 'online' | 'offline' | 'busy'
  avatar: string
  tasksCompleted: number
  messagesCount: number
  filesUploaded: number
  lastActive: Date
  productivityScore: number
  activeProjects: string[]
  recentActivity: string
}

export const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280'
}
