import React, { useMemo, useState } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, isToday, setHours, setMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { useIntl } from 'react-intl'
import { useCalendarStore } from '../../stores/calendarStore'
import { EventCard } from './EventCard'
import { TimeColumn } from './TimeColumn'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 60

interface WeekViewProps {
  onEventClick: (event: CalendarEvent) => void
  onTimeSlotClick: (date: Date, hour: number) => void
  onEventDrop: (eventId: string, newStartTime: Date) => void
}

export function WeekView({ onEventClick, onTimeSlotClick, onEventDrop }: WeekViewProps) {
  const intl = useIntl()
  const { currentDate, getVisibleEvents, selectedEventId } = useCalendarStore()
  const [dragOverInfo, setDragOverInfo] = useState<{ day: Date; hour: number } | null>(null)

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 0 })
    })
  }, [currentDate])

  // Get week boundaries for filtering
  const weekBounds = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    return {
      start: startOfDay(weekStart),
      end: endOfDay(endOfWeek(weekStart, { weekStartsOn: 0 }))
    }
  }, [currentDate])

  const events = getVisibleEvents()

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (event.isAllDay) return false
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      
      // For single-day events, show only on the day they occur
      if (isSameDay(eventStart, eventEnd)) {
        return isSameDay(eventStart, day)
      }
      
      // For multi-day events, only show on the start day
      // (they will span across days visually)
      return isSameDay(eventStart, day)
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }

  const getAllDayEvents = () => {
    return events.filter(event => {
      if (!event.isAllDay) return false
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      
      // Check if event falls within the current week
      return isWithinInterval(eventStart, weekBounds) || 
             isWithinInterval(eventEnd, weekBounds) ||
             (eventStart < weekBounds.start && eventEnd > weekBounds.end)
    })
  }

  const getEventPosition = (event: CalendarEvent, dayIndex: number) => {
    const startTime = new Date(event.startTime)
    const endTime = new Date(event.endTime)
    
    const startHour = startTime.getHours()
    const startMinutes = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMinutes = endTime.getMinutes()
    
    // For multi-day events, calculate span
    const isMultiDay = !isSameDay(startTime, endTime)
    let spanDays = 1
    let widthPercent = 100
    
    if (isMultiDay) {
      // Calculate how many days this event spans from the current day
      const currentDay = weekDays[dayIndex]
      let endDayIndex = dayIndex
      
      // Find which day the event ends on
      for (let i = dayIndex + 1; i < weekDays.length; i++) {
        if (isSameDay(endTime, weekDays[i]) || endTime > endOfDay(weekDays[i])) {
          endDayIndex = i
          if (isSameDay(endTime, weekDays[i])) break
        }
      }
      
      spanDays = Math.min(endDayIndex - dayIndex + 1, 7 - dayIndex)
      widthPercent = spanDays * 100 - 10 // Subtract padding
    }
    
    // Calculate vertical position
    const top = (startHour + startMinutes / 60) * HOUR_HEIGHT
    
    // Calculate height based on event type
    let height
    if (isMultiDay) {
      // For events spanning multiple days at specific times (e.g., 3-4pm on both days)
      // Check if it's a recurring time slot or continuous span
      const startTimeOfDay = startHour + startMinutes / 60
      const endTimeOfDay = endHour + endMinutes / 60
      
      // If end time is earlier than start time, it means the event continues to next day
      // In this case, show from start time to end of current day
      if (endTimeOfDay < startTimeOfDay) {
        height = (24 - startTimeOfDay) * HOUR_HEIGHT
      } else {
        // Same time slot repeated (e.g., 3-4pm each day)
        const duration = endTimeOfDay - startTimeOfDay
        height = duration * HOUR_HEIGHT
        if (duration < 0.5) {
          height = Math.max(height, 25)
        }
      }
    } else {
      // Single day event
      const duration = ((endHour + endMinutes / 60) - (startHour + startMinutes / 60))
      height = duration * HOUR_HEIGHT
      
      // Ensure minimum height for very short events
      if (duration < 0.5) {
        height = Math.max(height, 25)
      }
    }
    
    return { top, height, spanDays, widthPercent }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault()
    setDragOverInfo({ day, hour })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    // Only clear if we're leaving the time slot area completely
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverInfo(null)
    }
  }

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault()
    setDragOverInfo(null)
    
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (eventData.eventId) {
        // Calculate the new start time based on drop position
        const newStartTime = setHours(setMinutes(day, 0), hour)
        onEventDrop(eventData.eventId, newStartTime)
      }
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }

  const isDropTarget = (day: Date, hour: number) => {
    return dragOverInfo?.day && 
           isSameDay(dragOverInfo.day, day) && 
           dragOverInfo.hour === hour
  }

  const allDayEvents = getAllDayEvents()

  return (
    <div className="flex flex-col h-full overflow-hidden min-w-0">
      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-border bg-muted/30">
          <div className="flex">
            <div className="w-12 sm:w-16 flex-shrink-0 p-1 sm:p-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">{intl.formatMessage({ id: 'modules.calendar.weekView.allDay' })}</span>
              <span className="text-xs text-muted-foreground sm:hidden">{intl.formatMessage({ id: 'modules.calendar.weekView.all' })}</span>
            </div>
            <div className="grid grid-cols-7 flex-1 min-w-0">
              {weekDays.map((day) => {
                const dayAllDayEvents = allDayEvents.filter(event =>
                  isSameDay(new Date(event.startTime), day)
                )
                return (
                  <div key={day.toISOString()} className="border-l border-border p-1 min-h-[40px]">
                    {dayAllDayEvents.map((event) => {
                      const eventEnd = new Date(event.endTime)
                      const isPastEvent = eventEnd < new Date()
                      
                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                          isSelected={event.id === selectedEventId}
                          className={cn("mb-1 text-xs", isPastEvent && "opacity-60")}
                          compact
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Week header */}
      <div className="flex border-b border-border bg-background sticky top-0 z-10">
        <div className="w-12 sm:w-16 flex-shrink-0 border-r border-border p-1 sm:p-2">
          <div className="text-xs text-muted-foreground hidden sm:block">GMT</div>
        </div>
        <div className="grid grid-cols-7 flex-1 min-w-0">
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-l border-border p-1 sm:p-3 text-center min-w-0",
                isToday(day) && "bg-gradient-to-r from-blue-500/5 to-indigo-500/5"
              )}
            >
              <div className="text-xs text-muted-foreground mb-1 truncate">
                <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                <span className="sm:hidden">{format(day, 'EEEEE')}</span>
              </div>
              <div
                className={cn(
                  "text-sm font-medium w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-auto",
                  isToday(day) && "gradient-primary text-white"
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <div className="flex relative">
          {/* Time column */}
          <TimeColumn hours={HOURS} hourHeight={HOUR_HEIGHT} />

          {/* Day columns */}
          <div className="grid grid-cols-7 flex-1 relative min-w-0">
            {weekDays.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-l border-border relative min-w-0",
                    isToday(day) && "bg-gradient-to-r from-blue-500/5 to-indigo-500/5"
                  )}
                  style={{ minHeight: HOURS.length * HOUR_HEIGHT }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        "border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors relative box-border",
                        isDropTarget(day, hour) && "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-500/50"
                      )}
                      style={{ height: HOUR_HEIGHT }}
                      onClick={() => onTimeSlotClick(day, hour)}
                      onDragOver={(e) => handleDragOver(e, day, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    >
                      {/* Drop indicator */}
                      {isDropTarget(day, hour) && (
                        <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 rounded-md bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-indigo-600 font-medium">
                            {intl.formatMessage({ id: 'modules.calendar.weekView.dropHere' })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const { top, height, spanDays, widthPercent } = getEventPosition(event, dayIndex)
                    const eventEnd = new Date(event.endTime)
                    const isPastEvent = eventEnd < new Date()
                    const isMultiDay = spanDays > 1
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute z-20", 
                          isPastEvent && "opacity-60",
                          isMultiDay ? "left-1" : "left-1 right-1"
                        )}
                        style={{ 
                          top, 
                          height,
                          width: isMultiDay ? `calc(100% * ${spanDays} - 8px)` : undefined,
                          right: isMultiDay ? undefined : undefined,
                          zIndex: isMultiDay ? 25 : 20 // Multi-day events on top
                        }}
                      >
                        <EventCard
                          event={event}
                          onClick={() => onEventClick(event)}
                          isSelected={event.id === selectedEventId}
                          onDrop={(newDate) => onEventDrop(event.id, newDate)}
                          draggable
                          compact
                          showTime
                          className={isMultiDay ? "h-full" : ""}
                        />
                      </div>
                    )
                  })}

                  {/* Current time indicator */}
                  {isToday(day) && <CurrentTimeIndicator />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function CurrentTimeIndicator() {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const top = (currentMinutes / 60) * HOUR_HEIGHT

  return (
    <div
      className="absolute left-0 right-0 z-30 flex items-center"
      style={{ top }}
    >
      <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 z-10" />
      <div className="flex-1 h-0.5 bg-red-500" />
    </div>
  )
}