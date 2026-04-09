import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table'
import {
  Activity,
  Search,
  MoreHorizontal,
  MessageSquare,
  Briefcase,
  FileText,
  Calendar,
  Link2,
  Video,
  BookOpen
} from 'lucide-react'
import { formatRelativeTime } from './useDashboardData'
import type { RecentActivity } from './types'

interface ActivityLogTableProps {
  activities: RecentActivity[]
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'message':
      return MessageSquare
    case 'project':
      return Briefcase
    case 'file':
      return FileText
    case 'calendar':
      return Calendar
    case 'integration':
      return Link2
    case 'video':
      return Video
    case 'note':
      return BookOpen
    default:
      return Activity
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'message':
      return 'text-blue-600 dark:text-blue-400'
    case 'project':
      return 'text-green-600 dark:text-green-400'
    case 'file':
      return 'text-purple-600 dark:text-purple-400'
    case 'calendar':
      return 'text-orange-600 dark:text-orange-400'
    case 'integration':
      return 'text-pink-600 dark:text-pink-400'
    case 'video':
      return 'text-red-600 dark:text-red-400'
    case 'note':
      return 'text-indigo-600 dark:text-indigo-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

export function ActivityLogTable({ activities = [] }: ActivityLogTableProps) {
  const intl = useIntl()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filteredActivities = useMemo(() => {
    if (!activities || !Array.isArray(activities)) return []

    return activities.filter((activity) => {
      const matchesSearch =
        searchQuery === '' ||
        activity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === 'all' || activity.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [activities, searchQuery, typeFilter])

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {intl.formatMessage({ id: 'dashboard.activityLog.title' })}
            </CardTitle>
            <CardDescription>{intl.formatMessage({ id: 'dashboard.activityLog.description' })}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={intl.formatMessage({ id: 'dashboard.activityLog.searchPlaceholder' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={intl.formatMessage({ id: 'dashboard.activityLog.filter.type' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{intl.formatMessage({ id: 'dashboard.activityLog.filter.allTypes' })}</SelectItem>
                <SelectItem value="message">{intl.formatMessage({ id: 'dashboard.activityLog.filter.messages' })}</SelectItem>
                <SelectItem value="project">{intl.formatMessage({ id: 'dashboard.activityLog.filter.projects' })}</SelectItem>
                <SelectItem value="file">{intl.formatMessage({ id: 'dashboard.activityLog.filter.files' })}</SelectItem>
                <SelectItem value="video">{intl.formatMessage({ id: 'dashboard.activityLog.filter.videoCalls' })}</SelectItem>
                <SelectItem value="note">{intl.formatMessage({ id: 'dashboard.activityLog.filter.notes' })}</SelectItem>
                <SelectItem value="integration">{intl.formatMessage({ id: 'dashboard.activityLog.filter.integrations' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{intl.formatMessage({ id: 'dashboard.activityLog.table.type' })}</TableHead>
                <TableHead>{intl.formatMessage({ id: 'dashboard.activityLog.table.activity' })}</TableHead>
                <TableHead>{intl.formatMessage({ id: 'dashboard.activityLog.table.user' })}</TableHead>
                <TableHead>{intl.formatMessage({ id: 'dashboard.activityLog.table.details' })}</TableHead>
                <TableHead>{intl.formatMessage({ id: 'dashboard.activityLog.table.projectChannel' })}</TableHead>
                <TableHead>{intl.formatMessage({ id: 'dashboard.activityLog.table.timestamp' })}</TableHead>
                <TableHead className="text-right">{intl.formatMessage({ id: 'dashboard.activityLog.table.actions' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const IconComponent = getActivityIcon(activity.type)
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div
                        className={`p-2 rounded-lg bg-background ${getActivityColor(activity.type)} w-fit`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-xs text-muted-foreground">{activity.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {activity.user?.avatar ? (
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={activity.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {activity.user.name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-[10px]">{activity.user?.name?.[0] || 'U'}</span>
                          </div>
                        )}
                        <span className="text-sm">{activity.user?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.metadata?.channel && (
                        <span className="text-sm">#{activity.metadata.channel}</span>
                      )}
                      {activity.metadata?.project && (
                        <span className="text-sm">{activity.metadata.project}</span>
                      )}
                      {activity.metadata?.fileType && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.metadata.fileType}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatRelativeTime(activity.timestamp)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
