// Dashboard Data Hooks and Utilities

import { useMemo } from 'react'
import { format } from 'date-fns'
import type { SimpleDashboardFilters } from './SimpleDashboardFilters'
import type { DashboardMetrics, ActivityData } from './types'

export function useDashboardMetrics(filters: SimpleDashboardFilters): DashboardMetrics {
  // TODO: Fetch real metrics from backend API
  // Example: const { data } = useQuery(['dashboard-metrics', filters], () => fetchDashboardMetrics(filters))

  return useMemo(() => {
    // Return empty/zero metrics until real API is connected
    return {
      totalMessages: 0,
      totalProjects: 0,
      totalFiles: 0,
      totalMembers: 0,
      completedTasks: 0,
      totalTasks: 0,
      storageUsed: 0,
      storageLimit: 15,
      activeIntegrations: 0,
      totalEvents: 0,
      totalNotes: 0,
      totalSearches: 0
    }
  }, [filters])
}

export function useActivityTrendData(filters: SimpleDashboardFilters): ActivityData[] {
  // TODO: Fetch real activity trend data from backend API
  // Example: const { data } = useQuery(['activity-trend', filters], () => fetchActivityTrend(filters))

  return useMemo(() => {
    // Return empty array until real API is connected
    return []
  }, [filters])
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}
