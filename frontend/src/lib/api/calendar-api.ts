// src/lib/api/calendar-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  EventCategory,
  CalendarEventAPI,
  CreateEventRequest,
  UpdateEventRequest,
  CalendarViewParams,
  ScheduleSuggestion,
  TimeSlot
} from '@/types/calendar';

// Query Keys
export const calendarKeys = {
  all: ['calendar'] as const,
  events: () => [...calendarKeys.all, 'events'] as const,
  event: (id: string) => [...calendarKeys.events(), id] as const,
  view: (view: CalendarViewParams) => [...calendarKeys.events(), { view }] as const,
  upcoming: () => [...calendarKeys.events(), 'upcoming'] as const,
  suggestions: (params: any) => [...calendarKeys.all, 'suggestions', params] as const,
  availability: (userId: string, date: string) => [...calendarKeys.all, 'availability', userId, date] as const,
  categories: () => [...calendarKeys.all, 'categories'] as const,
  category: (id: string) => [...calendarKeys.categories(), id] as const,
  dashboardStats: (workspaceId: string) => [...calendarKeys.all, 'dashboard-stats', workspaceId] as const,
};

// API Functions
export const calendarApi = {
  // Events
  async getEvents(workspaceId: string, view: CalendarViewParams, filters?: {
    search?: string;
    categories?: string[];
    priorities?: string[];
    statuses?: string[];
    tags?: string[];
    attendees?: string[];
    showDeclined?: boolean;
    showCancelled?: boolean;
    showPrivate?: boolean;
  }): Promise<CalendarEventAPI[]> {
    const params = new URLSearchParams({
      start_date: view.start,
      end_date: view.end,
    });
    
    // Add filter parameters
    if (filters) {
      if (filters.search) params.append('search', filters.search);
      if (filters.categories?.length) params.append('categories', filters.categories.join(','));
      if (filters.priorities?.length) params.append('priorities', filters.priorities.join(','));
      if (filters.statuses?.length) params.append('statuses', filters.statuses.join(','));
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.attendees?.length) params.append('attendees', filters.attendees.join(','));
      if (filters.showDeclined !== undefined) params.append('show_declined', filters.showDeclined.toString());
      if (filters.showCancelled !== undefined) params.append('show_cancelled', filters.showCancelled.toString());
      if (filters.showPrivate !== undefined) params.append('show_private', filters.showPrivate.toString());
    }
    
    return api.get<CalendarEventAPI[]>(`/workspaces/${workspaceId}/calendar/events?${params}`);
  },

  async getEvent(workspaceId: string, eventId: string): Promise<CalendarEventAPI> {
    return api.get<CalendarEventAPI>(`/workspaces/${workspaceId}/calendar/events/${eventId}`);
  },

  async createEvent(workspaceId: string, data: CreateEventRequest): Promise<CalendarEventAPI> {
    return api.post<CalendarEventAPI>(`/workspaces/${workspaceId}/calendar/events`, data);
  },

  async updateEvent(workspaceId: string, eventId: string, data: UpdateEventRequest): Promise<CalendarEventAPI> {
    return api.patch<CalendarEventAPI>(`/workspaces/${workspaceId}/calendar/events/${eventId}`, data);
  },

  async deleteEvent(workspaceId: string, eventId: string, deleteSeriesé: boolean = false): Promise<void> {
    const params = deleteSeriesé ? '?deleteSeries=true' : '';
    await api.delete(`/workspaces/${workspaceId}/calendar/events/${eventId}${params}`);
  },

  // Search events
  async searchEvents(workspaceId: string, query: string, filters?: {
    categories?: string[];
    priorities?: string[];
    statuses?: string[];
    tags?: string[];
    dateRange?: { start: string; end: string };
  }): Promise<CalendarEventAPI[]> {
    const params = new URLSearchParams({ q: query });
    
    if (filters) {
      if (filters.categories?.length) params.append('categories', filters.categories.join(','));
      if (filters.priorities?.length) params.append('priorities', filters.priorities.join(','));
      if (filters.statuses?.length) params.append('statuses', filters.statuses.join(','));
      if (filters.tags?.length) params.append('tags', filters.tags.join(','));
      if (filters.dateRange) {
        params.append('start_date', filters.dateRange.start);
        params.append('end_date', filters.dateRange.end);
      }
    }
    
    return api.get<CalendarEventAPI[]>(`/workspaces/${workspaceId}/calendar/search?${params}`);
  },

  async duplicateEvent(eventId: string): Promise<CalendarEventAPI> {
    return api.post<CalendarEventAPI>(`/calendar/events/${eventId}/duplicate`, null);
  },

  // Event responses
  async respondToEvent(eventId: string, response: 'accepted' | 'declined' | 'maybe'): Promise<void> {
    await api.post(`/calendar/events/${eventId}/respond`, { response });
  },

  // Upcoming events
  async getUpcomingEvents(workspaceId: string, days = 7): Promise<CalendarEventAPI[]> {
    return api.get<CalendarEventAPI[]>(`/workspaces/${workspaceId}/calendar/upcoming?days=${days}`);
  },

  // Smart scheduling
  async getScheduleSuggestions(workspaceId: string, params: {
    duration: number;
    attendees: string[];
    preferredTimes?: string[];
    startDate: string;
    endDate: string;
  }): Promise<ScheduleSuggestion> {
    return api.post<ScheduleSuggestion>(`/workspaces/${workspaceId}/calendar/suggestions`, params);
  },

  // AI Schedule Suggestions
  async getAIScheduleSuggestions(workspaceId: string, params: {
    title: string;
    description?: string;
    duration: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    attendees: string[];
    location?: string;
    timePreference: 'morning' | 'afternoon' | 'evening' | 'any';
    lookAheadDays: number;
    includeWeekends: boolean;
  }): Promise<{
    success: boolean;
    summary: string;
    suggestions: Array<{
      startTime: string;
      endTime: string;
      confidence: number;
      reason: string;
      considerations: string[];
      availableRooms: Array<{
        id: string;
        name: string;
        capacity: number;
        equipment: string[];
      }>;
    }>;
    insights: string[];
    constraints: string[];
    alternatives: string[];
  }> {
    return api.post(`/workspaces/${workspaceId}/calendar/ai/schedule-suggestions`, params);
  },

  // Smart Event Creator (Natural Language)
  async getSmartSchedule(workspaceId: string, params: {
    prompt: string;
    context?: string;
    maxLookAheadDays?: number;
    includeWeekends?: boolean;
    timezone?: string;
    additionalNotes?: string;
  }): Promise<{
    success: boolean;
    interpretation: string;
    extractedInfo: {
      title: string;
      description: string;
      estimatedDuration: number;
      priority: string;
      attendees: string[];
      preferredLocation: string;
      timePreferences: string[];
      requirements: string[];
      constraints: string[];
      confidence: number;
    };
    suggestions: Array<{
      startTime: string;
      endTime: string;
      confidence: number;
      reasoning: string;
      promptMatchScore: number;
      considerations: string[];
      recommendedRoom?: {
        id: string;
        name: string;
        capacity: number;
        equipment: string[];
        whyRecommended: string;
      };
      alternativeRooms?: Array<{
        id: string;
        name: string;
        capacity: number;
        equipment: string[];
        note: string;
      }>;
    }>;
    insights: string[];
    missingInfo?: string[];
    clarifyingQuestions?: string[];
    alternatives?: string[];
    followUpSuggestions?: string[];
  }> {
    return api.post(`/workspaces/${workspaceId}/calendar/ai/smart-schedule`, params);
  },

  async checkAvailability(userId: string, date: string): Promise<{
    available: boolean;
    busySlots: Array<{ start: string; end: string }>;
  }> {
    return api.get(`/calendar/availability/${userId}?date=${date}`);
  },

  // Dashboard Analytics
  async getDashboardStats(workspaceId: string, period: string = 'week'): Promise<{
    overview: {
      totalEvents: number;
      totalEventTime: number;
      timeUtilization: number;
      unscheduledTime: number;
      period: string;
      timeRange: string;
      utilizationComparison: string;
      availabilityNote: string;
    };
    weeklyActivity: Array<{
      day: string;
      events: number;
      hours: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      eventCount: number;
      percentage: number;
    }>;
    categoryStats: Array<{
      name: string;
      totalTime: number;
      eventCount: number;
      percentage: number;
      color: string;
    }>;
    priorityStats: Array<{
      priority: string;
      eventCount: number;
      totalTime: number;
      percentage: number;
      color: string;
    }>;
    categoryBreakdown: Array<{
      category: string;
      timeSpent: string;
      eventCount: number;
      color: string;
    }>;
    insights: {
      peakHour: string;
      busiestDay: string;
      commonDuration: string;
      meetingPattern: string;
      productivityTip: string;
    };
    dateRange: {
      startDate: string;
      endDate: string;
    };
    generatedAt: string;
  }> {
    return api.get(`/workspaces/${workspaceId}/calendar/dashboard-stats?period=${period}`);
  },

  // Calendar sync
  async syncCalendar(provider: 'google' | 'outlook', authCode: string): Promise<{
    synced: boolean;
    message: string;
  }> {
    return api.post(`/calendar/sync/${provider}`, { authCode });
  },

  async unsyncCalendar(provider: 'google' | 'outlook'): Promise<void> {
    await api.delete(`/calendar/sync/${provider}`);
  },

  // Export/Import
  async exportCalendar(workspaceId: string, format: 'ics' | 'csv'): Promise<Blob> {
    const response = await api.get<Blob>(
      `/workspaces/${workspaceId}/calendar/export?format=${format}`,
      { headers: { Accept: 'application/octet-stream' } }
    );
    return response;
  },

  async importEvents(workspaceId: string, file: File): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post(`/workspaces/${workspaceId}/calendar/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Meeting room management
  async getMeetingRooms(workspaceId: string): Promise<Array<{
    id: string;
    name: string;
    capacity: number;
    location: string;
    facilities: string[];
    color: string;
    is_active: boolean;
    description?: string;
  }>> {
    return api.get(`/workspaces/${workspaceId}/calendar/rooms`);
  },

  async createMeetingRoom(workspaceId: string, data: {
    name: string;
    description?: string;
    capacity: number;
    location?: string;
    equipment?: string[];
    room_type: 'conference' | 'meeting' | 'huddle' | 'training' | 'presentation' | 'phone_booth';
  }): Promise<any> {
    return api.post(`/workspaces/${workspaceId}/calendar/rooms`, data);
  },

  async updateMeetingRoom(workspaceId: string, roomId: string, data: Partial<{
    name: string;
    description?: string;
    capacity: number;
    location?: string;
    equipment?: string[];
    room_type: 'conference' | 'meeting' | 'huddle' | 'training' | 'presentation' | 'phone_booth';
  }>): Promise<any> {
    return api.patch(`/workspaces/${workspaceId}/calendar/rooms/${roomId}`, data);
  },

  async deleteMeetingRoom(workspaceId: string, roomId: string): Promise<void> {
    return api.delete(`/workspaces/${workspaceId}/calendar/rooms/${roomId}`);
  },

  async bookMeetingRoom(eventId: string, roomId: string): Promise<void> {
    await api.post(`/calendar/events/${eventId}/book-room`, { roomId });
  },

  // Event Categories
  async getEventCategories(workspaceId: string): Promise<EventCategory[]> {
    return api.get<EventCategory[]>(`/workspaces/${workspaceId}/calendar/categories`);
  },

  async getEventCategory(workspaceId: string, categoryId: string): Promise<EventCategory> {
    return api.get<EventCategory>(`/workspaces/${workspaceId}/calendar/categories/${categoryId}`);
  },

  async createEventCategory(workspaceId: string, data: {
    name: string;
    description?: string;
    color: string;
    icon?: string;
  }): Promise<EventCategory> {
    return api.post<EventCategory>(`/workspaces/${workspaceId}/calendar/categories`, data);
  },

  async updateEventCategory(workspaceId: string, categoryId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<EventCategory> {
    return api.patch<EventCategory>(`/workspaces/${workspaceId}/calendar/categories/${categoryId}`, data);
  },

  async deleteEventCategory(workspaceId: string, categoryId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/calendar/categories/${categoryId}`);
  },
};

