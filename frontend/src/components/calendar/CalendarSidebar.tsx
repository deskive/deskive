import React, { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, getDate } from 'date-fns'
import { useIntl } from 'react-intl'
import { useCalendarStore } from '../../stores/calendarStore'
import { useEventCategories } from '../../lib/api/calendar-api'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { Button } from '../ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '../../lib/utils'
import { CategoryDialog } from './CategoryDialog'
import { GoogleCalendarConnect } from './GoogleCalendarConnect'
import type { EventCategory } from '../../types/calendar'
import { Plus, Settings, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface CalendarSidebarProps {
  onDateClick?: (date: Date) => void
  onReturnToCalendar?: () => void
  onSettingsClick?: () => void
}

export function CalendarSidebar({ onDateClick, onReturnToCalendar, onSettingsClick }: CalendarSidebarProps = {}) {
  const intl = useIntl()
  const {
    currentDate,
    filters,
    updateFilters,
    navigateToDate,
    setCurrentView,
    getVisibleEvents
  } = useCalendarStore()

  const { showAnalytics, setShowAnalytics } = useCalendarStore.getState() as any
  const { currentWorkspace } = useWorkspace()

  const { data: categories = [], isLoading, error, refetch } = useEventCategories(currentWorkspace?.id || '')

  // Force refetch on component mount to get fresh data
  React.useEffect(() => {
    if (currentWorkspace?.id) {
      refetch()
    }
  }, [currentWorkspace?.id, refetch])

  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null)
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date())

  const events = getVisibleEvents()

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, categoryId]
      : filters.categories.filter(id => id !== categoryId)

    updateFilters({ categories: newCategories })
  }

  const handleDateClick = (date: Date) => {
    navigateToDate(date)
    setCurrentView('day')

    if (showAnalytics) {
      setShowAnalytics(false)
    }

    if (onReturnToCalendar) {
      onReturnToCalendar()
    }

    if (onDateClick) {
      onDateClick(date)
    }
  }

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setShowCategoryDialog(true)
  }

  const handleEditCategory = (category: EventCategory) => {
    setSelectedCategory(category)
    setShowCategoryDialog(true)
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startTime)
      return isSameDay(eventStart, day)
    })
  }

  // Mini Calendar
  const monthStart = startOfMonth(miniCalendarDate)
  const monthEnd = endOfMonth(miniCalendarDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays = [
    intl.formatMessage({ id: 'modules.calendar.monthView.sunShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.monShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.tueShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.wedShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.thuShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.friShort' }),
    intl.formatMessage({ id: 'modules.calendar.monthView.satShort' })
  ]

  const navigateMiniCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(miniCalendarDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setMiniCalendarDate(newDate)
  }

  // Calculate stats
  const stats = {
    totalEvents: events.length,
    thisWeek: events.filter(e => {
      const eventDate = new Date(e.startTime)
      const weekStart = startOfWeek(new Date())
      const weekEnd = endOfWeek(new Date())
      return eventDate >= weekStart && eventDate <= weekEnd
    }).length,
    upcoming: events.filter(e => new Date(e.startTime) > new Date()).length,
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with mini calendar navigation */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMiniCalendar('prev')}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <h2 className="text-nowrap font-semibold">{format(miniCalendarDate, 'MMMM yyyy')}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMiniCalendar('next')}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mini Calendar */}
        <div className="space-y-2">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => (
              <div key={`weekday-${index}`} className="text-center text-xs text-muted-foreground font-medium h-8 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, miniCalendarDate)
              const isCurrentDay = isToday(day)
              const dayEvents = getEventsForDay(day)
              const hasEvents = dayEvents.length > 0
              const dayNumber = getDate(day)
              const isSelected = isSameDay(day, currentDate)

              return (
                <button
                  key={day.toISOString()}
                  className={cn(
                    "h-8 w-8 text-sm flex items-center justify-center rounded-md cursor-pointer hover:bg-muted transition-colors relative",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentDay && "gradient-primary text-white font-bold",
                    isSelected && !isCurrentDay && "bg-muted ring-1 ring-primary"
                  )}
                  onClick={() => handleDateClick(day)}
                >
                  {dayNumber}
                  {hasEvents && !isCurrentDay && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 gradient-primary rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {/* Categories */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{intl.formatMessage({ id: 'modules.calendar.sidebar.categories' })}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateCategory}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {isLoading && (
              <div className="text-center py-4 text-muted-foreground">
                <div className="text-sm">{intl.formatMessage({ id: 'modules.calendar.sidebar.loadingCategories' })}</div>
              </div>
            )}

            {error && (
              <div className="text-center py-4 text-destructive">
                <div className="text-sm">{intl.formatMessage({ id: 'modules.calendar.sidebar.errorLoadingCategories' })}</div>
              </div>
            )}

            {!isLoading && !error && categories.length === 0 && (
              <div className="text-center py-6">
                <div className="text-sm text-muted-foreground mb-2">{intl.formatMessage({ id: 'modules.calendar.sidebar.noCategoriesYet' })}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateCategory}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.calendar.sidebar.createCategory' })}
                </Button>
              </div>
            )}

            {!isLoading && !error && categories.map(category => {
              const isVisible = filters.categories.length === 0 || filters.categories.includes(category.id)
              const categoryEvents = events.filter(e => e.categoryId === category.id)

              return (
                <div key={category.id} className="flex items-center gap-2 group hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors">
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category.id, checked as boolean)
                    }
                    className="h-4 w-4"
                  />

                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />

                  {category.icon && (
                    <span className="text-sm">{category.icon}</span>
                  )}

                  <button
                    onClick={() => handleEditCategory(category)}
                    className="text-sm font-medium flex-1 truncate text-left hover:text-primary transition-colors cursor-pointer"
                    title="Click to edit category"
                  >
                    {category.name}
                  </button>

                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {categoryEvents.length}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Quick Stats */}
        <div className="p-4">
          <h3 className="font-semibold mb-3">{intl.formatMessage({ id: 'modules.calendar.sidebar.quickStats' })}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.sidebar.totalEvents' })}</span>
              <span className="text-sm font-medium">{stats.totalEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.sidebar.thisWeek' })}</span>
              <span className="text-sm font-medium">{stats.thisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.sidebar.upcoming' })}</span>
              <span className="text-sm font-medium">{stats.upcoming}</span>
            </div>
          </div>
        </div>

        {/* Google Calendar Integration */}
        <GoogleCalendarConnect />
      </div>

      {/* Category Dialog */}
      <CategoryDialog
        open={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        category={selectedCategory}
      />
    </div>
  )
}