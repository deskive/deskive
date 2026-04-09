/**
 * Video History Store - Call history and recordings management
 * Clean modular store for video call history
 */

import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import type { CallHistory, Recording, MeetingSummary, ScheduledMeeting } from '@/types/video'

interface VideoHistoryStore {
  // Call history
  callHistory: CallHistory[]
  
  // Recordings
  recordings: Recording[]
  
  // Scheduled meetings
  scheduledMeetings: ScheduledMeeting[]
  
  // Meeting summaries
  meetingSummaries: MeetingSummary[]
  
  // Filters and search
  historyFilter: 'all' | 'video' | 'audio' | 'completed' | 'missed' | 'declined'
  searchQuery: string
  dateRange: { start: Date | null; end: Date | null }
  
  // Pagination
  currentPage: number
  itemsPerPage: number
  
  // Stats
  totalCalls: number
  totalDuration: number
  averageCallDuration: number
  missedCallsCount: number
  
  // Actions - Call History
  addCallToHistory: (call: Omit<CallHistory, 'id'>) => void
  updateCallInHistory: (callId: string, updates: Partial<CallHistory>) => void
  removeCallFromHistory: (callId: string) => void
  clearCallHistory: () => void
  
  // Actions - Recordings  
  addRecording: (recording: Omit<Recording, 'id'>) => void
  updateRecording: (recordingId: string, updates: Partial<Recording>) => void
  removeRecording: (recordingId: string) => void
  clearRecordings: () => void
  
  // Actions - Scheduled Meetings
  addScheduledMeeting: (meeting: Omit<ScheduledMeeting, 'id'>) => void
  updateScheduledMeeting: (meetingId: string, updates: Partial<ScheduledMeeting>) => void
  removeScheduledMeeting: (meetingId: string) => void
  clearScheduledMeetings: () => void
  
  // Actions - Meeting Summaries
  addMeetingSummary: (summary: MeetingSummary) => void
  updateMeetingSummary: (summaryId: string, updates: Partial<MeetingSummary>) => void
  removeMeetingSummary: (summaryId: string) => void
  clearMeetingSummaries: () => void
  
  // Actions - Filters and Search
  setHistoryFilter: (filter: 'all' | 'video' | 'audio' | 'completed' | 'missed' | 'declined') => void
  setSearchQuery: (query: string) => void
  setDateRange: (start: Date | null, end: Date | null) => void
  clearFilters: () => void
  
  // Actions - Pagination
  setCurrentPage: (page: number) => void
  setItemsPerPage: (items: number) => void
  
  // Computed getters
  getFilteredCallHistory: () => CallHistory[]
  getFilteredRecordings: () => Recording[]
  getUpcomingMeetings: () => ScheduledMeeting[]
  getPastMeetings: () => ScheduledMeeting[]
  
  // Analytics
  updateStats: () => void
  getCallStats: (participantId?: string) => {
    totalCalls: number
    totalDuration: number
    averageDuration: number
    callTypes: { video: number; audio: number }
    callStatuses: { completed: number; missed: number; declined: number }
  }
  getCallTrends: (days: number) => Array<{ date: string; calls: number; duration: number }>
  
  // Bulk operations
  bulkDeleteCalls: (callIds: string[]) => void
  bulkDeleteRecordings: (recordingIds: string[]) => void
  exportHistory: (format: 'json' | 'csv') => string
  importHistory: (data: string, format: 'json' | 'csv') => boolean
}

