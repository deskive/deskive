export type EventPriority = 'low' | 'normal' | 'high' | 'urgent'
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled' | 'pending'
export type CalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda' | 'timeline'
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative'
export type NotificationType = 'email' | 'push' | 'in_app' | 'sms'
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'foggy'
export type FocusTimeType = 'deep_work' | 'creative' | 'admin' | 'learning' | 'break'
export type TravelMode = 'driving' | 'walking' | 'public_transit' | 'cycling'
export type ConflictType = 'overlap' | 'travel_time' | 'double_booking' | 'focus_time'
export type AnalyticsTimeframe = 'week' | 'month' | 'quarter' | 'year'

export interface EventCategory {
  id: string
  name: string
  color: string
  icon?: string
  description?: string
  isDefault?: boolean
  isSystem?: boolean
  eventCount?: number
  userId: string
  workspaceId: string
  createdAt: string | Date
  updatedAt: string | Date
}

// Unified attachments structure
export interface EventAttachments {
  file_attachment: string[]
  note_attachment: string[]
  event_attachment: string[]
  drive_attachment?: Array<{
    id: string
    title: string
    driveFileUrl?: string
    driveThumbnailUrl?: string
    driveMimeType?: string
    driveFileSize?: number
  }>
}

// API-specific types (snake_case for backend compatibility)
export interface CalendarEventAPI {
  id: string
  workspace_id?: string
  workspaceId?: string // camelCase for Google events
  title: string
  description?: string
  start_time?: string
  end_time?: string
  startTime?: string // camelCase for Google events
  endTime?: string // camelCase for Google events
  all_day?: boolean
  allDay?: boolean // camelCase for Google events
  location?: string
  meeting_url?: string
  meetingUrl?: string // camelCase for Google events
  room_id?: string
  roomId?: string // camelCase for Google events
  category_id?: string
  categoryId?: string // camelCase for Google events
  color?: string
  attendees?: EventAttendeeAPI[] | string[] // Can be array of objects or strings for Google events
  reminders?: number[] // Minutes before event
  recurrence_rule?: RecurrenceRuleAPI
  isRecurring?: boolean // For Google events
  status: 'confirmed' | 'tentative' | 'cancelled' | 'pending'
  visibility: 'private' | 'public' | 'internal'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  organizer_id?: string
  organizerId?: string // camelCase for Google events
  userId?: string // For Google events
  attachments?: EventAttachments
  created_at?: string
  updated_at?: string
  createdAt?: string // camelCase for Google events
  updatedAt?: string // camelCase for Google events
  tags?: string[] // For Google events
  // Google Calendar sync fields (snake_case from local DB)
  synced_from_google?: boolean
  google_calendar_event_id?: string
  google_calendar_html_link?: string
  // Google Calendar sync fields (camelCase from Google API)
  syncedFromGoogle?: boolean
  googleCalendarEventId?: string
  googleCalendarHtmlLink?: string
  googleCalendarName?: string
  googleCalendarColor?: string
}

export interface EventAttendeeAPI {
  user_id: string
  email: string
  name: string
  status: 'accepted' | 'declined' | 'tentative' | 'pending'
  is_organizer: boolean
}

export interface RecurrenceRuleAPI {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  until?: string
  count?: number
  byWeekDay?: number[]
  byMonth?: number[]
  byMonthDay?: number[]
}

export interface CreateEventRequest {
  title: string
  description?: string
  start_time: string
  end_time: string
  all_day?: boolean
  location?: string
  meeting_url?: string
  room_id?: string
  category_id?: string
  attendees?: string[] // User IDs
  reminders?: number[] // Minutes before event
  visibility?: 'private' | 'public' | 'internal'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  status?: 'confirmed' | 'tentative' | 'cancelled'
  is_recurring?: boolean
  recurrence_rule?: RecurrenceRuleAPI
  attachments?: EventAttachments // Unified attachments object
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  updateSeries?: boolean // For recurring events
}

export interface CalendarViewParams {
  start: string
  end: string
  timezone: string
}

export interface ScheduleSuggestion {
  slots: TimeSlot[]
  bestTime?: TimeSlot
}

