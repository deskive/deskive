import React, { useState } from 'react'
import { format, isSameDay, isToday, setHours, setMinutes } from 'date-fns'
import { useIntl } from 'react-intl'
import { useCalendarStore } from '../../stores/calendarStore'
import { EventCard } from './EventCard'
import { TimeColumn } from './TimeColumn'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 60

interface DayViewProps {
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick: (date: Date, hour: number) => void
  onEventDrop: (eventId: string, newStartTime: Date) => void
}

export function DayView({ onEventClick, onTimeSlotClick, onEventDrop }: DayViewProps) {
  const intl = useIntl()
  const { currentDate, getVisibleEvents, selectedEventId } = useCalendarStore()
  const [dragOverHour, setDragOverHour] = useState<number | null>(null)

  const events = getVisibleEvents()

  const dayEvents = events.filter(event => {
    if (event.isAllDay) return false
    return isSameDay(new Date(event.startTime), currentDate)
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const allDayEvents = events.filter(event => {
    if (!event.isAllDay) return false
    return isSameDay(new Date(event.startTime), currentDate)
  })

  const getEventPosition = (event: CalendarEvent) => {
    const startTime = new Date(event.startTime)
    const endTime = new Date(event.endTime)
    
    const startHour = startTime.getHours()
    const startMinutes = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMinutes = endTime.getMinutes()
    
    const top = (startHour + startMinutes / 60) * HOUR_HEIGHT
    const duration = ((endHour + endMinutes / 60) - (startHour + startMinutes / 60))
    
    // Dynamic height based on actual duration
    // Each hour is HOUR_HEIGHT pixels, so calculate proportionally
    let height = duration * HOUR_HEIGHT
    
    // Ensure minimum height for very short events (less than 30 minutes)
    if (duration < 0.5) {
      height = Math.max(height, 25) // Minimum 25px for readability
    }
    
    return { top, height }
  }

  const getOverlappingEvents = (event: CalendarEvent) => {
    return dayEvents.filter(e => {
      if (e.id === event.id) return false
      const eStart = new Date(e.startTime)
      const eEnd = new Date(e.endTime)
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      
      return (eStart < eventEnd && eEnd > eventStart)
    })
  }

  const getEventWidth = (event: CalendarEvent) => {
    const overlapping = getOverlappingEvents(event)
    const totalOverlapping = overlapping.length + 1
    const width = 100 / totalOverlapping
    const leftOffset = dayEvents.filter(e => {
      const eStart = new Date(e.startTime)
      const eventStart = new Date(event.startTime)
      return eStart < eventStart && getOverlappingEvents(e).some(oe => oe.id === event.id)
    }).length
    
    return {
      width: `${width}%`,
      left: `${leftOffset * width}%`
    }
  }

  // Drag and drop handlers for day view
  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    setDragOverHour(hour)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverHour(null)
    }
  }

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    setDragOverHour(null)
    
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (eventData.eventId) {
        // Set new time for the same date
        const newStartTime = setHours(setMinutes(currentDate, 0), hour)
        onEventDrop(eventData.eventId, newStartTime)
      }
    } catch (error) {
      console.error('Error handling drop in day view:', error)
    }
  }

  const isDropTarget = (hour: number) => {
    return dragOverHour === hour
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">
              {format(currentDate, 'd')}
            </div>
            <div>
              <div className="text-lg font-semibold">
                {format(currentDate, 'EEEE')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentDate, 'MMMM yyyy')}
              </div>
            </div>
            {isToday(currentDate) && (
              <div className="px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                {intl.formatMessage({ id: 'modules.calendar.dayView.today' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-border bg-muted/30">
          <div className="flex p-4">
            <div className="w-16 flex-shrink-0">
              <span className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.dayView.allDay' })}</span>
            </div>
            <div className="flex-1 space-y-2">
              {allDayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  onDrop={(newDate: Date) => onEventDrop(event.id, newDate)}
                  isSelected={event.id === selectedEventId}
                  compact
                  draggable
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative">
          {/* Time column */}
          <TimeColumn hours={HOURS} hourHeight={HOUR_HEIGHT} className="z-20" />

          {/* Day column */}
          <div className="flex-1 relative border-l border-border ">
            <div
              className={cn(
                "relative",
                isToday(currentDate) && "bg-gradient-to-r from-blue-500/5 to-indigo-500/5"
              )}
              style={{ minHeight: HOURS.length * HOUR_HEIGHT }}
            >
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className={cn(
                    "border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground relative box-border",
                    isDropTarget(hour) && "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500/50"
                  )}
                  style={{ height: HOUR_HEIGHT }}
                  onClick={() => onTimeSlotClick(currentDate, hour)}
                  onDragOver={(e) => handleDragOver(e, hour)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, hour)}
                >
                  <div
                    className={cn(
                      "absolute inset-0 opacity-0 hover:opacity-100 transition-opacity",
                      isDropTarget(hour) && "opacity-100"
                    )}
                  >
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {isDropTarget(hour) ? intl.formatMessage({ id: 'modules.calendar.dayView.dropHere' }) : `+ ${format(setHours(currentDate, hour), 'h:mm a')}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Events */}
              <div className="absolute inset-0 pointer-events-none">
                {dayEvents.map((event) => {
                  const position = getEventPosition(event)
                  const { width, left } = getEventWidth(event)
                  
                  return (
                    <div
                      key={event.id}
                      className="absolute pointer-events-auto"
                      style={{
                        top: position.top,
                        height: position.height,
                        width,
                        left,
                        paddingRight: '2px'
                      }}
                    >
                      <EventCard
                        event={event}
                        onClick={() => onEventClick(event)}
                        onDrop={(newDate: Date) => onEventDrop(event.id, newDate)}
                        isSelected={event.id === selectedEventId}
                        showTime
                        compact={position.height < 60}
                        draggable
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}