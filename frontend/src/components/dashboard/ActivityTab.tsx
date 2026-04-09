import { useIntl } from 'react-intl'
import { Card, CardContent } from '../ui/card'
import { ActivityLogTable } from './ActivityLogTable'
import { TrendingUp, TrendingDown, MessageSquare, Upload, CheckCircle, Video } from 'lucide-react'
import type { RecentActivity } from './types'

interface ActivityTabProps {
  activities: RecentActivity[]
  todayStats?: {
    messagesCount: number
    filesUploaded: number
    tasksCompleted: number
    videoCallsCount: number
  }
}

export function ActivityTab({ activities, todayStats }: ActivityTabProps) {
  const intl = useIntl()
  // Use real stats from API or fallback to zeros
  const activityStats = {
    messagesToday: todayStats?.messagesCount || 0,
    messagesChange: 0,
    filesUploaded: todayStats?.filesUploaded || 0,
    filesChange: 0,
    tasksCompleted: todayStats?.tasksCompleted || 0,
    tasksChange: 0,
    videoCalls: todayStats?.videoCallsCount || 0,
    videoCallsChange: 0
  }

  return (
    <div className="space-y-6">
      {/* Activity Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.activity.messagesToday' })}</p>
                <p className="text-2xl font-bold">{activityStats.messagesToday}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {intl.formatMessage({ id: 'dashboard.activity.noData' })}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.activity.filesUploaded' })}</p>
                <p className="text-2xl font-bold">{activityStats.filesUploaded}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {intl.formatMessage({ id: 'dashboard.activity.noData' })}
                </p>
              </div>
              <Upload className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.activity.tasksCompleted' })}</p>
                <p className="text-2xl font-bold">{activityStats.tasksCompleted}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {intl.formatMessage({ id: 'dashboard.activity.noData' })}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'dashboard.activity.videoCalls' })}</p>
                <p className="text-2xl font-bold">{activityStats.videoCalls}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {intl.formatMessage({ id: 'dashboard.activity.noData' })}
                </p>
              </div>
              <Video className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log Table */}
      <ActivityLogTable activities={activities} />
    </div>
  )
}
