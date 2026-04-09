/**
 * Event Preview Dialog
 * A read-only dialog for viewing event details from attachments
 */

import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Tag,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { CalendarEventAPI } from '@/types/calendar'

interface EventPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEventAPI | null
  isLoading?: boolean
}

export function EventPreviewDialog({
  isOpen,
  onClose,
  event,
  isLoading = false,
}: EventPreviewDialogProps) {
  const formatEventTime = (startTime: string, endTime: string, allDay: boolean) => {
    if (allDay) {
      return 'All day'
    }
    const start = new Date(startTime)
    const end = new Date(endTime)
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  const formatEventDate = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const sameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')

    if (sameDay) {
      return format(start, 'EEEE, MMMM d, yyyy')
    }
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'tentative':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p>Loading event...</p>
    </div>
  )

  const renderContent = () => {
    if (!event) return null

    return (
      <div className="space-y-4">
        {/* Date and Time */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">{formatEventDate(event.startTime || event.start_time || '', event.endTime || event.end_time || '')}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatEventTime(event.startTime || event.start_time || '', event.endTime || event.end_time || '', event.allDay ?? event.all_day ?? false)}
            </p>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <p>{event.location}</p>
          </div>
        )}

        {/* Meeting URL */}
        {event.meeting_url && (
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
            <a
              href={event.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate max-w-[300px]"
            >
              {event.meeting_url}
            </a>
          </div>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</p>
              <div className="flex flex-wrap gap-1">
                {event.attendees.slice(0, 5).map((attendee, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {typeof attendee === 'string' ? attendee : (attendee.name || attendee.email)}
                  </Badge>
                ))}
                {event.attendees.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{event.attendees.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Description */}
        {event.description && (
          <div>
            <p className="text-sm font-medium mb-2">Description</p>
            <div
              className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        {/* Status and Priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getPriorityColor(event.priority)}>
            {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)} Priority
          </Badge>
          <Badge className={getStatusColor(event.status)}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
          {event.visibility === 'private' && (
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Private
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isLoading ? 'Loading...' : (event?.title || 'Event Details')}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-200px)] overflow-auto">
          {isLoading ? renderLoading() : renderContent()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