// React Query Hooks
export const useCalendarEvents = (
  workspaceId: string, 
  view: CalendarViewParams,
  filters?: {
    search?: string;
    categories?: string[];
    priorities?: string[];
    statuses?: string[];
    tags?: string[];
    attendees?: string[];
    showDeclined?: boolean;
    showCancelled?: boolean;
    showPrivate?: boolean;
  }
) => {
  return useQuery({
    queryKey: [...calendarKeys.view(view), 'filtered', filters],
    queryFn: () => calendarApi.getEvents(workspaceId, view, filters),
    enabled: !!workspaceId,
    // Debounce search queries to avoid too many API calls
    refetchOnWindowFocus: !filters?.search,
    staleTime: filters?.search ? 0 : 30000, // 30 seconds for regular queries, 0 for search
  });
};

export const useSearchEvents = (
  workspaceId: string,
  query: string,
  filters?: {
    categories?: string[];
    priorities?: string[];
    statuses?: string[];
    tags?: string[];
    dateRange?: { start: string; end: string };
  }
) => {
  return useQuery({
    queryKey: [...calendarKeys.all, 'search', query, filters],
    queryFn: () => calendarApi.searchEvents(workspaceId, query, filters),
    enabled: !!workspaceId && query.length >= 2, // Only search when query is at least 2 characters
    staleTime: 0, // Always fresh for search results
  });
};

