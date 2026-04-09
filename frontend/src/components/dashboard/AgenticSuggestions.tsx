import { useParams, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import {
  AlertTriangle,
  Video,
  MessageSquare,
  FileText,
  ArrowRight,
  Scale,
  Bell,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle,
  Hash,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSuggestions } from '@/lib/api/dashboard-api'
import type { Suggestion, SuggestionType, SuggestionPriority } from '@/lib/api/dashboard-api'

export function AgenticSuggestions() {
  const intl = useIntl()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()

  // Single API call to get all suggestions with user's language
  const { data: suggestionsData, isLoading, error } = useSuggestions(workspaceId || '', intl.locale)

  const suggestions = suggestionsData?.suggestions || []

  // Handle action click
  const handleAction = (suggestion: Suggestion) => {
    if (!workspaceId) return

    // Handle different action types
    if (suggestion.type === 'meeting' && suggestion.metadata?.meeting) {
      // Open video call in new window
      const callUrl = `/call/${workspaceId}/${suggestion.metadata.meeting.id}`
      const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
      window.open(callUrl, `video-call-${suggestion.metadata.meeting.id}`, windowFeatures)
    } else if (suggestion.actionUrl) {
      // Navigate to the action URL
      navigate(`/workspaces/${workspaceId}${suggestion.actionUrl}`)
    }
  }

  // Render helpers
  const getSuggestionIcon = (type: SuggestionType) => {
    switch (type) {
      case 'task_balance':
        return <Scale className="h-5 w-5" />
      case 'meeting':
        return <Video className="h-5 w-5" />
      case 'unread_message':
        return <MessageSquare className="h-5 w-5" />
      case 'note_update':
        return <FileText className="h-5 w-5" />
      case 'overdue_task':
        return <AlertTriangle className="h-5 w-5" />
      case 'upcoming_deadline':
        return <Clock className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getSuggestionColor = (type: SuggestionType, priority: SuggestionPriority) => {
    if (priority === 'high') {
      return 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800'
    }

    switch (type) {
      case 'task_balance':
        return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800'
      case 'meeting':
        return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800'
      case 'unread_message':
        return 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800'
      case 'note_update':
        return 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800'
      case 'overdue_task':
        return 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800'
    }
  }

  const getPriorityBadge = (priority: SuggestionPriority) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">{intl.formatMessage({ id: 'dashboard.suggestions.priority.high', defaultMessage: 'High Priority' })}</Badge>
      case 'medium':
        return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{intl.formatMessage({ id: 'dashboard.suggestions.priority.medium', defaultMessage: 'Medium' })}</Badge>
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {intl.formatMessage({ id: 'dashboard.suggestions.title', defaultMessage: 'Smart Suggestions' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {intl.formatMessage({ id: 'dashboard.suggestions.title', defaultMessage: 'Smart Suggestions' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-3" />
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'dashboard.suggestions.error', defaultMessage: 'Unable to load suggestions. Please try again later.' })}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {intl.formatMessage({ id: 'dashboard.suggestions.title', defaultMessage: 'Smart Suggestions' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-lg font-medium text-foreground">
              {intl.formatMessage({ id: 'dashboard.suggestions.allCaughtUp', defaultMessage: "You're all caught up!" })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'dashboard.suggestions.noSuggestions', defaultMessage: 'No immediate actions required. Great work!' })}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {intl.formatMessage({ id: 'dashboard.suggestions.title', defaultMessage: 'Smart Suggestions' })}
          <Badge variant="secondary" className="ml-auto">
            {suggestionsData?.totalCount || suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 5).map(suggestion => (
          <div
            key={suggestion.id}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border transition-all hover:shadow-sm",
              getSuggestionColor(suggestion.type, suggestion.priority)
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getSuggestionIcon(suggestion.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground truncate">{suggestion.title}</h4>
                {getPriorityBadge(suggestion.priority)}
              </div>
              <p className="text-sm text-muted-foreground">{suggestion.description}</p>

              {/* Additional metadata for task balance */}
              {suggestion.type === 'task_balance' && suggestion.metadata && (
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={suggestion.metadata.overloaded?.userAvatar} />
                      <AvatarFallback className="text-xs bg-red-100 text-red-700">
                        {suggestion.metadata.overloaded?.userName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-red-600">
                      {intl.formatMessage(
                        { id: 'dashboard.suggestions.metadata.tasks', defaultMessage: '{count} tasks' },
                        { count: suggestion.metadata.overloaded?.taskCount }
                      )}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={suggestion.metadata.underloaded?.userAvatar} />
                      <AvatarFallback className="text-xs bg-green-100 text-green-700">
                        {suggestion.metadata.underloaded?.userName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-green-600">
                      {intl.formatMessage(
                        { id: 'dashboard.suggestions.metadata.tasks', defaultMessage: '{count} tasks' },
                        { count: suggestion.metadata.underloaded?.taskCount }
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Additional metadata for meetings */}
              {suggestion.type === 'meeting' && suggestion.metadata?.meeting && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {suggestion.metadata.meeting.scheduledStartTime && (
                    <span>
                      {new Date(suggestion.metadata.meeting.scheduledStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                  {suggestion.metadata.meeting.callType && (
                    <Badge variant="outline" className="text-xs">
                      {suggestion.metadata.meeting.callType}
                    </Badge>
                  )}
                </div>
              )}

              {/* Additional metadata for unread messages */}
              {suggestion.type === 'unread_message' && suggestion.metadata?.chat && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {suggestion.metadata.chat.type === 'channel' ? (
                    <>
                      <Hash className="h-3 w-3" />
                      <span>{intl.formatMessage({ id: 'dashboard.suggestions.metadata.channel', defaultMessage: 'Channel' })}</span>
                      {suggestion.metadata.chat.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          {intl.formatMessage({ id: 'dashboard.suggestions.metadata.private', defaultMessage: 'Private' })}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      <span>{intl.formatMessage({ id: 'dashboard.suggestions.metadata.directMessage', defaultMessage: 'Direct Message' })}</span>
                    </>
                  )}
                </div>
              )}

              {/* Additional metadata for overdue tasks */}
              {suggestion.type === 'overdue_task' && suggestion.metadata?.dueDate && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {intl.formatMessage({ id: 'dashboard.suggestions.metadata.due', defaultMessage: 'Due' })}: {new Date(suggestion.metadata.dueDate).toLocaleDateString()}
                  </span>
                  {suggestion.metadata.daysOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      {intl.formatMessage(
                        {
                          id: 'dashboard.suggestions.metadata.daysOverdue',
                          defaultMessage: '{count} {count, plural, one {day} other {days}} overdue'
                        },
                        { count: suggestion.metadata.daysOverdue }
                      )}
                    </Badge>
                  )}
                </div>
              )}

              {/* AI-powered recommendation */}
              {suggestion.metadata?.aiRecommendation && (
                <div className="flex items-start gap-2 mt-3 p-2 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    {suggestion.metadata.aiRecommendation}
                  </p>
                </div>
              )}
            </div>
            {suggestion.actionLabel && (
              <Button
                size="sm"
                variant={suggestion.priority === 'high' ? 'default' : 'outline'}
                onClick={() => handleAction(suggestion)}
                className="flex-shrink-0"
              >
                {suggestion.type === 'meeting' ? (
                  <ExternalLink className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-1" />
                )}
                {suggestion.actionLabel}
              </Button>
            )}
          </div>
        ))}

        {suggestions.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              {intl.formatMessage(
                { id: 'dashboard.suggestions.showMore', defaultMessage: 'Show {count} more suggestions' },
                { count: suggestions.length - 5 }
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
