import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { 
  CalendarState, 
  CalendarEvent, 
  EventCategory, 
  EventTemplate, 
  CalendarConflict, 
  CalendarFilter, 
  CalendarView,
  UserPreferences,
  CalendarNotification,
  SmartSchedulingSuggestion,
  AnalyticsTimeframe,
  CalendarAnalytics
} from '../types/calendar'
import { 
  addDays, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  isWithinInterval,
  addMonths,
  addWeeks,
  addYears,
  subMonths,
  subWeeks,
  subYears
} from 'date-fns'

interface CalendarActions {
  setCurrentView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  selectEvent: (eventId?: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error?: string) => void
  
  setEvents: (events: CalendarEvent[]) => void
  addEvent: (event: CalendarEvent) => void
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void
  removeEvent: (eventId: string) => void
  duplicateEvent: (eventId: string, modifications?: Partial<CalendarEvent>) => void
  
  setCategories: (categories: EventCategory[]) => void
  addCategory: (category: EventCategory) => void
  updateCategory: (categoryId: string, updates: Partial<EventCategory>) => void
  removeCategory: (categoryId: string) => void
  
  setTemplates: (templates: EventTemplate[]) => void
  addTemplate: (template: EventTemplate) => void
  updateTemplate: (templateId: string, updates: Partial<EventTemplate>) => void
  removeTemplate: (templateId: string) => void
  
  setConflicts: (conflicts: CalendarConflict[]) => void
  addConflict: (conflict: CalendarConflict) => void
  resolveConflict: (conflictId: string) => void
  
  updateFilters: (filters: Partial<CalendarFilter>) => void
  resetFilters: () => void
  
  setSelectedRange: (range?: { start: Date; end: Date }) => void
  setDraggedEvent: (event?: { eventId: string; originalStartTime: Date; originalEndTime: Date }) => void
  
  getVisibleEvents: () => CalendarEvent[]
  getEventsByDateRange: (start: Date, end: Date) => CalendarEvent[]
  getConflictsForEvent: (eventId: string) => CalendarConflict[]
  getEventsByCategory: (categoryId: string) => CalendarEvent[]
  searchEvents: (query: string) => CalendarEvent[]
  
  navigateToDate: (date: Date) => void
  navigateNext: () => void
  navigatePrevious: () => void
  navigateToToday: () => void
  
  getViewDateRange: () => { start: Date; end: Date }
  isEventVisible: (event: CalendarEvent) => boolean
}

interface NotificationState {
  notifications: CalendarNotification[]
  unreadCount: number
}

interface NotificationActions {
  setNotifications: (notifications: CalendarNotification[]) => void
  addNotification: (notification: CalendarNotification) => void
  markAsRead: (notificationIds: string[]) => void
  removeNotification: (notificationId: string) => void
  clearAllNotifications: () => void
}

interface AnalyticsState {
  analytics?: CalendarAnalytics
  timeframe: AnalyticsTimeframe
  isLoading: boolean
  error?: string
  showAnalytics: boolean
}

interface AnalyticsActions {
  setAnalytics: (analytics: CalendarAnalytics) => void
  setTimeframe: (timeframe: AnalyticsTimeframe) => void
  setAnalyticsLoading: (isLoading: boolean) => void
  setAnalyticsError: (error?: string) => void
  setShowAnalytics: (show: boolean) => void
}

interface SchedulingState {
  suggestions: SmartSchedulingSuggestion[]
  isSearching: boolean
  error?: string
}

interface SchedulingActions {
  setSuggestions: (suggestions: SmartSchedulingSuggestion[]) => void
  setSearching: (isSearching: boolean) => void
  setSchedulingError: (error?: string) => void
  clearSuggestions: () => void
}

interface PreferencesState {
  preferences: UserPreferences
}

interface PreferencesActions {
  setPreferences: (preferences: UserPreferences) => void
  updatePreferences: (updates: Partial<UserPreferences>) => void
}

const defaultFilters: CalendarFilter = {
  categories: [],
  attendees: [],
  priorities: [],
  statuses: [],
  tags: [],
  searchQuery: '',
  showDeclinedEvents: false,
  showCancelledEvents: false,
  showPrivateEvents: true,
}

const defaultPreferences: UserPreferences = {
  defaultView: 'week',
  weekStartsOn: 1, // Monday
  defaultEventDuration: 60, // 1 hour
  workingHours: {
    start: '09:00',
    end: '17:00',
  },
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  defaultReminders: [
    {
      id: '1',
      type: 'email',
      minutes: 15,
      isActive: true,
    },
  ],
  showWeekNumbers: false,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  showDeclinedEvents: false,
  showTentativeEvents: true,
  enableWeatherIntegration: false,
  enableSmartScheduling: true,
  focusTimePreferences: [],
}

// Initial empty events - will be populated from API
const initialEvents: CalendarEvent[] = []