export const useCalendarEvent = (workspaceId: string, eventId: string) => {
  return useQuery({
    queryKey: calendarKeys.event(eventId),
    queryFn: () => calendarApi.getEvent(workspaceId, eventId),
    enabled: !!workspaceId && !!eventId,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateEventRequest }) =>
      calendarApi.createEvent(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      queryClient.invalidateQueries({ queryKey: calendarKeys.upcoming() });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, eventId, data }: { workspaceId: string; eventId: string; data: UpdateEventRequest }) =>
      calendarApi.updateEvent(workspaceId, eventId, data),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.event(eventId) });
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, eventId, deleteSeries }: { workspaceId: string; eventId: string; deleteSeries?: boolean }) =>
      calendarApi.deleteEvent(workspaceId, eventId, deleteSeries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
};

export const useUpcomingEvents = (workspaceId: string, days?: number) => {
  return useQuery({
    queryKey: calendarKeys.upcoming(),
    queryFn: () => calendarApi.getUpcomingEvents(workspaceId, days),
    enabled: !!workspaceId,
  });
};

export const useScheduleSuggestions = (workspaceId: string) => {
  return useMutation({
    mutationFn: (params: Parameters<typeof calendarApi.getScheduleSuggestions>[1]) =>
      calendarApi.getScheduleSuggestions(workspaceId, params),
  });
};

