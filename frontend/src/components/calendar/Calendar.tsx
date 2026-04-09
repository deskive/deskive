import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useCalendarStore, useAnalyticsStore } from '../../stores/calendarStore'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useCalendarEvents, useEventCategories, useUpdateEvent, useCreateMeetingRoom } from '@/lib/api/calendar-api'
import { CalendarHeader } from './CalendarHeader'
import { DayView } from './DayView'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { YearView } from './YearView'
import { AgendaView } from './AgendaView'
import { TimelineView } from './TimelineView'
import type { CalendarEvent, CalendarEventAPI } from '../../types/calendar'
import { EventDialog } from './EventDialog'
import { FiltersDialog } from './FiltersDialog'
import { SettingsDialog } from './SettingsDialog'
import { ScheduleMeetingModal } from './ScheduleMeetingModal'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { SchedulingAssistant } from './SchedulingAssistant'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Check, Monitor, Edit2, Wifi, Coffee, Settings as SettingsIcon } from 'lucide-react'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, format } from 'date-fns'

interface CalendarProps {
  onReturnToCalendar?: () => void
}

export function Calendar({ onReturnToCalendar }: CalendarProps = {}) {
  const intl = useIntl()
  const { currentView, currentDate, navigateToDate, setCurrentView, selectEvent, updateEvent, setEvents, setCategories, getViewDateRange, filters } = useCalendarStore()
  const { showAnalytics, setShowAnalytics } = useAnalyticsStore()
  const { currentWorkspace } = useWorkspace()
  const updateEventMutation = useUpdateEvent()
  const [searchParams, setSearchParams] = useSearchParams()

  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showFiltersDialog, setShowFiltersDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [openRoomDialog, setOpenRoomDialog] = useState(false)
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false)
  const [showSchedulingAssistant, setShowSchedulingAssistant] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [newEventDate, setNewEventDate] = useState<Date | null>(null)
  const [newEventHour, setNewEventHour] = useState<number | null>(null)

  // Room creation state
  const createRoomMutation = useCreateMeetingRoom()
  const [roomForm, setRoomForm] = useState({
    name: '',
    roomNumber: '',
    capacity: 10,
    location: '',
    facilities: [] as string[],
    color: '#3b82f6',
    description: '',
    room_type: 'meeting' as 'conference' | 'meeting' | 'huddle' | 'training' | 'presentation' | 'phone_booth'
  })

  // Room constants
  const ROOM_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
  const FACILITY_OPTIONS = [
    { value: 'projector', label: intl.formatMessage({ id: 'modules.calendar.main.facilityProjector' }), icon: Monitor },
    { value: 'whiteboard', label: intl.formatMessage({ id: 'modules.calendar.main.facilityWhiteboard' }), icon: Edit2 },
    { value: 'video_conferencing', label: intl.formatMessage({ id: 'modules.calendar.main.facilityVideoConferencing' }), icon: Monitor },
    { value: 'wifi', label: intl.formatMessage({ id: 'modules.calendar.main.facilityWifi' }), icon: Wifi },
    { value: 'coffee', label: intl.formatMessage({ id: 'modules.calendar.main.facilityCoffeeTea' }), icon: Coffee },
    { value: 'air_conditioning', label: intl.formatMessage({ id: 'modules.calendar.main.facilityAirConditioning' }), icon: SettingsIcon },
  ]
  const ROOM_TYPES = [
    { value: 'conference', label: intl.formatMessage({ id: 'modules.calendar.main.roomTypeConference' }), description: intl.formatMessage({ id: 'modules.calendar.main.roomTypeConferenceDesc' }) },
    { value: 'meeting', label: intl.formatMessage({ id: 'modules.calendar.main.roomTypeMeeting' }), description: intl.formatMessage({ id: 'modules.calendar.main.roomTypeMeetingDesc' }) },
    { value: 'huddle', label: intl.formatMessage({ id: 'modules.calendar.main.roomTypeHuddle' }), description: intl.formatMessage({ id: 'modules.calendar.main.roomTypeHuddleDesc' }) },
    { value: 'training', label: intl.formatMessage({ id: 'modules.calendar.main.roomTypeTraining' }), description: intl.formatMessage({ id: 'modules.calendar.main.roomTypeTrainingDesc' }) },
    { value: 'presentation', label: intl.formatMessage({ id: 'modules.calendar.main.roomTypePresentation' }), description: intl.formatMessage({ id: 'modules.calendar.main.roomTypePresentationDesc' }) },
    { value: 'phone_booth', label: intl.formatMessage({ id: 'modules.calendar.main.roomTypePhoneBooth' }), description: intl.formatMessage({ id: 'modules.calendar.main.roomTypePhoneBoothDesc' }) },
  ]
  
  // Get the date range for the current view
  const getDateRange = () => {
    const viewRange = getViewDateRange()
    return {
      start: format(viewRange.start, "yyyy-MM-dd'T'HH:mm:ss"),
      end: format(viewRange.end, "yyyy-MM-dd'T'HH:mm:ss"),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }
  
  // Prepare filters for API
  const apiFilters = {
    search: filters.searchQuery || undefined,
    categories: filters.categories.length > 0 ? filters.categories : undefined,
    priorities: filters.priorities.length > 0 ? filters.priorities : undefined,
    statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
    tags: filters.tags && filters.tags.length > 0 ? filters.tags : undefined,
    attendees: filters.attendees && filters.attendees.length > 0 ? filters.attendees : undefined,
    showDeclined: filters.showDeclinedEvents,
    showCancelled: filters.showCancelledEvents,
    showPrivate: filters.showPrivateEvents,
  }

  // Fetch events from API with filters
  const { data: eventsData, isLoading: eventsLoading } = useCalendarEvents(
    currentWorkspace?.id || '',
    getDateRange(),
    apiFilters
  )
  
  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading } = useEventCategories(
    currentWorkspace?.id || ''
  )
  
  // Transform API events to UI format and update store
  // Events can come in two formats:
  // 1. Local events (from database) - snake_case fields
  // 2. Google events (fetched directly from Google API) - camelCase fields
  useEffect(() => {
    if (!eventsLoading) {
      const transformedEvents: CalendarEvent[] = (eventsData || []).map(event => {
        // Check if this is a Google event (camelCase) or local event (snake_case)
        const isGoogleEvent = event.syncedFromGoogle === true;

        // Get start and end times with fallbacks
        const startTimeStr = event.startTime || event.start_time || new Date().toISOString();
        const endTimeStr = event.endTime || event.end_time || new Date().toISOString();

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          // Handle both camelCase (Google) and snake_case (local) formats
          startTime: new Date(startTimeStr),
          endTime: new Date(endTimeStr),
          isAllDay: event.allDay ?? event.all_day ?? false,
          location: event.location,
          categoryId: event.categoryId || event.category_id || '',
          priority: (event.priority as any) || 'normal',
          status: event.status,
          attendees: isGoogleEvent
            ? (event.attendees as string[] || [])
            : ((event.attendees as any[])?.filter((a: any) => a && a.email).map((a: any) => a.email) || []),
          reminders: event.reminders?.map((minutes: number, index: number) => ({
            id: `reminder-${index}`,
            type: 'email' as const,
            minutes,
            isActive: true
          })) || [],
          recurrence: event.recurrence_rule ? {
            pattern: event.recurrence_rule.frequency,
            interval: event.recurrence_rule.interval,
            endDate: event.recurrence_rule.until ? new Date(event.recurrence_rule.until) : undefined
          } : undefined,
          isRecurring: event.isRecurring ?? !!event.recurrence_rule,
          isPrivate: event.visibility === 'private',
          meetingLink: event.meetingUrl || event.meeting_url,
          roomId: event.roomId || event.room_id,
          tags: event.tags || [],
          userId: event.userId || event.organizerId || event.organizer_id || '',
          createdAt: event.createdAt || event.created_at || new Date().toISOString(),
          updatedAt: event.updatedAt || event.updated_at || new Date().toISOString(),
          attachments: event.attachments ? {
            ...event.attachments,
            drive_attachment: event.attachments.drive_attachment || []
          } : { file_attachment: [], note_attachment: [], event_attachment: [], drive_attachment: [] },
          // Google Calendar sync fields - handle both formats
          syncedFromGoogle: event.syncedFromGoogle || event.synced_from_google || false,
          googleCalendarEventId: event.googleCalendarEventId || event.google_calendar_event_id,
          googleCalendarHtmlLink: event.googleCalendarHtmlLink || event.google_calendar_html_link,
          // Additional Google Calendar fields
          googleCalendarName: event.googleCalendarName,
          googleCalendarColor: event.googleCalendarColor,
        };
      })

      setEvents(transformedEvents)
    }
  }, [eventsData, eventsLoading, setEvents])
  
  // Update categories in store
  useEffect(() => {
    if (!categoriesLoading) {
      setCategories(categoriesData || [])
    }
  }, [categoriesData, categoriesLoading, setCategories])
  
  // Re-fetch when currentView or currentDate changes
  useEffect(() => {
    // This will trigger a re-fetch because getDateRange() will return a new value
  }, [currentView, currentDate])

  // Listen for settings open event from sidebar
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettingsDialog(true)
      setOpenRoomDialog(false)
    }

    const handleOpenCreateRoom = () => {
      setOpenRoomDialog(true)
      // Don't open settings dialog, just open the room dialog directly
    }

    window.addEventListener('openCalendarSettings', handleOpenSettings)
    window.addEventListener('openCreateMeetingRoom', handleOpenCreateRoom)

    return () => {
      window.removeEventListener('openCalendarSettings', handleOpenSettings)
      window.removeEventListener('openCreateMeetingRoom', handleOpenCreateRoom)
    }
  }, [])

  // Handle URL params for deep linking from notifications or linked content
  useEffect(() => {
    const dateParam = searchParams.get('date')
    const eventIdParam = searchParams.get('eventId')

    if (eventIdParam) {
      try {
        // Wait for events to load, then find and open the event
        setTimeout(() => {
          const { events } = useCalendarStore.getState()
          const targetEvent = events.find(e => e.id === eventIdParam)

          if (targetEvent) {
            // Navigate to the event's date
            const eventDate = new Date(targetEvent.startTime)
            navigateToDate(eventDate)
            setCurrentView('week')

            setSelectedEvent(targetEvent)
            selectEvent(targetEvent.id)
            setShowEventDialog(true)
          } else if (dateParam) {
            // If event not found but date is provided, navigate to that date
            const targetDate = new Date(dateParam)
            if (!isNaN(targetDate.getTime())) {
              navigateToDate(targetDate)
              setCurrentView('week')
            }
          }

          // Clear the URL params after handling
          setSearchParams({})
        }, 500)
      } catch (error) {
        console.error('Error handling calendar URL params:', error)
        // Clear invalid params
        setSearchParams({})
      }
    } else if (dateParam) {
      // Handle just date param without eventId
      try {
        const targetDate = new Date(dateParam)
        if (!isNaN(targetDate.getTime())) {
          navigateToDate(targetDate)
          setCurrentView('week')
          setSearchParams({})
        }
      } catch (error) {
        console.error('Error handling calendar date param:', error)
        setSearchParams({})
      }
    }
  }, [searchParams, navigateToDate, setCurrentView, selectEvent, setSearchParams])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    selectEvent(event.id)
    setShowEventDialog(true)
  }

  const handleCreateEvent = (date?: Date, hour?: number) => {
    setSelectedEvent(null)
    setNewEventDate(date || new Date())
    setNewEventHour(hour || null)
    selectEvent(undefined)
    setShowEventDialog(true)
  }

  const handleTimeSlotClick = (date: Date, hour: number) => {
    handleCreateEvent(date, hour)
  }

  const handleDateClick = (date: Date) => {
    if (currentView === 'month' || currentView === 'year') {
      navigateToDate(date)
      setCurrentView('day')
    } else {
      handleCreateEvent(date)
    }
  }

  const handleMonthClick = (date: Date) => {
    navigateToDate(date)
    setCurrentView('month')
  }

  const handleEventDrop = (eventId: string, newStartTime: Date) => {
    const event = useCalendarStore.getState().events.find(e => e.id === eventId)
    if (event && currentWorkspace) {
      const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime()
      const newEndTime = new Date(newStartTime.getTime() + duration)
      
      // Optimistically update local state
      updateEvent(eventId, {
        startTime: newStartTime,
        endTime: newEndTime,
        updatedAt: new Date()
      })
      
      // Update via API
      updateEventMutation.mutate({
        workspaceId: currentWorkspace.id,
        eventId: eventId,
        data: {
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString()
        }
      }, {
        onError: (error: any) => {
          // Revert on error
          updateEvent(eventId, {
            startTime: event.startTime,
            endTime: event.endTime
          })
          // Show the actual error message from the API
          const errorMessage = error?.message || intl.formatMessage({ id: 'modules.calendar.main.failedUpdateEvent' })
          toast.error(errorMessage)
        }
      })
    }
  }

  const handleEventDialogClose = () => {
    setShowEventDialog(false)
    setSelectedEvent(null)
    setNewEventDate(null)
    setNewEventHour(null)
    selectEvent(undefined)
  }

  // Room dialog handlers
  const handleSaveRoom = () => {
    if (!roomForm.name.trim() || !roomForm.roomNumber.trim() || !roomForm.room_type) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.main.roomValidationError' }))
      return
    }

    if (!currentWorkspace) return

    const roomData = {
      name: roomForm.name,
      description: roomForm.description,
      capacity: roomForm.capacity,
      location: roomForm.location,
      equipment: roomForm.facilities,
      room_type: roomForm.room_type
    }

    createRoomMutation.mutate({
      workspaceId: currentWorkspace.id,
      data: roomData
    }, {
      onSuccess: () => {
        toast.success(intl.formatMessage({ id: 'modules.calendar.main.roomCreatedSuccess' }))
        setOpenRoomDialog(false)
        resetRoomForm()
      },
      onError: () => {
        toast.error(intl.formatMessage({ id: 'modules.calendar.main.roomCreatedError' }))
      }
    })
  }

  const resetRoomForm = () => {
    setRoomForm({
      name: '',
      roomNumber: '',
      capacity: 10,
      location: '',
      facilities: [],
      color: '#3b82f6',
      description: '',
      room_type: 'meeting'
    })
  }

  const toggleFacility = (facility: string) => {
    setRoomForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }))
  }

  // Handle notification clicks to open specific events
  useEffect(() => {
    const handleOpenCalendarEvent = (event: CustomEvent) => {
      const { eventId } = event.detail
      const calendarEvent = useCalendarStore.getState().events.find(e => e.id === eventId)
      
      if (calendarEvent) {
        // Switch to day view if not already in it
        if (currentView === 'year' || currentView === 'month') {
          setCurrentView('day')
        }
        
        // Navigate to the event's date
        navigateToDate(new Date(calendarEvent.startTime))
        
        // Open the event dialog
        setSelectedEvent(calendarEvent)
        selectEvent(calendarEvent.id)
        setShowEventDialog(true)
        
        // Exit analytics mode if active
        if (showAnalytics) {
          setShowAnalytics(false)
        }
      }
    }

    window.addEventListener('openCalendarEvent', handleOpenCalendarEvent as EventListener)
    
    return () => {
      window.removeEventListener('openCalendarEvent', handleOpenCalendarEvent as EventListener)
    }
  }, [currentView, setCurrentView, navigateToDate, selectEvent, showAnalytics, setShowAnalytics])

  const handleBackToCalendar = () => {
    setShowAnalytics(false)
    // Call the parent callback if provided
    if (onReturnToCalendar) {
      onReturnToCalendar()
    }
  }

  const renderCurrentView = () => {
    if (showAnalytics) {
      return <AnalyticsDashboard onBackToCalendar={handleBackToCalendar} />
    }

    if (eventsLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.main.loadingEvents' })}</p>
            {filters.searchQuery && (
              <p className="text-xs text-muted-foreground mt-2">
                {intl.formatMessage({ id: 'modules.calendar.main.searchingFor' }, { query: filters.searchQuery })}
              </p>
            )}
          </div>
        </div>
      )
    }

    switch (currentView) {
      case 'day':
        return (
          <DayView
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            onEventDrop={handleEventDrop}
          />
        )
      case 'week':
        return (
          <WeekView
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            onEventDrop={handleEventDrop}
          />
        )
      case 'month':
        return (
          <MonthView
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onEventDrop={handleEventDrop}
          />
        )
      case 'year':
        return (
          <YearView
            onDateClick={handleDateClick}
            onMonthClick={handleMonthClick}
          />
        )
      case 'agenda':
        return (
          <AgendaView
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
          />
        )
      case 'timeline':
        return (
          <TimelineView
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onEventDrop={handleEventDrop}
          />
        )
      default:
        return (
          <WeekView
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
            onEventDrop={handleEventDrop}
          />
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      
      {/* Calendar Header - Always visible */}
      <CalendarHeader
        onCreateEvent={() => handleCreateEvent()}
        onShowFilters={() => setShowFiltersDialog(true)}
        onShowSettings={() => setShowSettingsDialog(true)}
        onShowSchedulingAssistant={() => setShowSchedulingAssistant(true)}
        onShowAnalytics={() => setShowAnalytics(!showAnalytics)}
        showAnalytics={showAnalytics}
      />
      
      <div className="flex-1 overflow-hidden relative">
        {(eventsLoading || categoriesLoading) ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.main.loadingCalendarEvents' })}</p>
            </div>
          </div>
        ) : (
          renderCurrentView()
        )}
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={showEventDialog}
        onClose={handleEventDialogClose}
        event={selectedEvent}
        defaultDate={newEventDate || undefined}
        defaultHour={newEventHour || undefined}
      />

      {/* Filters Dialog */}
      <FiltersDialog
        open={showFiltersDialog}
        onClose={() => setShowFiltersDialog(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettingsDialog}
        onClose={() => {
          setShowSettingsDialog(false)
          setOpenRoomDialog(false)
        }}
        openRoomDialog={openRoomDialog}
      />

      {/* Scheduling Assistant - AI Schedule */}
      <SchedulingAssistant
        open={showSchedulingAssistant}
        onClose={() => setShowSchedulingAssistant(false)}
        onEventScheduled={(eventId) => {
          console.log('Event scheduled:', eventId)
          toast.success(intl.formatMessage({ id: 'modules.calendar.main.eventScheduledSuccess' }))
        }}
      />
      
      {/* Schedule Meeting Modal - Disabled to prevent fetch errors */}
      {false && (
        <ScheduleMeetingModal
          open={showScheduleMeetingModal}
          onClose={() => setShowScheduleMeetingModal(false)}
          defaultDate={newEventDate || undefined}
          defaultHour={newEventHour || undefined}
        />
      )}

      {/* Create Meeting Room Dialog */}
      <Dialog open={openRoomDialog} onOpenChange={(open) => {
        setOpenRoomDialog(open)
        if (!open) resetRoomForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{intl.formatMessage({ id: 'modules.calendar.main.createMeetingRoom' })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: 'modules.calendar.main.createMeetingRoomDesc' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 pl-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">{intl.formatMessage({ id: 'modules.calendar.main.roomNameLabel' })}</Label>
                <Input
                  id="roomName"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'modules.calendar.main.roomNamePlaceholder' })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomNumber">{intl.formatMessage({ id: 'modules.calendar.main.roomNumberLabel' })}</Label>
                <Input
                  id="roomNumber"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'modules.calendar.main.roomNumberPlaceholder' })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">{intl.formatMessage({ id: 'modules.calendar.main.capacityLabel' })}</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">{intl.formatMessage({ id: 'modules.calendar.main.locationLabel' })}</Label>
                <Input
                  id="location"
                  value={roomForm.location}
                  onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                  placeholder={intl.formatMessage({ id: 'modules.calendar.main.locationPlaceholder' })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roomType">{intl.formatMessage({ id: 'modules.calendar.main.roomTypeLabel' })}</Label>
              <Select
                value={roomForm.room_type}
                onValueChange={(value: any) => setRoomForm({ ...roomForm, room_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.main.roomTypePlaceholder' })} />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: 'modules.calendar.main.facilitiesLabel' })}</Label>
              <div className="grid grid-cols-2 gap-3">
                {FACILITY_OPTIONS.map((facility) => {
                  const Icon = facility.icon
                  const isSelected = roomForm.facilities.includes(facility.value)
                  return (
                    <button
                      key={facility.value}
                      type="button"
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleFacility(facility.value)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{facility.label}</span>
                      {isSelected && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: 'modules.calendar.main.roomColorLabel' })}</Label>
              <div className="flex gap-2">
                {ROOM_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-colors ${
                      roomForm.color === color ? 'border-gray-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setRoomForm({ ...roomForm, color })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <Label htmlFor="roomDescription">{intl.formatMessage({ id: 'modules.calendar.main.descriptionLabel' })}</Label>
              <Textarea
                id="roomDescription"
                value={roomForm.description}
                onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                placeholder={intl.formatMessage({ id: 'modules.calendar.main.descriptionPlaceholder' })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 mt-4">
            <Button variant="outline" onClick={() => setOpenRoomDialog(false)}>
              {intl.formatMessage({ id: 'common.cancel' })}
            </Button>
            <Button onClick={handleSaveRoom} disabled={createRoomMutation.isPending}>
              {createRoomMutation.isPending ? intl.formatMessage({ id: 'modules.calendar.main.creatingRoom' }) : intl.formatMessage({ id: 'modules.calendar.main.createRoomButton' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}