export interface TimeSlot {
  start: string
  end: string
  score: number
  conflicts: string[]
}

export interface Location {
  name: string
  address?: string
  coordinates?: {
    lat: number
    lng: number
  }
  timezone?: string
  type?: 'physical' | 'virtual' | 'hybrid'
  virtualLink?: string
  travelTime?: {
    duration: number // minutes
    mode: TravelMode
    distance?: number // km
    lastUpdated: Date
  }
  weatherSensitive?: boolean
}

export interface Attendee {
  id: string
  email: string
  name: string
  status: AttendeeStatus
  role?: 'organizer' | 'attendee' | 'optional'
  avatar?: string
  responseTime?: Date
}

export interface RecurrenceRule {
  pattern: RecurrencePattern
  interval: number
  endDate?: Date
  count?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  monthOfYear?: number
  exceptions?: Date[]
  weekOfMonth?: number
}

export interface Reminder {
  id: string
  type: NotificationType
  minutes: number
  minutesBefore?: number
  isActive: boolean
  customMessage?: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date | string
  endTime: Date | string
  isAllDay: boolean
  isRecurring?: boolean
  location?: Location | string
  categoryId: string
  priority: EventPriority
  status: EventStatus
  attendees: Attendee[] | string[]
  reminders: Reminder[]
  recurrence?: RecurrenceRule
  parentEventId?: string
  parent_event_id?: string // From backend for occurrences
  is_occurrence?: boolean // From backend for virtual occurrences
  attachments?: EventAttachments // Unified attachments object
  tags: string[]
  isPrivate: boolean
  color?: string
  meetingLink?: string
  roomId?: string
  travelTime?: number
  bufferTime?: {
    before: number
    after: number
  }
  metadata?: Record<string, unknown>
  userId: string
  organizerId?: string // Organizer user ID from backend (organizer_id)
  createdAt: Date | string
  updatedAt: Date | string
  // Google Calendar sync fields
  syncedFromGoogle?: boolean
  googleCalendarEventId?: string
  googleCalendarHtmlLink?: string
  googleCalendarName?: string
  googleCalendarColor?: string
}