export const useAIScheduleSuggestions = (workspaceId: string) => {
  return useMutation({
    mutationFn: (params: Parameters<typeof calendarApi.getAIScheduleSuggestions>[1]) =>
      calendarApi.getAIScheduleSuggestions(workspaceId, params),
  });
};

export const useSmartSchedule = (workspaceId: string) => {
  return useMutation({
    mutationFn: (params: Parameters<typeof calendarApi.getSmartSchedule>[1]) =>
      calendarApi.getSmartSchedule(workspaceId, params),
  });
};

export const useDashboardStats = (workspaceId: string, period: string = 'week') => {
  return useQuery({
    queryKey: [...calendarKeys.dashboardStats(workspaceId), period],
    queryFn: () => calendarApi.getDashboardStats(workspaceId, period),
    enabled: !!workspaceId,
  });
};

export const useRespondToEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, response }: { 
      eventId: string; 
      response: 'accepted' | 'declined' | 'maybe';
    }) => calendarApi.respondToEvent(eventId, response),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.event(eventId) });
    },
  });
};

export const useSyncCalendar = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ provider, authCode }: { 
      provider: 'google' | 'outlook'; 
      authCode: string;
    }) => calendarApi.syncCalendar(provider, authCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
};

export const useImportEvents = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, file }: { workspaceId: string; file: File }) =>
      calendarApi.importEvents(workspaceId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
};

export const useCheckAvailability = (userId: string, date: string) => {
  return useQuery({
    queryKey: calendarKeys.availability(userId, date),
    queryFn: () => calendarApi.checkAvailability(userId, date),
    enabled: !!userId && !!date,
  });
};

// Event Category Hooks
export const useEventCategories = (workspaceId: string) => {
  return useQuery({
    queryKey: [...calendarKeys.categories(), workspaceId],
    queryFn: () => calendarApi.getEventCategories(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useEventCategory = (workspaceId: string, categoryId: string) => {
  return useQuery({
    queryKey: calendarKeys.category(categoryId),
    queryFn: () => calendarApi.getEventCategory(workspaceId, categoryId),
    enabled: !!workspaceId && !!categoryId,
  });
};

export const useCreateEventCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { 
      workspaceId: string; 
      data: Parameters<typeof calendarApi.createEventCategory>[1];
    }) => calendarApi.createEventCategory(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.categories() });
    },
  });
};

