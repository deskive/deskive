import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { SimpleDashboardFilters } from '../components/dashboard/SimpleDashboardFilters'
import type { SimpleDashboardFilters as DashboardFiltersType } from '../components/dashboard/SimpleDashboardFilters'
import { OverviewTab } from '../components/dashboard/OverviewTab'
import { ActivityTab } from '../components/dashboard/ActivityTab'
import { AnalyticsTab } from '../components/dashboard/AnalyticsTab'
import { useDashboardMetrics, useActivityTrendData } from '../components/dashboard/useDashboardData'
import { useDashboard } from '../lib/api/dashboard-api'
import { useWorkspaceMembers } from '../lib/api/workspace-api'
import { calendarApi } from '../lib/api/calendar-api'
import { useProjects, projectService } from '../lib/api/projects-api'
import { chatService } from '../lib/api/chat-api'
import { useFilesAndFolders } from '../lib/api/files-api'
import type {
  RecentActivity,
  QuickAction,
  IntegrationUsage,
  TopProject,
  UpcomingEvent
} from '../components/dashboard/types'
import {
  Plus,
  MessageCircle,
  FileImage,
  CalendarDays,
  BookOpen,
  Link2
} from 'lucide-react'

export default function Dashboard() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const intl = useIntl()
  const [selectedTab, setSelectedTab] = useState('overview')

  // Dashboard filtering state
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFiltersType>({
    dateRange: {
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date())
    },
    dateFilterType: 'last7days',
    aggregationPeriod: 'daily'
  })

  // Fetch workspace members for accurate member count
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Fetch projects for projects count
  const { data: projectsResponse } = useProjects(workspaceId || '')
  const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse?.data || [])
  const projectsCount = projects.length

  // Fetch files for files count
  const { data: files = [], isLoading: isLoadingFiles } = useFilesAndFolders(workspaceId || '', null)
  const filesCount = files.length

  console.log('📁 Files from API:', files)
  console.log('📁 Files Count:', filesCount)
  console.log('📁 Is Loading Files:', isLoadingFiles)

  // Fetch all tasks from all projects
  const [tasksCount, setTasksCount] = useState(0)
  useEffect(() => {
    if (workspaceId && projects.length > 0) {
      Promise.all(
        projects.map(project => projectService.getTasks(workspaceId, project.id))
      ).then(taskArrays => {
        const allTasks = taskArrays.flat()
        setTasksCount(allTasks.length)
        console.log('✅ Total Tasks Count:', allTasks.length)
      }).catch(err => {
        console.error('Failed to fetch tasks:', err)
        setTasksCount(0)
      })
    } else {
      setTasksCount(0)
    }
  }, [workspaceId, projects.length])

  // Fetch calendar events for accurate events count
  const [eventsCount, setEventsCount] = useState(0)
  useEffect(() => {
    if (workspaceId) {
      calendarApi.getEvents(workspaceId, {
        start: dashboardFilters.dateRange.from.toISOString(),
        end: dashboardFilters.dateRange.to.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }).then(events => {
        setEventsCount(events.length)
        console.log('📅 Events Count:', events.length)
      }).catch(err => {
        console.error('Failed to fetch events:', err)
        setEventsCount(0)
      })
    }
  }, [workspaceId, dashboardFilters.dateRange])

  // Fetch conversations and count all messages
  const [messagesCount, setMessagesCount] = useState(0)
  useEffect(() => {
    if (workspaceId) {
      // First get all conversations
      chatService.getConversations(workspaceId)
        .then(conversations => {
          console.log('💬 Conversations:', conversations.length)
          if (conversations.length === 0) {
            setMessagesCount(0)
            return
          }

          // Then fetch messages for each conversation
          Promise.all(
            conversations.map(conversation =>
              chatService.getConversationMessages(workspaceId, conversation.id, { limit: 1000 })
            )
          ).then(messagesArrays => {
            const totalMessages = messagesArrays.reduce((total, response) => {
              const messages = response.data || []
              return total + messages.length
            }, 0)
            setMessagesCount(totalMessages)
            console.log('💬 Total Messages Count:', totalMessages)
          }).catch(err => {
            console.error('Failed to fetch messages:', err)
            setMessagesCount(0)
          })
        })
        .catch(err => {
          console.error('Failed to fetch conversations:', err)
          setMessagesCount(0)
        })
    }
  }, [workspaceId])

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboard(
    workspaceId || '',
    {
      startDate: dashboardFilters.dateRange.from.toISOString(),
      endDate: dashboardFilters.dateRange.to.toISOString(),
      limit: 20
    }
  )

  // Get dynamic data from hooks (fallback to old hooks if needed)
  const fallbackMetrics = useDashboardMetrics(dashboardFilters)
  const activityTrend = useActivityTrendData(dashboardFilters)

  // Transform API data and override with real API counts
  const apiMetrics = dashboardData?.metrics

  // Always use real counts from direct API calls, fallback to dashboard API if needed
  const transformedMetrics = {
    totalMembers: workspaceMembers.length || apiMetrics?.summary?.totalTeamMembers || 0,
    totalEvents: eventsCount || apiMetrics?.summary?.totalEvents || 0,
    totalTasks: tasksCount || apiMetrics?.summary?.totalTasks || 0,
    completedTasks: apiMetrics?.summary?.completedTasks || 0,
    totalMessages: messagesCount || apiMetrics?.summary?.totalMessages || 0,
    totalFiles: filesCount || apiMetrics?.summary?.totalFiles || 0,
    totalProjects: projectsCount || apiMetrics?.summary?.totalProjects || 0,
    storageUsed: apiMetrics?.summary?.storageUsed || 0,
    storageLimit: 15 * 1024 * 1024 * 1024, // 15GB default
    activeIntegrations: apiMetrics?.summary?.integrations || 0,
  }

  const metrics = transformedMetrics

 

  // Listen for dashboard tab change events from left sidebar
  useEffect(() => {
    const handleDashboardTabChange = (event: CustomEvent) => {
      const { tab } = event.detail
      setSelectedTab(tab)
    }

    window.addEventListener('dashboardTabChange', handleDashboardTabChange as EventListener)

    return () => {
      window.removeEventListener('dashboardTabChange', handleDashboardTabChange as EventListener)
    }
  }, [])

  // TODO: Fetch real activity data from API
  // Example: const { data: recentActivity } = useQuery('recentActivity', fetchRecentActivity)
  const recentActivity: RecentActivity[] = []

  // TODO: Fetch real events from calendar API
  const upcomingEvents: UpcomingEvent[] = []

  // TODO: Fetch real projects from projects API
  const topProjects: TopProject[] = []

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: intl.formatMessage({ id: 'dashboard.quickActions.startProject' }),
      description: intl.formatMessage({ id: 'dashboard.quickActions.startProjectDesc' }),
      icon: Plus,
      color: 'bg-blue-500',
      action: () => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}/projects`)
        }
      }
    },
    {
      id: '2',
      title: intl.formatMessage({ id: 'dashboard.quickActions.sendMessage' }),
      description: intl.formatMessage({ id: 'dashboard.quickActions.sendMessageDesc' }),
      icon: MessageCircle,
      color: 'bg-green-500',
      action: () => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}/chat`)
        }
      }
    },
    {
      id: '3',
      title: intl.formatMessage({ id: 'dashboard.quickActions.uploadFiles' }),
      description: intl.formatMessage({ id: 'dashboard.quickActions.uploadFilesDesc' }),
      icon: FileImage,
      color: 'bg-purple-500',
      action: () => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}/files`)
        }
      }
    },
    {
      id: '4',
      title: intl.formatMessage({ id: 'dashboard.quickActions.scheduleMeeting' }),
      description: intl.formatMessage({ id: 'dashboard.quickActions.scheduleMeetingDesc' }),
      icon: CalendarDays,
      color: 'bg-orange-500',
      action: () => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}/calendar`)
        }
      }
    },
    {
      id: '5',
      title: intl.formatMessage({ id: 'dashboard.quickActions.takeNotes' }),
      description: intl.formatMessage({ id: 'dashboard.quickActions.takeNotesDesc' }),
      icon: BookOpen,
      color: 'bg-indigo-500',
      action: () => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}/notes`)
        }
      }
    },
    {
      id: '6',
      title: intl.formatMessage({ id: 'dashboard.quickActions.connectIntegration' }),
      description: intl.formatMessage({ id: 'dashboard.quickActions.connectIntegrationDesc' }),
      icon: Link2,
      color: 'bg-pink-500',
      action: () => {
        if (workspaceId) {
          navigate(`/workspaces/${workspaceId}/integrations`)
        }
      }
    }
  ]

  // TODO: Fetch real integration data from API
  const integrationUsage: IntegrationUsage[] = []

  const handleProjectClick = (projectId: string) => {
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/projects`)
    }
  }

  const handleEventClick = (eventId: string) => {
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/calendar`)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with AI Command Center */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold text-foreground">{intl.formatMessage({ id: 'dashboard.title' })}</h1>
              <p className="text-muted-foreground mt-1">
                {intl.formatMessage({ id: 'dashboard.welcomeMessage' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs
          value={selectedTab}
          onValueChange={(value) => {
            setSelectedTab(value)
            // Sync with left sidebar
            window.dispatchEvent(
              new CustomEvent('dashboardTabChange', {
                detail: { tab: value }
              })
            )
          }}
          className="space-y-6"
        >
          {/* Dashboard Filters - Commented out */}
          {/* <SimpleDashboardFilters currentFilters={dashboardFilters} onFiltersChange={setDashboardFilters} /> */}

          {/* Only Overview tab - Analytics and Activity commented out */}
          {/* <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList> */}

          <TabsContent value="overview">
            <OverviewTab
              metrics={metrics}
              activityData={activityTrend}
              integrations={integrationUsage}
              quickActions={quickActions}
              topProjects={topProjects}
              upcomingEvents={upcomingEvents}
              onProjectClick={handleProjectClick}
              onEventClick={handleEventClick}
            />
          </TabsContent>

          {/* Activity Tab - Commented out */}
          {/* <TabsContent value="activity">
            <ActivityTab
              activities={dashboardData?.recentActivity?.activities || recentActivity || []}
              todayStats={dashboardData?.metrics?.today}
            />
          </TabsContent> */}

          {/* Analytics Tab - Commented out */}
          {/* <TabsContent value="analytics">
            <AnalyticsTab metrics={metrics} activityData={activityTrend} integrations={integrationUsage} />
          </TabsContent> */}
        </Tabs>
      </div>
    </div>
  )
}
