import { useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { useIntl } from 'react-intl'
import { useCalendarStore } from '../../stores/calendarStore'
import { EventCard } from './EventCard'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'

interface MonthViewProps {
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
  onEventDrop: (eventId: string, newStartTime: Date) => void
}

export function MonthView({ onEventClick, onDateClick, onEventDrop }: MonthViewProps) {
  const intl = useIntl()
  const { currentDate, getVisibleEvents, selectedEventId } = useCalendarStore()
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null)

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    })
  }, [currentDate])

  const events = getVisibleEvents()

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startTime)
      return isSameDay(eventStart, day)
    }).sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    })
  }

  // Drag and drop handlers for month view
  const handleDragOver = (e: React.DragEvent, day: Date) => {
    e.preventDefault()
    setDragOverDay(day)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverDay(null)
    }
  }

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault()
    setDragOverDay(null)
    
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (eventData.eventId) {
        // For month view, preserve the time but change the date
        const originalStartTime = new Date(eventData.startTime)
        const newStartTime = new Date(day)
        newStartTime.setHours(originalStartTime.getHours())
        newStartTime.setMinutes(originalStartTime.getMinutes())
        onEventDrop(eventData.eventId, newStartTime)
      }
    } catch (error) {
      console.error('Error handling drop in month view:', error)
    }
  }

  const isDragTarget = (day: Date) => {
    return dragOverDay && isSameDay(dragOverDay, day)
  }

  const weekDays = [
    intl.formatMessage({ id: 'modules.calendar.monthView.sun' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.mon' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.tue' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.wed' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.thu' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.fri' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.sat' })
  ]
  const weekDaysShort = [
    intl.formatMessage({ id: 'modules.calendar.monthView.sunShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.monShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.tueShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.wedShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.thuShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.friShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.satShort' })
  ]
  const weeks = []

  for (let i = 0; i < monthDays.length; i += 7) {
    weeks.push(monthDays.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Month header with days of week */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day, index) => (
          <div key={day} className="p-1 sm:p-3 text-center text-xs sm:text-sm font-medium text-muted-foreground border-r border-border last:border-r-0 min-w-0">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysShort[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0" style={{ minHeight: '120px' }}>
            {week.map((day) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isCurrentDay = isToday(day)
              const maxVisibleEvents = 3

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-border last:border-r-0 p-1 sm:p-2 cursor-pointer hover:bg-muted/50 transition-colors relative min-w-0",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isDragTarget(day) && "bg-primary/20 ring-2 ring-primary/50"
                  )}
                  onClick={() => onDateClick(day)}
                  onDragOver={(e) => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  {/* Date number */}
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-medium w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center",
                        isCurrentDay && "gradient-primary text-white",
                        !isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    
                    {/* Event count indicator */}
                    {dayEvents.length > maxVisibleEvents && (
                      <span className="text-xs text-muted-foreground bg-muted rounded px-1">
                        +{dayEvents.length - maxVisibleEvents}
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5 relative z-20">
                    {dayEvents.slice(0, maxVisibleEvents).map((event, index) => (
                      <EventCard
                        key={`${event.id}-${index}`}
                        event={event}
                        onClick={() => onEventClick(event)}
                        onDrop={(newDate: Date) => onEventDrop(event.id, newDate)}
                        isSelected={event.id === selectedEventId}
                        compact
                        className="text-xs"
                        draggable
                      />
                    ))}
                  </div>

                  {/* Drop indicator */}
                  {isDragTarget(day) && (
                    <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 rounded-md bg-gradient-to-r from-blue-500/10 to-indigo-500/10 z-30 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium bg-white/90 px-2 py-1 rounded">
                        {intl.formatMessage({ id: 'modules.calendar.monthView.dropHere' })}
                      </div>
                    </div>
                  )}

                  {/* Hover overlay for creating new events */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-1 right-1">
                      <button
                        className="w-5 h-5 rounded-full btn-gradient-primary flex items-center justify-center text-xs transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDateClick(day)
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}