export const useUpdateEventCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, categoryId, data }: { 
      workspaceId: string;
      categoryId: string;
      data: Parameters<typeof calendarApi.updateEventCategory>[2];
    }) => calendarApi.updateEventCategory(workspaceId, categoryId, data),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.category(categoryId) });
      queryClient.invalidateQueries({ queryKey: calendarKeys.categories() });
    },
  });
};

export const useDeleteEventCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, categoryId }: { 
      workspaceId: string;
      categoryId: string;
    }) => calendarApi.deleteEventCategory(workspaceId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.categories() });
    },
  });
};

// Meeting Room Hooks
export const useMeetingRooms = (workspaceId?: string) => {
  return useQuery({
    queryKey: [...calendarKeys.all, 'rooms', workspaceId],
    queryFn: () => workspaceId ? calendarApi.getMeetingRooms(workspaceId) : Promise.resolve([]),
    enabled: !!workspaceId,
  });
};

export const useCreateMeetingRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { 
      workspaceId: string; 
      data: Parameters<typeof calendarApi.createMeetingRoom>[1];
    }) => calendarApi.createMeetingRoom(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...calendarKeys.all, 'rooms', workspaceId] });
    },
  });
};

export const useUpdateMeetingRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, roomId, data }: { 
      workspaceId: string;
      roomId: string;
      data: Parameters<typeof calendarApi.updateMeetingRoom>[2];
    }) => calendarApi.updateMeetingRoom(workspaceId, roomId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...calendarKeys.all, 'rooms', workspaceId] });
    },
  });
};

export const useDeleteMeetingRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, roomId }: { 
      workspaceId: string;
      roomId: string;
    }) => calendarApi.deleteMeetingRoom(workspaceId, roomId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: [...calendarKeys.all, 'rooms', workspaceId] });
    },
  });
};

// Room Bookings Hook
export const useRoomBookings = (workspaceId: string | undefined, roomId: string) => {
  return useQuery({
    queryKey: [...calendarKeys.all, 'rooms', workspaceId, roomId, 'bookings'],
    queryFn: async () => {
      if (!workspaceId) {
        console.log('[DEBUG] useRoomBookings: No workspaceId provided');
        return [];
      }
      
      console.log(`[DEBUG] useRoomBookings: Fetching bookings for room ${roomId} in workspace ${workspaceId}`);
      
      try {
        const response = await api.get(`/workspaces/${workspaceId}/calendar/rooms/${roomId}/bookings`);
        console.log(`[DEBUG] useRoomBookings: Raw API response:`, response);
        
        // The api.get function should return the data directly, not wrapped in .data
        // If it's an array, return it; otherwise return empty array
        const bookings = Array.isArray(response) ? response : [];
        console.log(`[DEBUG] useRoomBookings: Processed bookings:`, bookings);
        
        return bookings;
      } catch (error) {
        console.error('[ERROR] useRoomBookings: Failed to fetch room bookings:', error);
        // Return empty array instead of undefined to prevent TanStack Query errors
        return [];
      }
    },
    enabled: !!workspaceId && !!roomId,
    // Remove auto-refresh to prevent infinite calls
    // Users can manually refresh if needed
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Calendar AI Agent
export interface CalendarAgentRequest {
  prompt: string;
  timezone?: string; // User's timezone (IANA format, e.g., 'Asia/Tokyo')
}

export interface CalendarAgentResponse {
  success: boolean;
  action: 'create' | 'update' | 'delete' | 'batch_create' | 'batch_update' | 'batch_delete' | 'search' | 'unknown';
  message: string;
  data?: any;
  error?: string;
}

export const useCalendarAgent = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CalendarAgentRequest): Promise<CalendarAgentResponse> => {
      return api.post<CalendarAgentResponse>(`/workspaces/${workspaceId}/calendar/agent`, request);
    },
    onSuccess: (data) => {
      // Invalidate calendar queries if the action was successful
      if (data.success && ['create', 'update', 'delete', 'batch_create', 'batch_update', 'batch_delete'].includes(data.action)) {
        queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
        queryClient.invalidateQueries({ queryKey: calendarKeys.upcoming() });
      }
    },
  });
};

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