export const useVideoHistoryStore = create<VideoHistoryStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        callHistory: [],
        recordings: [],
        scheduledMeetings: [],
        meetingSummaries: [],
        
        historyFilter: 'all',
        searchQuery: '',
        dateRange: { start: null, end: null },
        
        currentPage: 1,
        itemsPerPage: 20,
        
        totalCalls: 0,
        totalDuration: 0,
        averageCallDuration: 0,
        missedCallsCount: 0,

        // Actions - Call History
        addCallToHistory: (call: Omit<CallHistory, 'id'>) => {
          const newCall: CallHistory = {
            ...call,
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }

          set(state => ({
            callHistory: [newCall, ...state.callHistory].slice(0, 1000) // Keep last 1000 calls
          }))
          
          get().updateStats()
        },

        updateCallInHistory: (callId: string, updates: Partial<CallHistory>) => {
          set(state => ({
            callHistory: state.callHistory.map(call =>
              call.id === callId ? { ...call, ...updates } : call
            )
          }))
          
          get().updateStats()
        },

        removeCallFromHistory: (callId: string) => {
          set(state => ({
            callHistory: state.callHistory.filter(call => call.id !== callId)
          }))
          
          get().updateStats()
        },

        clearCallHistory: () => {
          set({ 
            callHistory: [],
            totalCalls: 0,
            totalDuration: 0,
            averageCallDuration: 0,
            missedCallsCount: 0
          })
        },

        // Actions - Recordings
        addRecording: (recording: Omit<Recording, 'id'>) => {
          const newRecording: Recording = {
            ...recording,
            id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }

          set(state => ({
            recordings: [newRecording, ...state.recordings]
          }))
        },

        updateRecording: (recordingId: string, updates: Partial<Recording>) => {
          set(state => ({
            recordings: state.recordings.map(recording =>
              recording.id === recordingId ? { ...recording, ...updates } : recording
            )
          }))
        },

        removeRecording: (recordingId: string) => {
          set(state => ({
            recordings: state.recordings.filter(recording => recording.id !== recordingId)
          }))
        },

        clearRecordings: () => {
          set({ recordings: [] })
        },

        // Actions - Scheduled Meetings
        addScheduledMeeting: (meeting: Omit<ScheduledMeeting, 'id'>) => {
          const newMeeting: ScheduledMeeting = {
            ...meeting,
            id: `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }

          set(state => ({
            scheduledMeetings: [...state.scheduledMeetings, newMeeting]
              .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          }))
        },

        updateScheduledMeeting: (meetingId: string, updates: Partial<ScheduledMeeting>) => {
          set(state => ({
            scheduledMeetings: state.scheduledMeetings.map(meeting =>
              meeting.id === meetingId ? { ...meeting, ...updates } : meeting
            ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
          }))
        },

        removeScheduledMeeting: (meetingId: string) => {
          set(state => ({
            scheduledMeetings: state.scheduledMeetings.filter(meeting => meeting.id !== meetingId)
          }))
        },

        clearScheduledMeetings: () => {
          set({ scheduledMeetings: [] })
        },

        // Actions - Meeting Summaries
        addMeetingSummary: (summary: MeetingSummary) => {
          set(state => ({
            meetingSummaries: [summary, ...state.meetingSummaries]
          }))
        },

        updateMeetingSummary: (summaryId: string, updates: Partial<MeetingSummary>) => {
          set(state => ({
            meetingSummaries: state.meetingSummaries.map(summary =>
              summary.id === summaryId ? { ...summary, ...updates } : summary
            )
          }))
        },

        removeMeetingSummary: (summaryId: string) => {
          set(state => ({
            meetingSummaries: state.meetingSummaries.filter(summary => summary.id !== summaryId)
          }))
        },

        clearMeetingSummaries: () => {
          set({ meetingSummaries: [] })
        },

        // Actions - Filters and Search
        setHistoryFilter: (filter: 'all' | 'video' | 'audio' | 'completed' | 'missed' | 'declined') => {
          set({ historyFilter: filter, currentPage: 1 })
        },

        setSearchQuery: (query: string) => {
          set({ searchQuery: query, currentPage: 1 })
        },

        setDateRange: (start: Date | null, end: Date | null) => {
          set({ dateRange: { start, end }, currentPage: 1 })
        },

        clearFilters: () => {
          set({ 
            historyFilter: 'all',
            searchQuery: '',
            dateRange: { start: null, end: null },
            currentPage: 1
          })
        },

        // Actions - Pagination
        setCurrentPage: (page: number) => {
          set({ currentPage: page })
        },

        setItemsPerPage: (items: number) => {
          set({ itemsPerPage: items, currentPage: 1 })
        },

        // Computed getters
        getFilteredCallHistory: () => {
          const state = get()
          let filtered = [...state.callHistory]
          
          // Filter by type/status
          if (state.historyFilter !== 'all') {
            if (state.historyFilter === 'video' || state.historyFilter === 'audio') {
              filtered = filtered.filter(call => call.type === state.historyFilter)
            } else {
              filtered = filtered.filter(call => call.status === state.historyFilter)
            }
          }
          
          // Search filter
          if (state.searchQuery.trim()) {
            const query = state.searchQuery.toLowerCase()
            filtered = filtered.filter(call =>
              call.participants.some(p => 
                p.name.toLowerCase().includes(query) ||
                p.email.toLowerCase().includes(query)
              )
            )
          }
          
          // Date range filter
          if (state.dateRange.start && state.dateRange.end) {
            const start = state.dateRange.start.getTime()
            const end = state.dateRange.end.getTime()
            filtered = filtered.filter(call => 
              call.timestamp >= start && call.timestamp <= end
            )
          }
          
          return filtered
        },

        getFilteredRecordings: () => {
          const state = get()
          let filtered = [...state.recordings]
          
          // Search filter
          if (state.searchQuery.trim()) {
            const query = state.searchQuery.toLowerCase()
            filtered = filtered.filter(recording =>
              recording.title.toLowerCase().includes(query) ||
              recording.participants.some(name => name.toLowerCase().includes(query))
            )
          }
          
          // Date range filter
          if (state.dateRange.start && state.dateRange.end) {
            const start = state.dateRange.start.getTime()
            const end = state.dateRange.end.getTime()
            filtered = filtered.filter(recording => 
              recording.timestamp >= start && recording.timestamp <= end
            )
          }
          
          return filtered
        },

        getUpcomingMeetings: () => {
          const now = new Date().getTime()
          return get().scheduledMeetings
            .filter(meeting => meeting.startTime.getTime() > now)
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        },

        getPastMeetings: () => {
          const now = new Date().getTime()
          return get().scheduledMeetings
            .filter(meeting => meeting.startTime.getTime() <= now)
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        },

        // Analytics
        updateStats: () => {
          const state = get()
          const completedCalls = state.callHistory.filter(call => call.status === 'completed')
          
          const totalCalls = state.callHistory.length
          const totalDuration = completedCalls.reduce((sum, call) => sum + call.duration, 0)
          const averageCallDuration = completedCalls.length > 0 ? totalDuration / completedCalls.length : 0
          const missedCallsCount = state.callHistory.filter(call => call.status === 'missed').length
          
          set({
            totalCalls,
            totalDuration,
            averageCallDuration,
            missedCallsCount
          })
        },

        getCallStats: (participantId?: string) => {
          const state = get()
          let calls = state.callHistory
          
          if (participantId) {
            calls = calls.filter(call => 
              call.participants.some(p => p.id === participantId)
            )
          }
          
          const completedCalls = calls.filter(call => call.status === 'completed')
          const totalDuration = completedCalls.reduce((sum, call) => sum + call.duration, 0)
          
          return {
            totalCalls: calls.length,
            totalDuration,
            averageDuration: completedCalls.length > 0 ? totalDuration / completedCalls.length : 0,
            callTypes: {
              video: calls.filter(call => call.type === 'video').length,
              audio: calls.filter(call => call.type === 'audio').length,
            },
            callStatuses: {
              completed: calls.filter(call => call.status === 'completed').length,
              missed: calls.filter(call => call.status === 'missed').length,
              declined: calls.filter(call => call.status === 'declined').length,
            }
          }
        },

        getCallTrends: (days: number) => {
          const state = get()
          const now = new Date()
          const trends = []
          
          for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now)
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)
            
            const dayStart = date.getTime()
            const dayEnd = dayStart + 24 * 60 * 60 * 1000
            
            const dayCalls = state.callHistory.filter(call =>
              call.timestamp >= dayStart && call.timestamp < dayEnd && call.status === 'completed'
            )
            
            trends.push({
              date: date.toISOString().split('T')[0],
              calls: dayCalls.length,
              duration: dayCalls.reduce((sum, call) => sum + call.duration, 0)
            })
          }
          
          return trends
        },

        // Bulk operations
        bulkDeleteCalls: (callIds: string[]) => {
          set(state => ({
            callHistory: state.callHistory.filter(call => !callIds.includes(call.id))
          }))
          
          get().updateStats()
        },

        bulkDeleteRecordings: (recordingIds: string[]) => {
          set(state => ({
            recordings: state.recordings.filter(recording => !recordingIds.includes(recording.id))
          }))
        },

        exportHistory: (format: 'json' | 'csv'): string => {
          const state = get()
          const data = {
            callHistory: state.callHistory,
            recordings: state.recordings,
            scheduledMeetings: state.scheduledMeetings,
            meetingSummaries: state.meetingSummaries,
            exportDate: new Date().toISOString(),
          }
          
          if (format === 'json') {
            return JSON.stringify(data, null, 2)
          } else {
            // Simple CSV export for call history
            const csvRows = [
              ['Date', 'Type', 'Duration (s)', 'Participants', 'Status'].join(','),
              ...state.callHistory.map(call => [
                new Date(call.timestamp).toISOString(),
                call.type,
                call.duration.toString(),
                call.participants.map(p => p.name).join(';'),
                call.status
              ].join(','))
            ]
            return csvRows.join('\n')
          }
        },

        importHistory: (data: string, format: 'json' | 'csv'): boolean => {
          try {
            if (format === 'json') {
              const parsed = JSON.parse(data)
              
              if (parsed.callHistory) {
                set(state => ({
                  callHistory: [...parsed.callHistory, ...state.callHistory]
                }))
              }
              
              if (parsed.recordings) {
                set(state => ({
                  recordings: [...parsed.recordings, ...state.recordings]
                }))
              }
              
              if (parsed.scheduledMeetings) {
                set(state => ({
                  scheduledMeetings: [...parsed.scheduledMeetings, ...state.scheduledMeetings]
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                }))
              }
              
              if (parsed.meetingSummaries) {
                set(state => ({
                  meetingSummaries: [...parsed.meetingSummaries, ...state.meetingSummaries]
                }))
              }
              
              get().updateStats()
              return true
            } else {
              // CSV import is more complex and would require parsing
              console.warn('CSV import not fully implemented')
              return false
            }
          } catch (error) {
            console.error('Import failed:', error)
            return false
          }
        },
      }),
      {
        name: 'video-history-store',
        partialize: (state) => ({
          callHistory: state.callHistory,
          recordings: state.recordings,
          scheduledMeetings: state.scheduledMeetings,
          meetingSummaries: state.meetingSummaries,
          itemsPerPage: state.itemsPerPage,
        }),
      }
    ),
    { name: 'VideoHistoryStore' }
  )
)