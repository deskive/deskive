import { useIntl } from 'react-intl'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent } from '../ui/card'
import { Users, Video, CheckCircle, Mail, FolderOpen, Briefcase } from 'lucide-react'
import type { DashboardMetrics } from './types'

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const intl = useIntl()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const handleNavigate = (path: string) => {
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/${path}`)
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleNavigate('settings/members')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalMembers}</p>
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.metrics.totalMembers' })}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleNavigate('calendar')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Video className="h-8 w-8 text-red-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalEvents}</p>
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.metrics.events' })}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleNavigate('projects')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalTasks}</p>
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.metrics.tasks' })}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleNavigate('chat')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Mail className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalMessages}</p>
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.metrics.messages' })}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleNavigate('files')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <FolderOpen className="h-8 w-8 text-orange-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalFiles}</p>
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.metrics.files' })}</p>
          </div>
        </CardContent>
      </Card>

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleNavigate('projects')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Briefcase className="h-8 w-8 text-indigo-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metrics.totalProjects}</p>
            <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.metrics.projects' })}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
