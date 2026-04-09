'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  ChevronRight,
  Target,
  Eye
} from 'lucide-react'

interface DashboardRightSidebarProps {
  activeTab?: string
  dashboardData?: any
}

interface TeamMember {
  id: string
  name: string
  role: string
  status: 'online' | 'offline' | 'busy'
  avatar: string
  lastActive?: string
  activity?: string
}

export function DashboardRightSidebar({ activeTab = 'overview', dashboardData }: DashboardRightSidebarProps) {
  const [currentTab, setCurrentTab] = useState(activeTab)

  // TODO: Fetch real team members from workspace API
  const [teamMembers] = useState<TeamMember[]>([])

  const stats = dashboardData?.metrics

  console.log('📊 [RightSidebar] Dashboard Data:', dashboardData)
  console.log('📊 [RightSidebar] Stats:', stats)

  // Listen for tab changes
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const { tab } = event.detail
      setCurrentTab(tab)
    }

    window.addEventListener('dashboardTabChange', handleTabChange as EventListener)

    return () => {
      window.removeEventListener('dashboardTabChange', handleTabChange as EventListener)
    }
  }, [])

  useEffect(() => {
    setCurrentTab(activeTab)
  }, [activeTab])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'busy':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  // Render content - Show dashboard stats (same as main dashboard)
  const renderContent = () => {
    return (
      <>
        {/* Workspace Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View dashboard statistics
            </CardTitle>
          </CardHeader>
          {/* <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Members</span>
              <span className="font-semibold text-sm">{stats?.summary?.totalTeamMembers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Events</span>
              <span className="font-semibold text-sm">{stats?.summary?.totalEvents || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Tasks</span>
              <span className="font-semibold text-sm">{stats?.summary?.totalTasks || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Messages</span>
              <span className="font-semibold text-sm">{stats?.summary?.totalMessages || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Files</span>
              <span className="font-semibold text-sm">{stats?.summary?.totalFiles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Projects</span>
              <span className="font-semibold text-sm">{stats?.summary?.totalProjects || 0}</span>
            </div>
          </CardContent> */}
        </Card>
      </>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Workspace Stats
        </h3>
      </div>

      {/* Dynamic Content */}
      {renderContent()}

      {/* Upcoming Meetings - Commented out */}
      {/* <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No upcoming events
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}