export interface EventTemplate {
  id: string
  name: string
  description?: string
  defaultTitle: string
  defaultDescription?: string
  defaultDuration: number // minutes
  categoryId: string
  defaultLocation?: Partial<Location>
  defaultAttendees?: Partial<Attendee>[]
  defaultReminders: Reminder[]
  defaultPriority: EventPriority
  defaultTags: string[]
  userId: string
  workspaceId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CalendarConflict {
  id: string
  type: ConflictType
  severity: 'low' | 'medium' | 'high'
  eventIds: string[]
  description: string
  suggestedResolutions?: ConflictResolution[]
  resolvedAt?: Date
  resolvedBy?: string
  createdAt: Date
}

export interface ConflictResolution {
  id: string
  type: 'reschedule' | 'cancel' | 'modify' | 'ignore'
  description: string
  affectedEventIds: string[]
  suggestedChanges?: Partial<CalendarEvent>[]
}

export interface CalendarFilter {
  categories: string[]
  attendees: string[]
  priorities: EventPriority[]
  statuses: EventStatus[]
  tags: string[]
  searchQuery: string
  dateRange?: {
    start: Date
    end: Date
  }
  showDeclinedEvents: boolean
  showCancelledEvents: boolean
  showPrivateEvents: boolean
}

export interface UserPreferences {
  defaultView: CalendarView
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
  defaultEventDuration: number // minutes
  workingHours: {
    start: string // HH:mm
    end: string // HH:mm
  }
  workingDays: number[]
  defaultReminders: Reminder[]
  showWeekNumbers: boolean
  timeZone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  showDeclinedEvents: boolean
  showTentativeEvents: boolean
  enableWeatherIntegration: boolean
  enableSmartScheduling: boolean
  focusTimePreferences: {
    type: FocusTimeType
    preferredHours: string[]
    minDuration: number
  }[]
}

export interface CalendarNotification {
  id: string
  type: 'reminder' | 'invitation' | 'update' | 'cancellation' | 'conflict'
  title: string
  message: string
  eventId?: string
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  readAt?: Date
  actionRequired?: {
    type: 'respond' | 'review' | 'acknowledge'
    deadline?: Date
  }
  metadata?: Record<string, unknown>
}

export interface SmartSchedulingSuggestion {
  id: string
  eventTitle: string
  suggestedSlots: {
    startTime: Date
    endTime: Date
    score: number
    reasons: string[]
    conflicts: CalendarConflict[]
  }[]
  attendeeAvailability?: {
    attendeeId: string
    availableSlots: { start: Date; end: Date }[]
  }[]
  weatherConsiderations?: {
    date: Date
    condition: WeatherCondition
    recommendation: string
  }[]
  travelTimeEstimates?: {
    fromEventId: string
    toEventId: string
    duration: number
    mode: TravelMode
  }[]
  createdAt: Date
}

export interface CalendarAnalytics {
  timeframe: AnalyticsTimeframe
  totalEvents: number
  completedEvents: number
  cancelledEvents: number
  averageEventDuration: number
  busiestDays: {
    date: Date
    eventCount: number
  }[]
  categoryDistribution: {
    categoryId: string
    categoryName: string
    count: number
    percentage: number
  }[]
  attendanceRate: number
  focusTimeUtilization: number
  meetingEfficiency: {
    onTime: number
    delayed: number
    overtime: number
  }
  topCollaborators: {
    id: string
    name: string
    email: string
    eventCount: number
  }[]
  timeSpentByCategory: {
    categoryId: string
    categoryName: string
    hours: number
  }[]
  weeklyTrends: {
    week: string
    eventCount: number
    totalHours: number
  }[]
  productivityScore: number
  // Nested objects for AnalyticsPage compatibility
  overview?: {
    totalEvents: number
    completedEvents: number
    cancelledEvents: number
    averageEventDuration: number
    attendanceRate: number
    productivityScore: number
  }
  patterns?: {
    busyHours: Array<{
      hour: number
      eventCount: number
      utilizationRate: number
    }>
    busyDays: Array<{
      dayOfWeek: string
      eventCount: number
      utilizationRate: number
    }>
    timeSpentByCategory: {
      categoryId: string
      categoryName: string
      hours: number
    }[]
  }
  meetings?: {
    efficiency: {
      onTime: number
      delayed: number
      overtime: number
    }
    topCollaborators: {
      id: string
      name: string
      email: string
      eventCount: number
    }[]
    weeklyTrends: {
      week: string
      eventCount: number
      totalHours: number
    }[]
  }
}

export interface CalendarState {
  currentView: CalendarView
  currentDate: Date
  selectedEventId?: string
  events: CalendarEvent[]
  categories: EventCategory[]
  templates: EventTemplate[]
  conflicts: CalendarConflict[]
  filters: CalendarFilter
  selectedRange?: {
    start: Date
    end: Date
  }
  draggedEvent?: {
    eventId: string
    originalStartTime: Date
    originalEndTime: Date
  }
  isLoading: boolean
  error?: string
}

// Input types for API operations
export interface CreateEventInput {
  title: string
  description?: string
  startTime: Date
  endTime: Date
  isAllDay: boolean
  location?: Location
  categoryId: string
  priority: EventPriority
  status: EventStatus
  attendees: Omit<Attendee, 'id'>[]
  reminders: Reminder[]
  recurrence?: RecurrenceRule
  tags: string[]
  isPrivate: boolean
  color?: string
  travelTime?: number
  bufferTime?: {
    before: number
    after: number
  }
  metadata?: Record<string, unknown>
}

export interface UpdateEventInput {
  title?: string
  description?: string
  startTime?: Date
  endTime?: Date
  isAllDay?: boolean
  location?: Location | string
  categoryId?: string
  priority?: EventPriority
  status?: EventStatus
  attendees?: Omit<Attendee, 'id'>[]
  reminders?: Reminder[]
  recurrence?: RecurrenceRule
  tags?: string[]
  isPrivate?: boolean
  color?: string
  travelTime?: number
  bufferTime?: {
    before: number
    after: number
  }
  metadata?: Record<string, unknown>
}
