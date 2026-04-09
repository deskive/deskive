import { useMemo, useState, useRef } from 'react'
import { format, addDays, eachDayOfInterval, isSameDay, isToday, subDays, differenceInDays } from 'date-fns'
import { useCalendarStore } from '../../stores/calendarStore'
import { EventCard } from './EventCard'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'
import { ChevronDown, ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon, ZoomIn, ZoomOut, Calendar, Clock, Users, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface TimelineViewProps {
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
  onEventDrop: (eventId: string, newStartTime: Date) => void
}

type TimelineZoom = 'day' | 'week' | 'month'
type TimelineRange = 'week' | '2weeks' | 'month' | '3months'

export function TimelineView({ onEventClick, onDateClick, onEventDrop }: TimelineViewProps) {
  const { currentDate, getVisibleEvents, selectedEventId, categories } = useCalendarStore()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [timelineDate, setTimelineDate] = useState(currentDate)
  const [timelineRange, setTimelineRange] = useState<TimelineRange>('2weeks')
  const [timelineZoom, setTimelineZoom] = useState<TimelineZoom>('day')
  const [dragOverInfo, setDragOverInfo] = useState<{ date: Date; categoryId: string } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Calculate timeline days based on range
  const timelineDays = useMemo(() => {
    const getDaysCount = () => {
      switch (timelineRange) {
        case 'week': return 7
        case '2weeks': return 14
        case 'month': return 30
        case '3months': return 90
        default: return 14
      }
    }
    
    const startDate = timelineDate
    const endDate = addDays(timelineDate, getDaysCount() - 1)
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [timelineDate, timelineRange])

  // Calculate day width based on zoom level
  const getDayWidth = () => {
    switch (timelineZoom) {
      case 'day': return 120
      case 'week': return 80
      case 'month': return 40
      default: return 120
    }
  }

  const dayWidth = getDayWidth()

  const events = getVisibleEvents()

  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: { category: { id: string; name: string; color: string }; events: CalendarEvent[] } } = {}
    
    events.forEach(event => {
      const category = categories.find(cat => cat.id === event.categoryId) || {
        id: 'uncategorized',
        name: 'Uncategorized',
        color: '#6b7280'
      }
      
      if (!groups[category.id]) {
        groups[category.id] = {
          category,
          events: []
        }
      }
      
      groups[category.id].events.push(event)
    })

    // Sort events within each category by start time
    Object.values(groups).forEach(group => {
      group.events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    })

    return groups
  }, [events, categories])

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }


  // Navigation functions
  const navigatePrevious = () => {
    const daysToSubtract = timelineRange === 'week' ? 7 : timelineRange === '2weeks' ? 14 : timelineRange === 'month' ? 30 : 90
    setTimelineDate(subDays(timelineDate, daysToSubtract))
  }

  const navigateNext = () => {
    const daysToAdd = timelineRange === 'week' ? 7 : timelineRange === '2weeks' ? 14 : timelineRange === 'month' ? 30 : 90
    setTimelineDate(addDays(timelineDate, daysToAdd))
  }

  const navigateToToday = () => {
    setTimelineDate(new Date())
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, date: Date, categoryId: string) => {
    e.preventDefault()
    setDragOverInfo({ date, categoryId })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverInfo(null)
    }
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    setDragOverInfo(null)
    
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'))
      if (eventData.eventId) {
        // Preserve time when moving between dates in timeline
        const originalStartTime = new Date(eventData.startTime)
        const newStartTime = new Date(date)
        newStartTime.setHours(originalStartTime.getHours())
        newStartTime.setMinutes(originalStartTime.getMinutes())
        onEventDrop(eventData.eventId, newStartTime)
      }
    } catch (error) {
      console.error('Error handling drop in timeline view:', error)
    }
  }

  const getEventPosition = (event: CalendarEvent, dayIndex: number) => {
    const left = dayIndex * dayWidth
    
    if (event.isAllDay) {
      return { left, width: dayWidth - 8 }
    }
    
    const startTime = new Date(event.startTime)
    const endTime = new Date(event.endTime)
    const durationDays = differenceInDays(endTime, startTime) + 1
    
    // Calculate width based on event duration (can span multiple days)
    const width = Math.max(dayWidth * durationDays - 8, dayWidth * 0.5)
    
    return { left, width }
  }

  const isDropTarget = (date: Date, categoryId: string) => {
    return dragOverInfo?.date && 
           isSameDay(dragOverInfo.date, date) && 
           dragOverInfo.categoryId === categoryId
  }

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Timeline Controls */}
      <div className="border-b border-border bg-background p-4">
        <div className="flex items-center justify-between">
          {/* Left: Navigation and Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToToday}>
                <RotateCcw className="h-4 w-4" />
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={navigateNext}>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">
                {format(timelineDate, 'MMMM yyyy')}
              </h2>
            </div>
          </div>

          {/* Right: View Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Select value={timelineRange} onValueChange={(value: TimelineRange) => setTimelineRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 Week</SelectItem>
                  <SelectItem value="2weeks">2 Weeks</SelectItem>
                  <SelectItem value="month">1 Month</SelectItem>
                  <SelectItem value="3months">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant={timelineZoom === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimelineZoom('day')}
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                Day
              </Button>
              <Button 
                variant={timelineZoom === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimelineZoom('week')}
              >
                Week
              </Button>
              <Button 
                variant={timelineZoom === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setTimelineZoom('month')}
              >
                <ZoomOut className="h-4 w-4 mr-1" />
                Month
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline header */}
      <div className="border-b border-border bg-background sticky top-0 z-20">
        <div className="flex">
          {/* Categories column header */}
          <div className="w-64 p-3 border-r border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Categories & Resources</h3>
            </div>
          </div>
          
          {/* Days header */}
          <div className="flex-1 overflow-x-auto" ref={timelineRef}>
            <div className="flex" style={{ minWidth: timelineDays.length * dayWidth }}>
              {timelineDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-2 text-center border-r border-border cursor-pointer hover:bg-muted/50 transition-colors",
                    isToday(day) && "bg-primary/10 text-primary font-bold"
                  )}
                  style={{ minWidth: dayWidth }}
                  onClick={() => onDateClick(day)}
                >
                  {timelineZoom === 'day' && (
                    <>
                      <div className="text-xs text-muted-foreground mb-1">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-sm font-medium">
                        {format(day, 'MMM d')}
                      </div>
                    </>
                  )}
                  {timelineZoom === 'week' && (
                    <div className="text-xs font-medium">
                      {format(day, 'M/d')}
                    </div>
                  )}
                  {timelineZoom === 'month' && (
                    <div className="text-xs">
                      {format(day, 'd')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Categories column */}
          <div className="w-64 border-r border-border bg-muted/20">
            {Object.entries(groupedEvents).map(([categoryId, { category, events: categoryEvents }]) => {
              const isExpanded = expandedCategories.has(categoryId)
              
              return (
                <div key={categoryId} className="border-b border-border">
                  <div
                    className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors h-12"
                    onClick={() => toggleCategory(categoryId)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium text-sm">{category.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-1 rounded">
                      {categoryEvents.length}
                    </span>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <div className="text-xs text-muted-foreground mb-2">
                        Drag events to reschedule
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {categoryEvents.slice(0, 12).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "p-2 rounded border-l-4 cursor-pointer hover:bg-background transition-colors",
                              event.id === selectedEventId && "ring-2 ring-primary ring-offset-1"
                            )}
                            style={{ borderLeftColor: category.color }}
                            onClick={() => onEventClick(event)}
                          >
                            <div className="text-xs font-medium truncate">
                              {event.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(event.startTime), 'MMM d')}
                              {!event.isAllDay && ` • ${format(new Date(event.startTime), 'h:mm a')}`}
                            </div>
                          </div>
                        ))}
                        {categoryEvents.length > 12 && (
                          <div className="text-xs text-muted-foreground p-2">
                            +{categoryEvents.length - 12} more events
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Timeline grid */}
          <div className="flex-1 overflow-x-auto">
            <div className="flex flex-col">
              {/* Timeline grid for each category */}
              {Object.entries(groupedEvents).map(([categoryId, { category, events: categoryEvents }]) => {
                const isExpanded = expandedCategories.has(categoryId)
                
                return (
                  <div key={categoryId} className="border-b border-border">
                    {/* Category header row in timeline */}
                    <div 
                      className="relative h-12 border-b border-border/30"
                      style={{ minWidth: timelineDays.length * dayWidth }}
                    >
                      {/* Vertical grid lines */}
                      {timelineDays.map((day, index) => (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "absolute top-0 bottom-0 border-r border-border/30",
                            isToday(day) && "bg-primary/5"
                          )}
                          style={{ left: index * dayWidth, width: dayWidth }}
                        />
                      ))}
                    </div>

                    {/* Expanded category content */}
                    {isExpanded && (
                      <div 
                        className="relative min-h-24"
                        style={{ minWidth: timelineDays.length * dayWidth }}
                      >
                        {/* Vertical grid lines */}
                        {timelineDays.map((day, index) => (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "absolute top-0 bottom-0 border-r border-border/30",
                              isToday(day) && "bg-primary/5"
                            )}
                            style={{ left: index * dayWidth, width: dayWidth }}
                          />
                        ))}

                        {/* Drop zones */}
                        {timelineDays.map((day, dayIndex) => (
                          <div
                            key={`drop-${day.toISOString()}`}
                            className={cn(
                              "absolute top-0 bottom-0 hover:bg-muted/20 transition-colors",
                              isDropTarget(day, categoryId) && "bg-primary/20 border-2 border-dashed border-primary/50"
                            )}
                            style={{ left: dayIndex * dayWidth, width: dayWidth }}
                            onDragOver={(e) => handleDragOver(e, day, categoryId)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day)}
                          >
                            {isDropTarget(day, categoryId) && (
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-primary font-medium bg-white/90 px-2 py-1 rounded">
                                Drop here
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Events with gantt-style bars */}
                        {categoryEvents.map((event, eventIndex) => {
                          const eventStartDay = timelineDays.findIndex(day => isSameDay(day, new Date(event.startTime)))
                          if (eventStartDay === -1) return null

                          const { left, width } = getEventPosition(event, eventStartDay)
                          const eventTop = 8 + (eventIndex % 4) * 28 // Stack up to 4 events

                          return (
                            <div
                              key={event.id}
                              className="absolute z-10"
                              style={{
                                left: left + 4,
                                width: Math.max(width, 60), // Minimum width for readability
                                top: eventTop,
                                height: 24
                              }}
                            >
                              <div 
                                className="h-full shadow-sm border rounded-md overflow-hidden group hover:shadow-md transition-shadow"
                                style={{
                                  background: `linear-gradient(90deg, ${category.color}15 0%, ${category.color}05 100%)`,
                                  borderLeft: `4px solid ${category.color}`,
                                  borderColor: category.color + '40'
                                }}
                              >
                                <EventCard
                                  event={event}
                                  onClick={() => onEventClick(event)}
                                  isSelected={event.id === selectedEventId}
                                  compact
                                  draggable
                                  showTime={timelineZoom === 'day'}
                                  className="h-full bg-transparent border-none text-xs p-1"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}