export interface GoogleCalendarInfo {
  id: string;
  name: string;
  color?: string;
  primary?: boolean;
  description?: string;
}

export interface GoogleCalendarConnection {
  id: string;
  workspaceId: string;
  userId: string;
  googleEmail: string;
  calendarId: string;
  calendarName?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  // Multi-calendar support
  availableCalendars: GoogleCalendarInfo[];
  selectedCalendars: GoogleCalendarInfo[];
}

export interface GoogleCalendarConnectionResponse {
  connected: boolean;
  data?: GoogleCalendarConnection;
}

export interface GoogleCalendarAuthUrlResponse {
  authorizationUrl: string;
  state: string;
}

export interface GoogleCalendarSyncResult {
  synced: number;
  deleted: number;
}

// Google Calendar Query Keys
export const googleCalendarKeys = {
  all: ['google-calendar'] as const,
  connection: (workspaceId: string) => [...googleCalendarKeys.all, 'connection', workspaceId] as const,
};

// Google Calendar API Functions
export const googleCalendarApi = {
  // Get OAuth authorization URL
  async getAuthUrl(workspaceId: string, returnUrl?: string): Promise<GoogleCalendarAuthUrlResponse> {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    return api.get<GoogleCalendarAuthUrlResponse>(`/workspaces/${workspaceId}/calendar/google/auth-url${params}`);
  },

  // Get connection status
  async getConnection(workspaceId: string): Promise<GoogleCalendarConnectionResponse> {
    return api.get<GoogleCalendarConnectionResponse>(`/workspaces/${workspaceId}/calendar/google/connection`);
  },

  // Manual sync
  async sync(workspaceId: string): Promise<GoogleCalendarSyncResult> {
    return api.post<GoogleCalendarSyncResult>(`/workspaces/${workspaceId}/calendar/google/sync`, {});
  },

  // Disconnect
  async disconnect(workspaceId: string): Promise<{ success: boolean; message: string }> {
    return api.delete(`/workspaces/${workspaceId}/calendar/google/disconnect`);
  },

  // Update selected calendars for sync
  async updateSelectedCalendars(workspaceId: string, calendarIds: string[]): Promise<GoogleCalendarConnection> {
    return api.put<GoogleCalendarConnection>(`/workspaces/${workspaceId}/calendar/google/calendars`, { calendarIds });
  },

  // Refresh available calendars from Google
  async refreshAvailableCalendars(workspaceId: string): Promise<GoogleCalendarConnection> {
    return api.post<GoogleCalendarConnection>(`/workspaces/${workspaceId}/calendar/google/calendars/refresh`, {});
  },
};

// Google Calendar Hooks
export const useGoogleCalendarConnection = (workspaceId: string) => {
  return useQuery({
    queryKey: googleCalendarKeys.connection(workspaceId),
    queryFn: () => googleCalendarApi.getConnection(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
  });
};

export const useGoogleCalendarSync = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleCalendarApi.sync(workspaceId),
    onSuccess: () => {
      // Invalidate calendar events to refetch synced events
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      queryClient.invalidateQueries({ queryKey: calendarKeys.upcoming() });
    },
  });
};

export const useGoogleCalendarDisconnect = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleCalendarApi.disconnect(workspaceId),
    onSuccess: () => {
      // Invalidate connection status
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.connection(workspaceId) });
      // Refresh calendar events (synced events should be removed)
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
};

export const useUpdateSelectedCalendars = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (calendarIds: string[]) => googleCalendarApi.updateSelectedCalendars(workspaceId, calendarIds),
    onSuccess: () => {
      // Invalidate connection status to refresh selected calendars
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.connection(workspaceId) });
      // Refresh calendar events to show events from newly selected calendars
      queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
};

export const useRefreshAvailableCalendars = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => googleCalendarApi.refreshAvailableCalendars(workspaceId),
    onSuccess: () => {
      // Invalidate connection status to show updated available calendars
      queryClient.invalidateQueries({ queryKey: googleCalendarKeys.connection(workspaceId) });
    },
  });
};

// Backward compatibility: export as calendarService
export const calendarService = calendarApi;
