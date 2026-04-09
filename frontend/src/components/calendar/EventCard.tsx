import { useState } from 'react'
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'
import { getEventColor, formatEventTime, formatEventDuration } from '../../lib/calendar-utils'
import { useCalendarStore } from '../../stores/calendarStore'
import { Clock, MapPin, Users, Lock, Repeat, ExternalLink } from 'lucide-react'

// Google Calendar icon as inline SVG component
const GoogleCalendarIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V8.25h15v11.25z"/>
    <path d="M12 10.5h4.5v1.5H12zm0 3h4.5v1.5H12zm-4.5-3H9v1.5H7.5zm0 3H9v1.5H7.5z" fill="#4285F4"/>
  </svg>
)

interface EventCardProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
  onDrop?: (newDate: Date) => void
  isSelected?: boolean
  compact?: boolean
  showTime?: boolean
  draggable?: boolean
  className?: string
}

export function EventCard({
  event,
  onClick,
  onDrop,
  isSelected = false,
  compact = false,
  showTime = false,
  draggable = false,
  className
}: EventCardProps) {
  const { categories } = useCalendarStore()
  const [isDragging, setIsDragging] = useState(false)

  const eventColor = getEventColor(event, categories)
  const category = categories.find(cat => cat.id === event.categoryId)
  
  // Get date-based styling
  const getDateBasedStyle = () => {
    const eventDate = new Date(event.startTime)
    const now = new Date()
    
    if (isToday(eventDate)) {
      return {
        className: 'border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-950/50 hover:bg-green-100/80 dark:hover:bg-green-900/50',
        accentBarClass: 'bg-green-500 dark:bg-green-400',
        borderColor: 'rgb(34 197 94)', // green-500
        backgroundColor: 'rgb(34 197 94 / 0.08)',
        darkBackgroundColor: 'rgb(34 197 94 / 0.15)'
      }
    } else if (isTomorrow(eventDate)) {
      return {
        className: 'border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100/80 dark:hover:bg-blue-900/50',
        accentBarClass: 'bg-blue-500 dark:bg-blue-400',
        borderColor: 'rgb(59 130 246)', // blue-500
        backgroundColor: 'rgb(59 130 246 / 0.08)',
        darkBackgroundColor: 'rgb(59 130 246 / 0.15)'
      }
    } else if (isPast(startOfDay(eventDate))) {
      return {
        className: 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/30 hover:bg-gray-100 dark:hover:bg-gray-900/30 opacity-70',
        accentBarClass: 'bg-gray-400 dark:bg-gray-600',
        borderColor: 'rgb(156 163 175)', // gray-400
        backgroundColor: 'rgb(156 163 175 / 0.05)',
        darkBackgroundColor: 'rgb(156 163 175 / 0.1)',
        opacity: 0.7
      }
    }
    
    return null
  }
  
  const dateStyle = getDateBasedStyle()

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return
    setIsDragging(true)
    
    // Store event data for the drag operation
    e.dataTransfer.setData('application/json', JSON.stringify({
      eventId: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay
    }))
    e.dataTransfer.effectAllowed = 'move'
    
    // Create a simple, small drag image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 100
    canvas.height = 30
    
    if (ctx) {
      // Draw a simple rounded rectangle
      ctx.fillStyle = eventColor + '40'
      ctx.fillRect(0, 0, 100, 30)
      ctx.fillStyle = eventColor
      ctx.fillRect(0, 0, 4, 30)
      ctx.fillStyle = eventColor
      ctx.font = '12px sans-serif'
      ctx.fillText(event.title.substring(0, 12), 8, 20)
    }
    
    e.dataTransfer.setDragImage(canvas, 50, 15)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    // If event is synced from Google Calendar, open it in Google Calendar instead of edit dialog
    if (event.syncedFromGoogle && event.googleCalendarHtmlLink) {
      window.open(event.googleCalendarHtmlLink, '_blank', 'noopener,noreferrer')
      return
    }

    onClick(event)
  }

  const priorityStyles = {
    urgent: 'ring-2 ring-red-500',
    high: 'ring-1 ring-orange-400',
    normal: '',
    low: 'opacity-80'
  }

  const statusStyles = {
    confirmed: '',
    tentative: 'border-dashed',
    cancelled: 'opacity-50 grayscale',
    pending: 'border-dotted'
  }

  if (compact) {
    // Create shortened title for compact view - keep only first word for very small events
    const getDisplayTitle = () => {
      const maxLength = 20
      if (event.title.length <= maxLength) return event.title
      
      // For very long titles, show first word + "..."
      const firstWord = event.title.split(' ')[0]
      return firstWord.length > 15 ? firstWord.substring(0, 12) + '...' : firstWord + '...'
    }

    const timeText = !event.isAllDay ? format(new Date(event.startTime), 'h:mm') : ''
    
    // Disable dragging for Google Calendar synced events
    const canDrag = draggable && !event.syncedFromGoogle

    // Build title with Google Calendar hint if applicable
    const cardTitle = event.syncedFromGoogle && event.googleCalendarHtmlLink
      ? `${event.title}${timeText ? ` (${timeText})` : ''} - Click to open in Google Calendar`
      : `${event.title}${timeText ? ` (${timeText})` : ''}${event.location ? ` @ ${typeof event.location === 'string' ? event.location : event.location.name}` : ''}${event.description ? ` - ${event.description}` : ''}`

    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border transition-all duration-200 hover:shadow-md",
          "h-full flex flex-col justify-center text-card-foreground",
          isSelected && "ring-2 ring-indigo-500 ring-offset-1",
          isDragging && "opacity-50 scale-95 shadow-lg z-50",
          canDrag && "hover:scale-[1.02]",
          event.syncedFromGoogle && "cursor-pointer",
          priorityStyles[event.priority],
          statusStyles[event.status],
          dateStyle?.className || "border-border/50 bg-card hover:bg-accent/5",
          className
        )}
        onClick={handleClick}
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title={cardTitle}
      >
        {/* Left accent bar - thinner for better proportions */}
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-0.5",
            dateStyle?.accentBarClass || ""
          )}
          style={{
            backgroundColor: !dateStyle ? eventColor : undefined
          }}
        />
        
        <div className="pl-2 pr-2 py-1.5">
          <div className="flex flex-col gap-0.5 min-w-0 h-full justify-center">
            <div className="flex items-center gap-1 min-w-0">
              {event.syncedFromGoogle && (
                <GoogleCalendarIcon className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />
              )}
              {event.isPrivate && <Lock className="h-2 w-2 opacity-60 flex-shrink-0" />}
              {event.recurrence && <Repeat className="h-2 w-2 opacity-60 flex-shrink-0" />}
              <span className="font-medium truncate text-xs leading-tight">{getDisplayTitle()}</span>
            </div>

            {showTime && !event.isAllDay && (
              <div className="text-xs opacity-70 leading-tight">
                {timeText}
              </div>
            )}
          </div>
        </div>

        {/* Google Calendar indicator for compact events */}
        {event.syncedFromGoogle && (
          <div className="absolute top-0.5 right-0.5">
            <div
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
              title={event.googleCalendarHtmlLink ? "Click to open in Google Calendar" : "Synced from Google Calendar"}
            />
          </div>
        )}

        {/* Drag handle for compact events */}
        {draggable && !event.syncedFromGoogle && (
          <div className="absolute top-0 right-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity">
            <div className="absolute top-1 right-1 w-1 h-1 bg-current opacity-40 rounded-full" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
        "text-card-foreground h-full flex flex-col",
        isSelected && "ring-2 ring-indigo-500 ring-offset-2",
        isDragging && "opacity-50 scale-95",
        priorityStyles[event.priority],
        statusStyles[event.status],
        dateStyle?.className || "border-border/50 bg-card hover:bg-accent/5",
        className
      )}
      onClick={handleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Left accent bar - thinner for better proportions */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5",
          dateStyle?.accentBarClass || ""
        )}
        style={{
          backgroundColor: !dateStyle ? eventColor : undefined
        }}
      />
      
      <div className="pl-2 pr-2 py-1.5 flex-1 flex flex-col min-h-0">
        {/* Event header - always visible */}
        <div className="flex items-start justify-between gap-1 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              {event.syncedFromGoogle && (
                <GoogleCalendarIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
              )}
              {event.isPrivate && <Lock className="h-2 w-2 text-muted-foreground/60 flex-shrink-0" />}
              {event.recurrence && <Repeat className="h-2 w-2 text-muted-foreground/60 flex-shrink-0" />}
              <h3 className="font-medium text-xs truncate leading-tight">{event.title}</h3>
            </div>
            
            {/* Time - show inline on first line for compact events */}
            {!event.isAllDay && showTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                <Clock className="h-2 w-2 flex-shrink-0" />
                <span className="truncate leading-tight">{formatEventTime(new Date(event.startTime), new Date(event.endTime), false)}</span>
              </div>
            )}
          </div>

          {/* Priority indicator - compact */}
          <div className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5",
            event.priority === 'urgent' && "bg-red-500",
            event.priority === 'high' && "bg-orange-500", 
            event.priority === 'normal' && "bg-blue-500",
            event.priority === 'low' && "bg-gray-400"
          )} />
        </div>

        {/* Secondary content - only show if there's enough height */}
        <div className="flex-1 min-h-0 overflow-hidden mt-0.5">
          {/* Event description */}
          {event.description && (
            <p className="text-xs text-muted-foreground/70 mb-0.5 line-clamp-1 leading-tight">
              {event.description}
            </p>
          )}

          {/* Location and attendees - compact layout */}
          <div className="space-y-0.5">
            {event.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                <MapPin className="h-2 w-2 flex-shrink-0" />
                <span className="truncate">{typeof event.location === 'string' ? event.location : event.location.name}</span>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                <Users className="h-2 w-2 flex-shrink-0" />
                <span className="truncate">{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event tags - positioned at bottom */}
      {event.tags.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-wrap gap-1">
          {event.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1 py-0.5 bg-muted text-xs rounded text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {event.tags.length > 2 && (
            <span className="px-1 py-0.5 bg-muted text-xs rounded text-muted-foreground">
              +{event.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Google Calendar badge */}
      {event.syncedFromGoogle && (
        <div className="px-2 pb-1 flex items-center gap-1">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-600 dark:text-blue-400">
            <GoogleCalendarIcon className="h-2.5 w-2.5" />
            <span>Google</span>
            {event.googleCalendarHtmlLink && (
              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
            )}
          </div>
        </div>
      )}

      {/* Category indicator */}
      {category && !event.syncedFromGoogle && (
        <div
          className="absolute bottom-1 right-1 w-3 h-3 rounded-full opacity-60"
          style={{ backgroundColor: category.color }}
          title={category.name}
        />
      )}
      
      {/* Drag handle */}
      {draggable && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-muted-foreground/40 rounded-full" />
        </div>
      )}

      {/* Status indicator */}
      {event.status !== 'confirmed' && (
        <div className="absolute top-2 left-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            event.status === 'tentative' && "bg-yellow-500",
            event.status === 'cancelled' && "bg-red-500",
            event.status === 'pending' && "bg-gray-500"
          )} />
        </div>
      )}
    </div>
  )
}