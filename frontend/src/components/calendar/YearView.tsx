import { useMemo } from 'react'
import { 
  format, 
  startOfYear, 
  endOfYear, 
  eachMonthOfInterval, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  isSameDay 
} from 'date-fns'
import { useCalendarStore } from '../../stores/calendarStore'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'

interface YearViewProps {
  onDateClick: (date: Date) => void
  onMonthClick: (date: Date) => void
}

export function YearView({ onDateClick, onMonthClick }: YearViewProps) {
  const { currentDate, getVisibleEvents } = useCalendarStore()

  const yearMonths = useMemo(() => {
    const yearStart = startOfYear(currentDate)
    const yearEnd = endOfYear(currentDate)
    return eachMonthOfInterval({ start: yearStart, end: yearEnd })
  }, [currentDate])

  const events = getVisibleEvents()

  const getEventsForMonth = (month: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startTime)
      return isSameMonth(eventStart, month)
    })
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startTime)
      return isSameDay(eventStart, day)
    })
  }

  const MonthMiniCalendar = ({ month }: { month: Date }) => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    
    const monthDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    })

    const monthEvents = getEventsForMonth(month)
    const weekDays = [
      { short: 'S', index: 0 },
      { short: 'M', index: 1 },
      { short: 'T', index: 2 },
      { short: 'W', index: 3 },
      { short: 'T', index: 4 },
      { short: 'F', index: 5 },
      { short: 'S', index: 6 }
    ]

    return (
      <div
        className="p-3 border rounded-lg cursor-pointer hover:shadow-md transition-all hover:bg-muted/50"
        onClick={() => onMonthClick(month)}
      >
        {/* Month header */}
        <div className="text-center mb-2">
          <h3 className="font-semibold text-sm">
            {format(month, 'MMM')}
          </h3>
          <div className="text-xs text-muted-foreground">
            {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDays.map((day) => (
            <div key={`day-${day.index}`} className="text-center text-xs text-muted-foreground font-medium h-5 flex items-center justify-center">
              {day.short}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {monthDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, month)
            const isCurrentDay = isToday(day)
            const dayEvents = getEventsForDay(day)
            const hasEvents = dayEvents.length > 0

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-6 w-6 text-xs flex items-center justify-center cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-indigo-500/10 rounded transition-colors relative",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentDay && "gradient-primary text-white font-bold",
                  hasEvents && !isCurrentDay && "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 font-medium"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onDateClick(day)
                }}
              >
                {format(day, 'd')}
                {hasEvents && !isCurrentDay && (
                  <div className="absolute w-1 h-1 gradient-primary rounded-full mt-4" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Year header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold">
            {format(currentDate, 'yyyy')}
          </h1>
          <div className="text-sm text-muted-foreground">
            {events.length} total events this year
          </div>
        </div>
        
        {/* Year overview stats */}
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <div className="font-semibold">
              {events.filter(e => !e.isAllDay).length}
            </div>
            <div className="text-muted-foreground">Meetings</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">
              {events.filter(e => e.isAllDay).length}
            </div>
            <div className="text-muted-foreground">All-day</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">
              {events.filter(e => e.priority === 'high' || e.priority === 'urgent').length}
            </div>
            <div className="text-muted-foreground">High Priority</div>
          </div>
        </div>
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {yearMonths.map((month) => (
            <MonthMiniCalendar key={month.toISOString()} month={month} />
          ))}
        </div>
      </div>

      {/* Year summary */}
      <div className="border-t border-border p-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-green-600">
                Q1: {events.filter(e => {
                  const month = new Date(e.startTime).getMonth()
                  return month >= 0 && month <= 2
                }).length}
              </div>
              <div className="text-muted-foreground">Jan - Mar</div>
            </div>
            <div>
              <div className="font-semibold text-blue-600">
                Q2: {events.filter(e => {
                  const month = new Date(e.startTime).getMonth()
                  return month >= 3 && month <= 5
                }).length}
              </div>
              <div className="text-muted-foreground">Apr - Jun</div>
            </div>
            <div>
              <div className="font-semibold text-orange-600">
                Q3: {events.filter(e => {
                  const month = new Date(e.startTime).getMonth()
                  return month >= 6 && month <= 8
                }).length}
              </div>
              <div className="text-muted-foreground">Jul - Sep</div>
            </div>
            <div>
              <div className="font-semibold text-purple-600">
                Q4: {events.filter(e => {
                  const month = new Date(e.startTime).getMonth()
                  return month >= 9 && month <= 11
                }).length}
              </div>
              <div className="text-muted-foreground">Oct - Dec</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}