import { QuickActionsGrid } from './QuickActionsGrid'
import { AgenticSuggestions } from './AgenticSuggestions'
import { MetricsCards } from './MetricsCards'
import type { DashboardMetrics, ActivityData, IntegrationUsage, QuickAction, TopProject, UpcomingEvent } from './types'

interface OverviewTabProps {
  metrics: DashboardMetrics
  activityData: ActivityData[]
  integrations: IntegrationUsage[]
  quickActions: QuickAction[]
  topProjects: TopProject[]
  upcomingEvents: UpcomingEvent[]
  onProjectClick: (id: string) => void
  onEventClick: (id: string) => void
}

export function OverviewTab({
  metrics,
  activityData,
  integrations,
  quickActions,
  topProjects,
  upcomingEvents,
  onProjectClick,
  onEventClick
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Cards - Stats in one row */}
      <MetricsCards metrics={metrics} />

      {/* Agentic Suggestions - Smart AI-powered suggestions */}
      <AgenticSuggestions />

      {/* Activity Trend Chart - Commented out (requires historical data aggregation) */}
      {/* <ActivityTrendChart data={activityData} /> */}

      {/* Integration Usage - Commented out */}
      {/* <IntegrationUsageCards integrations={integrations} /> */}

      {/* Quick Actions */}
      <QuickActionsGrid actions={quickActions} />

      {/* Two Column Layout - Commented out */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectsList projects={topProjects} onProjectClick={onProjectClick} />
        <UpcomingEventsList events={upcomingEvents} onEventClick={onEventClick} />
      </div> */}
    </div>
  )
}