// Initial empty categories - will be populated from API
const initialCategories: EventCategory[] = []

export const useCalendarStore = create<CalendarState & CalendarActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentView: 'week',
      currentDate: new Date(),
      events: initialEvents,
      categories: initialCategories,
      templates: [],
      conflicts: [],
      filters: defaultFilters,
      isLoading: false,

      // View actions
      setCurrentView: (view) => set({ currentView: view }),
      setCurrentDate: (date) => set({ currentDate: date }),
      selectEvent: (eventId) => set({ selectedEventId: eventId }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Event actions
      setEvents: (events) => set({ events }),
      addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
      updateEvent: (eventId, updates) => set((state) => ({
        events: state.events.map(event => 
          event.id === eventId ? { ...event, ...updates } : event
        )
      })),
      removeEvent: (eventId) => set((state) => ({
        events: state.events.filter(event => event.id !== eventId)
      })),
      duplicateEvent: (eventId, modifications = {}) => {
        const event = get().events.find(e => e.id === eventId)
        if (!event) return
        
        const newEvent: CalendarEvent = {
          ...event,
          ...modifications,
          id: `event_${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        get().addEvent(newEvent)
      },

      // Category actions
      setCategories: (categories) => set({ categories }),
      addCategory: (category) => set((state) => ({ 
        categories: [...state.categories, category] 
      })),
      updateCategory: (categoryId, updates) => set((state) => ({
        categories: state.categories.map(cat => 
          cat.id === categoryId ? { ...cat, ...updates } : cat
        )
      })),
      removeCategory: (categoryId) => set((state) => ({
        categories: state.categories.filter(cat => cat.id !== categoryId)
      })),

      // Template actions
      setTemplates: (templates) => set({ templates }),
      addTemplate: (template) => set((state) => ({ 
        templates: [...state.templates, template] 
      })),
      updateTemplate: (templateId, updates) => set((state) => ({
        templates: state.templates.map(template => 
          template.id === templateId ? { ...template, ...updates } : template
        )
      })),
      removeTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter(template => template.id !== templateId)
      })),

      // Conflict actions
      setConflicts: (conflicts) => set({ conflicts }),
      addConflict: (conflict) => set((state) => ({ 
        conflicts: [...state.conflicts, conflict] 
      })),
      resolveConflict: (conflictId) => set((state) => ({
        conflicts: state.conflicts.map(conflict => 
          conflict.id === conflictId 
            ? { ...conflict, resolvedAt: new Date() } 
            : conflict
        )
      })),

      // Filter actions
      updateFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters }
      })),
      resetFilters: () => set({ filters: defaultFilters }),

      // Selection actions
      setSelectedRange: (range) => set({ selectedRange: range }),
      setDraggedEvent: (event) => set({ draggedEvent: event }),

      // Query methods
      getVisibleEvents: () => {
        // Since filtering is now done on the backend, just return all events
        // The events are already filtered by the API based on current view and filters
        return get().events
      },

      getEventsByDateRange: (start, end) => {
        return get().events.filter(event => {
          const eventStart = new Date(event.startTime)
          const eventEnd = new Date(event.endTime)
          return (
            (eventStart >= start && eventStart <= end) ||
            (eventEnd >= start && eventEnd <= end) ||
            (eventStart <= start && eventEnd >= end)
          )
        })
      },

      getConflictsForEvent: (eventId) => {
        return get().conflicts.filter(conflict => 
          conflict.eventIds.includes(eventId) && !conflict.resolvedAt
        )
      },

      getEventsByCategory: (categoryId) => {
        return get().events.filter(event => event.categoryId === categoryId)
      },

      searchEvents: (query) => {
        const lowercaseQuery = query.toLowerCase()
        return get().events.filter(event => 
          event.title.toLowerCase().includes(lowercaseQuery) ||
          event.description?.toLowerCase().includes(lowercaseQuery) ||
          event.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
        )
      },

      // Navigation methods
      navigateToDate: (date) => set({ currentDate: date }),
      
      navigateNext: () => {
        const state = get()
        let newDate: Date
        
        switch (state.currentView) {
          case 'day':
            newDate = addDays(state.currentDate, 1)
            break
          case 'week':
            newDate = addWeeks(state.currentDate, 1)
            break
          case 'month':
            newDate = addMonths(state.currentDate, 1)
            break
          case 'year':
            newDate = addYears(state.currentDate, 1)
            break
          default:
            newDate = addWeeks(state.currentDate, 1)
        }
        
        set({ currentDate: newDate })
      },

      navigatePrevious: () => {
        const state = get()
        let newDate: Date
        
        switch (state.currentView) {
          case 'day':
            newDate = addDays(state.currentDate, -1)
            break
          case 'week':
            newDate = subWeeks(state.currentDate, 1)
            break
          case 'month':
            newDate = subMonths(state.currentDate, 1)
            break
          case 'year':
            newDate = subYears(state.currentDate, 1)
            break
          default:
            newDate = subWeeks(state.currentDate, 1)
        }
        
        set({ currentDate: newDate })
      },

      navigateToToday: () => set({ currentDate: new Date() }),

      // Utility methods
      getViewDateRange: () => {
        const state = get()
        const { currentDate, currentView } = state
        
        switch (currentView) {
          case 'day':
            return {
              start: startOfDay(currentDate),
              end: endOfDay(currentDate)
            }
          case 'week':
            return {
              start: startOfWeek(currentDate, { weekStartsOn: 0 }),
              end: endOfWeek(currentDate, { weekStartsOn: 0 })
            }
          case 'month':
            return {
              start: startOfMonth(currentDate),
              end: endOfMonth(currentDate)
            }
          case 'year':
            return {
              start: startOfYear(currentDate),
              end: endOfYear(currentDate)
            }
          case 'agenda':
            return {
              start: startOfDay(currentDate),
              end: endOfDay(addDays(currentDate, 30))
            }
          case 'timeline':
            return {
              start: startOfWeek(currentDate, { weekStartsOn: 0 }),
              end: endOfWeek(currentDate, { weekStartsOn: 0 })
            }
          default:
            return {
              start: startOfWeek(currentDate, { weekStartsOn: 0 }),
              end: endOfWeek(currentDate, { weekStartsOn: 0 })
            }
        }
      },

      isEventVisible: (event) => {
        const { filters } = get()
        
        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(event.categoryId)) {
          return false
        }
        
        // Priority filter
        if (filters.priorities.length > 0 && !filters.priorities.includes(event.priority)) {
          return false
        }
        
        // Status filter
        if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
          return false
        }
        
        // Declined events
        if (!filters.showDeclinedEvents && event.status === 'cancelled') {
          return false
        }
        
        // Cancelled events
        if (!filters.showCancelledEvents && event.status === 'cancelled') {
          return false
        }
        
        // Private events
        if (!filters.showPrivateEvents && event.isPrivate) {
          return false
        }
        
        // Search query
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase()
          const matchesSearch = 
            event.title.toLowerCase().includes(query) ||
            event.description?.toLowerCase().includes(query) ||
            event.tags.some(tag => tag.toLowerCase().includes(query))
          
          if (!matchesSearch) return false
        }
        
        return true
      },
    }),
    {
      name: 'calendar-store',
    }
  )
)

// Notification store
export const useNotificationStore = create<NotificationState & NotificationActions>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      setNotifications: (notifications) => set({
        notifications,
        unreadCount: notifications.filter(n => !n.isRead).length
      }),

      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1
      })),

      markAsRead: (notificationIds) => set((state) => {
        const updatedNotifications = state.notifications.map(n =>
          notificationIds.includes(n.id) ? { ...n, isRead: true, readAt: new Date() } : n
        )
        return {
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter(n => !n.isRead).length
        }
      }),

      removeNotification: (notificationId) => set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId)
        const updatedNotifications = state.notifications.filter(n => n.id !== notificationId)
        return {
          notifications: updatedNotifications,
          unreadCount: notification && !notification.isRead 
            ? state.unreadCount - 1 
            : state.unreadCount
        }
      }),

      clearAllNotifications: () => set({
        notifications: [],
        unreadCount: 0
      }),
    }),
    {
      name: 'calendar-notification-store',
    }
  )
)

// Analytics store
export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  devtools(
    (set) => ({
      timeframe: 'month',
      isLoading: false,
      showAnalytics: false,

      setAnalytics: (analytics) => set({ analytics }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setAnalyticsLoading: (isLoading) => set({ isLoading }),
      setAnalyticsError: (error) => set({ error }),
      setShowAnalytics: (show) => set({ showAnalytics: show }),
    }),
    {
      name: 'calendar-analytics-store',
    }
  )
)

// Scheduling store
export const useSchedulingStore = create<SchedulingState & SchedulingActions>()(
  devtools(
    (set) => ({
      suggestions: [],
      isSearching: false,

      setSuggestions: (suggestions) => set({ suggestions }),
      setSearching: (isSearching) => set({ isSearching }),
      setSchedulingError: (error) => set({ error }),
      clearSuggestions: () => set({ suggestions: [], error: undefined }),
    }),
    {
      name: 'calendar-scheduling-store',
    }
  )
)

// Preferences store
export const usePreferencesStore = create<PreferencesState & PreferencesActions>()(
  devtools(
    (set) => ({
      preferences: defaultPreferences,

      setPreferences: (preferences) => set({ preferences }),
      updatePreferences: (updates) => set((state) => ({
        preferences: { ...state.preferences, ...updates }
      })),
    }),
    {
      name: 'calendar-preferences-store',
    }
  )
)