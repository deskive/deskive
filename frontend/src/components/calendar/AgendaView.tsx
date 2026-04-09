import { useMemo, useState, useRef, useEffect } from 'react'
import { format, addDays, isSameDay, isToday, startOfDay } from 'date-fns'
import { useIntl } from 'react-intl'
import { useCalendarStore } from '../../stores/calendarStore'
import { EventCard } from './EventCard'
import { cn } from '../../lib/utils'
import type { CalendarEvent } from '../../types/calendar'
import { Calendar, Clock, MapPin, Users, Search, Filter } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'

interface AgendaViewProps {
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
}

export function AgendaView({ onEventClick, onDateClick }: AgendaViewProps) {
  const intl = useIntl()
  const { currentDate, getVisibleEvents, selectedEventId, categories } = useCalendarStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [daysToShow, setDaysToShow] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)
  const observerRef = useRef<IntersectionObserver | undefined>(undefined)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const maxDays = 365 // Limit to 1 year of events

  // Generate agenda days based on current date and days to show
  const agendaDays = useMemo(() => {
    const days = []
    for (let i = 0; i < daysToShow; i++) {
      days.push(addDays(currentDate, i))
    }
    return days
  }, [currentDate, daysToShow])

  // Get all events
  const events = getVisibleEvents()

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const locationText = event.location ? (typeof event.location === 'string' ? event.location : event.location.name) : ''
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          locationText.toLowerCase().includes(query) ||
          event.tags.some(tag => tag.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }

      // Category filter
      if (filterCategory !== 'all' && event.categoryId !== filterCategory) {
        return false
      }

      // Priority filter
      if (filterPriority !== 'all' && event.priority !== filterPriority) {
        return false
      }

      return true
    })
  }, [events, searchQuery, filterCategory, filterPriority])

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime)
      return isSameDay(eventStart, day)
    }).sort((a, b) => {
      // Sort all-day events first, then by start time
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    })
  }

  // Group events by day
  const groupedEvents = useMemo(() => {
    return agendaDays.map(day => ({
      date: day,
      events: getEventsForDay(day)
    })).filter(group => group.events.length > 0)
  }, [agendaDays, filteredEvents])

  // Format event time display
  const formatEventTime = (event: CalendarEvent) => {
    if (event.isAllDay) {
      return intl.formatMessage({ id: 'modules.calendar.agendaView.allDay' })
    }
    const start = format(new Date(event.startTime), 'h:mm a')
    const end = format(new Date(event.endTime), 'h:mm a')
    return `${start} - ${end}`
  }

  // Calculate event duration
  const getEventDuration = (event: CalendarEvent) => {
    if (event.isAllDay) return null
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    const minutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
    
    if (minutes < 60) {
      return `${minutes}m`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    
    return `${hours}h ${remainingMinutes}m`
  }

  // Update loading ref when state changes
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  // Stop loading when we reach maximum days
  useEffect(() => {
    if (daysToShow >= maxDays && isLoading) {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [daysToShow, maxDays, isLoading])

  // Infinite scroll handler
  useEffect(() => {
    // Don't create observer if we've reached the maximum
    if (daysToShow >= maxDays) {
      return
    }

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && !isLoadingRef.current) {
        isLoadingRef.current = true
        setIsLoading(true)
        
        // Simulate loading more days
        setTimeout(() => {
          setDaysToShow(prev => {
            const newValue = Math.min(prev + 30, maxDays)
            // If we've reached the max, stop loading immediately
            if (newValue >= maxDays) {
              setIsLoading(false)
              isLoadingRef.current = false
            } else {
              setIsLoading(false)
              isLoadingRef.current = false
            }
            return newValue
          })
        }, 300)
      }
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    })

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [daysToShow, maxDays])

  // Empty state
  if (groupedEvents.length === 0 && !searchQuery && filterCategory === 'all' && filterPriority === 'all') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'modules.calendar.agendaView.noUpcomingEvents' })}</h3>
        <p className="text-muted-foreground">
          {intl.formatMessage({ id: 'modules.calendar.agendaView.calendarClearForNext' }, { days: daysToShow })}
          <br />
          {intl.formatMessage({ id: 'modules.calendar.agendaView.clickNewEventToSchedule' })}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and filters */}
      <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={intl.formatMessage({ id: 'modules.calendar.agendaView.searchEvents' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.agendaView.allCategories' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{intl.formatMessage({ id: 'modules.calendar.agendaView.allCategories' })}</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.agendaView.allPriorities' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{intl.formatMessage({ id: 'modules.calendar.agendaView.allPriorities' })}</SelectItem>
              <SelectItem value="urgent">{intl.formatMessage({ id: 'modules.calendar.agendaView.priorityUrgent' })}</SelectItem>
              <SelectItem value="high">{intl.formatMessage({ id: 'modules.calendar.agendaView.priorityHigh' })}</SelectItem>
              <SelectItem value="normal">{intl.formatMessage({ id: 'modules.calendar.agendaView.priorityNormal' })}</SelectItem>
              <SelectItem value="low">{intl.formatMessage({ id: 'modules.calendar.agendaView.priorityLow' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {groupedEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{intl.formatMessage({ id: 'modules.calendar.agendaView.noEventsMatchFilters' })}</p>
            </div>
          ) : (
            groupedEvents.map(({ date, events: dayEvents }) => (
              <div key={date.toISOString()} className="space-y-4">
                {/* Date header */}
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => onDateClick(date)}
                >
                  <div className={cn(
                    "flex items-center gap-2 py-2 px-3 rounded-lg border",
                    isToday(date) && "gradient-primary text-white border-blue-500"
                  )}>
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">
                      {format(date, 'EEEE, MMMM d')}
                    </span>
                    {isToday(date) && (
                      <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                        {intl.formatMessage({ id: 'modules.calendar.agendaView.today' })}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dayEvents.length} {dayEvents.length === 1 ? intl.formatMessage({ id: 'modules.calendar.agendaView.event' }) : intl.formatMessage({ id: 'modules.calendar.agendaView.events' })}
                  </div>
                </div>

                {/* Events list */}
                <div className="space-y-3 ml-4">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "group relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        event.id === selectedEventId && "ring-2 ring-indigo-500 ring-offset-2"
                      )}
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Time column */}
                        <div className="flex-shrink-0 w-32">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatEventTime(event)}</span>
                          </div>
                          {!event.isAllDay && (
                            <div className="text-xs text-muted-foreground mt-1 ml-5">
                              {getEventDuration(event)}
                            </div>
                          )}
                        </div>

                        {/* Event content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-1 group-hover:text-indigo-600 transition-colors">
                                {event.title}
                              </h3>
                              
                              {event.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {event.description}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{typeof event.location === 'string' ? event.location : event.location.name}</span>
                                  </div>
                                )}
                                
                                {event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{intl.formatMessage({ id: 'modules.calendar.agendaView.attendees' }, { count: event.attendees.length })}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Event priority indicator */}
                            <div className={cn(
                              "w-3 h-3 rounded-full flex-shrink-0 mt-1",
                              event.priority === 'urgent' && "bg-red-500",
                              event.priority === 'high' && "bg-orange-500",
                              event.priority === 'normal' && "bg-blue-500",
                              event.priority === 'low' && "bg-gray-400"
                            )} />
                          </div>
                        </div>
                      </div>

                      {/* Event tags */}
                      {event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 ml-36">
                          {event.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-muted text-xs rounded-full text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-xs text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.calendar.agendaView.clickToViewDetails' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          
          {/* Load more section - stable height to prevent layout shifts */}
          <div className="text-center py-4">
            {daysToShow < maxDays ? (
              <>
                <div ref={loadMoreRef} className="h-4" />
                {isLoading && (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-t-transparent border-indigo-500 rounded-full animate-spin" />
                    {intl.formatMessage({ id: 'modules.calendar.agendaView.loadingMoreEvents' })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.calendar.agendaView.reachedMaximumDays' }, { maxDays })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}