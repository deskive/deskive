import { useIntl } from 'react-intl'
import { StorageUsageCard } from './StorageUsageCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import type { DashboardMetrics, ActivityData, IntegrationUsage } from './types'
import { CHART_COLORS } from './types'

interface AnalyticsTabProps {
  metrics: DashboardMetrics
  activityData: ActivityData[]
  integrations: IntegrationUsage[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function AnalyticsTab({ metrics, activityData, integrations }: AnalyticsTabProps) {
  const intl = useIntl()

  return (
    <div className="space-y-6">
      {/* Storage Usage */}
      <StorageUsageCard metrics={metrics} />

      {/* Combined Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {intl.formatMessage({ id: 'dashboard.analytics.combinedMetrics' })}
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: 'dashboard.analytics.combinedMetricsDesc' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="messages" fill={CHART_COLORS.primary} />
              <Bar dataKey="files" fill={CHART_COLORS.secondary} />
              <Line type="monotone" dataKey="tasks" stroke={CHART_COLORS.success} strokeWidth={2} />
              <Line type="monotone" dataKey="meetings" stroke={CHART_COLORS.danger} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Integration Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{intl.formatMessage({ id: 'dashboard.analytics.integrationUsage' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm">
                {integration.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{integration.name}</div>
                <div className="w-full bg-muted rounded-full h-1 mt-1">
                  <div
                    className="bg-primary h-1 rounded-full"
                    style={{ width: `${integration.usage}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{integration.usage}%</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
