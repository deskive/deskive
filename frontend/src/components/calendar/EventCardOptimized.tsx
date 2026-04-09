import { memo, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'
import { getEventColor, formatEventTime, formatEventDuration } from '../../lib/calendar-utils'
import { useCalendarStore } from '../../stores/calendarStore'
import { Clock, MapPin, Users, Lock, Repeat } from 'lucide-react'

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

// Memoized sub-components for better performance
const EventIcon = memo(({ icon: Icon, className }: { icon: any; className?: string }) => (
  <Icon className={className} />
))

const EventTag = memo(({ tag }: { tag: string }) => (
  <span className="px-1.5 py-0.5 bg-muted text-xs rounded text-muted-foreground">
    {tag}
  </span>
))

// Main component wrapped in React.memo for performance
export const EventCard = memo(function EventCard({
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
  
  // Memoize expensive calculations
  const eventColor = useMemo(() => getEventColor(event, categories), [event, categories])
  const category = useMemo(() => categories.find(cat => cat.id === event.categoryId), [categories, event.categoryId])

  // Memoize event handlers
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(event)
  }, [onClick, event])

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!draggable) return
    
    e.dataTransfer.setData('application/json', JSON.stringify({
      eventId: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay
    }))
    e.dataTransfer.effectAllowed = 'move'
  }, [draggable, event])

  // Memoize computed values
  const priorityClass = useMemo(() => {
    const styles = {
      urgent: 'ring-2 ring-red-500',
      high: 'ring-1 ring-orange-400',
      normal: '',
      low: 'opacity-80'
    }
    return styles[event.priority as keyof typeof styles]
  }, [event.priority])

  const statusClass = useMemo(() => {
    const styles = {
      confirmed: '',
      tentative: 'border-dashed',
      cancelled: 'opacity-50 grayscale',
      pending: 'border-dotted'
    }
    return styles[event.status]
  }, [event.status])

  const displayTitle = useMemo(() => {
    if (!compact) return event.title
    
    const maxLength = 20
    if (event.title.length <= maxLength) return event.title
    
    const firstWord = event.title.split(' ')[0]
    return firstWord.length > 15 ? firstWord.substring(0, 12) + '...' : firstWord + '...'
  }, [compact, event.title])

  const timeText = useMemo(() => 
    !event.isAllDay ? format(new Date(event.startTime), 'h:mm') : '',
    [event.isAllDay, event.startTime]
  )

  const cardStyle = useMemo(() => ({
    backgroundColor: compact ? `${eventColor}25` : undefined,
    borderLeftColor: eventColor,
    borderLeftWidth: compact ? '4px' : undefined,
    color: compact ? eventColor : undefined,
    minHeight: compact ? '20px' : undefined
  }), [compact, eventColor])

  // Compact view
  if (compact) {
    return (
      <div
        className={cn(
          "relative p-2 px-3 rounded-md text-xs cursor-pointer transition-all hover:shadow-md",
          "border-l-4 overflow-hidden h-full flex flex-col justify-center",
          isSelected && "ring-2 ring-indigo-500 ring-offset-1",
          draggable && "hover:shadow-md hover:scale-[1.02]",
          priorityClass,
          statusClass,
          className
        )}
        style={cardStyle}
        onClick={handleClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        title={`${event.title}${timeText ? ` (${timeText})` : ''}`}
      >
        <div className="flex flex-col gap-1 min-w-0 h-full justify-center">
          <div className="flex items-center gap-1 min-w-0">
            {event.isPrivate && <EventIcon icon={Lock} className="h-2 w-2 opacity-60 flex-shrink-0" />}
            {event.recurrence && <EventIcon icon={Repeat} className="h-2 w-2 opacity-60 flex-shrink-0" />}
            <span className="font-medium truncate text-xs leading-tight">{displayTitle}</span>
          </div>
          
          {showTime && !event.isAllDay && (
            <div className="text-xs opacity-75">{timeText}</div>
          )}
        </div>
      </div>
    )
  }

  // Full view
  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md group",
        "bg-card text-card-foreground",
        isSelected && "ring-2 ring-indigo-500 ring-offset-2",
        priorityClass,
        statusClass,
        className
      )}
      style={{ borderLeftColor: eventColor, borderLeftWidth: '4px' }}
      onClick={handleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Event header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {event.isPrivate && <EventIcon icon={Lock} className="h-3 w-3 text-muted-foreground" />}
            {event.recurrence && <EventIcon icon={Repeat} className="h-3 w-3 text-muted-foreground" />}
            <h3 className="font-semibold text-sm truncate">{event.title}</h3>
          </div>
          
          {!event.isAllDay && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <EventIcon icon={Clock} className="h-3 w-3" />
              <span>{formatEventTime(new Date(event.startTime), new Date(event.endTime), false)}</span>
              <span className="text-xs opacity-75">
                ({formatEventDuration(new Date(event.startTime), new Date(event.endTime))})
              </span>
            </div>
          )}
        </div>

        {/* Priority indicator */}
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          event.priority === 'urgent' && "bg-red-500",
          event.priority === 'high' && "bg-orange-500",
          event.priority === 'normal' && "bg-blue-500",
          event.priority === 'low' && "bg-gray-400"
        )} />
      </div>

      {/* Event description */}
      {event.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {event.description}
        </p>
      )}

      {/* Event details */}
      <div className="space-y-1">
        {event.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <EventIcon icon={MapPin} className="h-3 w-3" />
            <span className="truncate">{typeof event.location === 'string' ? event.location : event.location.name}</span>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <EventIcon icon={Users} className="h-3 w-3" />
            <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Event tags */}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.slice(0, 2).map((tag) => (
            <EventTag key={tag} tag={tag} />
          ))}
          {event.tags.length > 2 && (
            <span className="px-1.5 py-0.5 bg-muted text-xs rounded text-muted-foreground">
              +{event.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Category indicator */}
      {category && (
        <div 
          className="absolute bottom-1 right-1 w-3 h-3 rounded-full opacity-60"
          style={{ backgroundColor: category.color }}
          title={category.name}
        />
      )}
    </div>
  )
})

// Display name for React DevTools
EventCard.displayName = 'EventCard'