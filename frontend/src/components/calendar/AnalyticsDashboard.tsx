import { useMemo, useState, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subDays, startOfDay, endOfDay, eachDayOfInterval, differenceInMinutes } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import {
  Calendar,
  Clock,
  TrendingUp,
  Target,
  Coffee,
  Download,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '../../types/calendar'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useDashboardStats } from '../../lib/api/calendar-api'

// Mock data for categories
const mockCategories = [
  { id: 'work', name: 'Work', color: '#3b82f6' },
  { id: 'personal', name: 'Personal', color: '#22c55e' },
  { id: 'meeting', name: 'Meeting', color: '#8b5cf6' },
  { id: 'focus', name: 'Focus Time', color: '#f59e0b' },
  { id: 'break', name: 'Break', color: '#ef4444' },
]

// Mock events data
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + 30 * 60000),
    categoryId: 'meeting',
    priority: 'normal',
    status: 'confirmed',
    isAllDay: false,
    isPrivate: false,
    attendees: [],
    reminders: [],
    tags: [],
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Project Work',
    startTime: new Date(new Date().getTime() + 2 * 3600000),
    endTime: new Date(new Date().getTime() + 4 * 3600000),
    categoryId: 'work',
    priority: 'high',
    status: 'confirmed',
    isAllDay: false,
    isPrivate: false,
    attendees: [],
    reminders: [],
    tags: [],
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Lunch Break',
    startTime: new Date(new Date().getTime() + 4 * 3600000),
    endTime: new Date(new Date().getTime() + 5 * 3600000),
    categoryId: 'break',
    priority: 'low',
    status: 'confirmed',
    isAllDay: false,
    isPrivate: false,
    attendees: [],
    reminders: [],
    tags: [],
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

interface AnalyticsDashboardProps {
  onBackToCalendar: () => void
}

interface CategoryData {
  name: string
  value: number
  color: string
  count: number
}

interface WeeklyData {
  day: string
  events: number
  hours: number
}

interface AnalyticsData {
  totalEvents: number
  totalMeetingTime: number
  averageMeetingDuration: number
  productivityScore: number
  focusTime: number
  categoryData: CategoryData[]
  weeklyData: WeeklyData[]
  eventsByPriority: { priority: string; count: number }[]
  averageAttendees: number
}

export function AnalyticsDashboard({ onBackToCalendar }: AnalyticsDashboardProps) {
  const intl = useIntl()
  const { currentWorkspace } = useWorkspace()
  const [timeframe, setTimeframe] = useState({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
    label: 'This Week'
  })
  const [period, setPeriod] = useState('week')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch dashboard stats from API
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = useDashboardStats(currentWorkspace?.id || '', period)

  // Time period helpers
  const getTimeframeData = useCallback((period: string) => {
    const now = new Date()

    switch (period) {
      case 'Today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
          label: 'Today'
        }
      case 'This Week':
        return {
          start: startOfWeek(now, { weekStartsOn: 0 }),
          end: endOfWeek(now, { weekStartsOn: 0 }),
          label: 'This Week'
        }
      case 'This Month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: 'This Month'
        }
      case 'Last 3 Months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
          label: 'Last 3 Months'
        }
      case 'This Year':
        return {
          start: startOfYear(now),
          end: endOfYear(now),
          label: 'This Year'
        }
      default:
        return timeframe
    }
  }, [timeframe])

  const handleTimeframeChange = useCallback((value: string) => {
    const newTimeframe = getTimeframeData(value)
    setTimeframe(newTimeframe)
    
    // Map the timeframe label to the API period parameter
    const periodMapping: Record<string, string> = {
      'Today': 'today',
      'This Week': 'week',
      'This Month': 'month',
      'Last 3 Months': 'last3months',
      'This Year': 'year'
    }
    
    const newPeriod = periodMapping[value] || 'week'
    setPeriod(newPeriod)

    toast.success(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.analyticsUpdated' }, { period: value }))
  }, [getTimeframeData, intl])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)

    try {
      await refetchDashboard()
      toast.success(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.refreshSuccess' }))
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.refreshError' }))
      console.error('Refresh error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [refetchDashboard, intl])

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateAnalyticsCSV = useCallback((data: AnalyticsData) => {
    const rows = [
      [
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.metric' }),
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.value' }),
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.details' })
      ],
      [
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.totalEvents' }),
        data.totalEvents.toString(),
        timeframe.label
      ],
      [
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.totalEventTimeHours' }),
        Math.round(data.totalMeetingTime / 60).toString(),
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.excludingAllDay' })
      ],
      [
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.averageMeetingDuration' }),
        Math.round(data.averageMeetingDuration).toString(),
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.perMeeting' })
      ],
      [
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.timeUtilization' }),
        data.productivityScore.toString() + '%',
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.calculatedScore' })
      ],
      [
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.unscheduledTime' }),
        Math.round(data.focusTime / 60).toString(),
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.availableDeepWork' })
      ],
      ['', '', ''],
      [intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.categoryBreakdown' }), '', ''],
      ...(data.categoryData || []).map((cat) => [
        cat.name,
        `${Math.round(cat.value / 60)}h ${cat.value % 60}m`,
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.eventsCount' }, { count: cat.count })
      ]),
      ['', '', ''],
      [intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.weeklyDistribution' }), '', ''],
      ...(data.weeklyData || []).map((day) => [
        day.day,
        day.events.toString(),
        intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.export.csv.hours' }, { hours: day.hours })
      ])
    ]

    return rows.map(row => row.map((field: string | number) => `"${field}"`).join(',')).join('\n')
  }, [intl, timeframe])

  const generateAnalyticsPDF = useCallback((data: AnalyticsData, currentTimeframe: typeof timeframe) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.printWindowError' }))
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendar Analytics - ${currentTimeframe.label}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { color: #666; margin-top: 30px; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .metric { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .category-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            @media print {
              body { margin: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Calendar Analytics Report</h1>
          <p><strong>Period:</strong> ${currentTimeframe.label}</p>
          <p><strong>Generated:</strong> ${format(new Date(), 'PPP')}</p>
          
          <h2>Key Metrics</h2>
          <div class="metrics">
            <div class="metric">
              <div>Total Events</div>
              <div class="metric-value">${data.totalEvents}</div>
            </div>
            <div class="metric">
              <div>Meeting Time</div>
              <div class="metric-value">${Math.round(data.totalMeetingTime / 60)}h</div>
            </div>
            <div class="metric">
              <div>Time Utilization</div>
              <div class="metric-value">${data.productivityScore}%</div>
            </div>
            <div class="metric">
              <div>Unscheduled Time</div>
              <div class="metric-value">${Math.round(data.focusTime / 60)}h</div>
            </div>
          </div>

          <h2>Category Breakdown</h2>
          ${(data.categoryData || []).map((cat) => `
            <div class="category-item">
              <span>${cat.name}</span>
              <span>${Math.round(cat.value / 60)}h ${cat.value % 60}m (${cat.count} events)</span>
            </div>
          `).join('')}

          <h2>Weekly Activity</h2>
          <table>
            <thead>
              <tr><th>Day</th><th>Events</th><th>Hours</th></tr>
            </thead>
            <tbody>
              ${(data.weeklyData || []).map((day) => `
                <tr>
                  <td>${day.day}</td>
                  <td>${day.events}</td>
                  <td>${day.hours}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Generated by Deskive Calendar Analytics
          </p>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    printWindow.onload = () => {
      printWindow.print()
      printWindow.onafterprint = () => {
        printWindow.close()
        toast.success(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.pdfGenerated' }))
      }
    }
  }, [intl])

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    // Use API data if available, otherwise fall back to mock data
    if (dashboardData) {
      console.log('Dashboard Data:', dashboardData)
      return {
        totalEvents: dashboardData.overview?.totalEvents || 0,
        totalMeetings: dashboardData.overview?.totalEvents || 0,
        totalMeetingTime: (dashboardData.overview?.totalEventTime || 0) * 60, // Convert hours to minutes
        averageMeetingDuration: (dashboardData.overview?.totalEvents || 0) > 0 
          ? ((dashboardData.overview?.totalEventTime || 0) * 60) / dashboardData.overview.totalEvents 
          : 0,
        categoryData: (dashboardData.categoryStats || []).map(cat => ({
          name: cat.name,
          value: cat.totalTime * 60, // Convert hours to minutes
          color: cat.color,
          count: cat.eventCount
        })),
        weeklyData: dashboardData.weeklyActivity || [],
        priorityData: (dashboardData.priorityStats || []).map(p => ({
          name: p.priority,
          value: p.eventCount,
          count: p.eventCount,
          hours: p.totalTime,
          percentage: p.percentage,
          color: p.color
        })),
        focusTime: (dashboardData.overview?.unscheduledTime || 0) * 60, // Convert hours to minutes
        productivityScore: dashboardData.overview?.timeUtilization || 0,
        productivityChange: 0, // Extract from utilizationComparison if needed
        totalEventHours: dashboardData.overview?.totalEventTime || 0,
        periodWorkDays: 5,
        eventsByPriority: (dashboardData.priorityStats || []).map(p => ({ 
          priority: p.priority, 
          count: p.eventCount 
        })),
        averageAttendees: 0, // Not provided in API response
        hourlyData: (dashboardData.hourlyDistribution || []).map(h => ({
          hour: h.hour.toString().padStart(2, '0') + ':00',
          events: h.eventCount,
          busyTime: h.percentage
        })),
        insights: dashboardData.insights || {}
      }
    }

    // Fallback to mock data calculation
    const filteredEvents = mockEvents.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate >= timeframe.start && eventDate <= timeframe.end
    })

    // Calculate metrics
    const totalMeetingTime = filteredEvents.reduce((sum, event) => {
      return sum + differenceInMinutes(new Date(event.endTime), new Date(event.startTime))
    }, 0)

    const averageMeetingDuration = filteredEvents.length > 0 ? totalMeetingTime / filteredEvents.length : 0

    // Category breakdown
    const categoryData = mockCategories.map(category => {
      const categoryEvents = filteredEvents.filter(e => e.categoryId === category.id)
      const totalTime = categoryEvents.reduce((sum, event) => {
        return sum + differenceInMinutes(new Date(event.endTime), new Date(event.startTime))
      }, 0)

      return {
        name: category.name,
        value: totalTime,
        color: category.color,
        count: categoryEvents.length
      }
    }).filter(c => c.value > 0)

    // Weekly patterns
    const weekStart = startOfWeek(new Date())
    const weekEnd = endOfWeek(new Date())
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const weeklyData = weekDays.map(day => {
      const dayEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.startTime)
        return eventDate.toDateString() === day.toDateString()
      })

      const totalMinutes = dayEvents.reduce((sum, event) => {
        return sum + differenceInMinutes(new Date(event.endTime), new Date(event.startTime))
      }, 0)

      return {
        day: format(day, 'EEE'),
        events: dayEvents.length,
        minutes: totalMinutes,
        hours: Math.round(totalMinutes / 60 * 10) / 10
      }
    })

    // Hourly patterns
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const hourEvents = filteredEvents.filter(event => {
        const eventHour = new Date(event.startTime).getHours()
        return eventHour === hour
      })

      return {
        hour: hour.toString().padStart(2, '0') + ':00',
        events: hourEvents.length,
        busyTime: hourEvents.reduce((sum, event) => {
          const start = new Date(event.startTime)
          const end = new Date(event.endTime)
          return sum + Math.min(differenceInMinutes(end, start), 60)
        }, 0)
      }
    })

    // Priority distribution
    const priorityData = ['low', 'normal', 'high', 'urgent'].map(priority => {
      const priorityEvents = filteredEvents.filter(e => e.priority === priority)
      const totalMinutes = priorityEvents.reduce((sum, event) => {
        return sum + differenceInMinutes(new Date(event.endTime), new Date(event.startTime))
      }, 0)

      return {
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: priorityEvents.length,
        count: priorityEvents.length,
        hours: Math.round(totalMinutes / 60 * 10) / 10,
        percentage: filteredEvents.length > 0 ? Math.round((priorityEvents.length / filteredEvents.length) * 100) : 0,
        color: priority === 'urgent' ? '#ef4444' :
          priority === 'high' ? '#f59e0b' :
            priority === 'normal' ? '#3b82f6' : '#6b7280'
      }
    })

    const WORK_HOURS_PER_DAY = 8
    const WORK_MINUTES_PER_DAY = WORK_HOURS_PER_DAY * 60

    const getWorkDaysInPeriod = (start: Date, end: Date) => {
      let workDays = 0
      const current = new Date(start)

      while (current <= end) {
        const dayOfWeek = current.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workDays++
        }
        current.setDate(current.getDate() + 1)
      }

      return Math.max(1, workDays)
    }

    const periodWorkDays = getWorkDaysInPeriod(timeframe.start, timeframe.end)
    const totalWorkMinutesInPeriod = periodWorkDays * WORK_MINUTES_PER_DAY
    const productivityScore = Math.round((totalMeetingTime / totalWorkMinutesInPeriod) * 100)

    // Calculate change vs yesterday
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    const yesterdayStart = startOfDay(subDays(today, 1))
    const yesterdayEnd = endOfDay(subDays(today, 1))

    const todayEvents = mockEvents.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate >= todayStart && eventDate <= todayEnd
    })

    const yesterdayEvents = mockEvents.filter(event => {
      const eventDate = new Date(event.startTime)
      return eventDate >= yesterdayStart && eventDate <= yesterdayEnd
    })

    const todayTotalTime = todayEvents.reduce((sum, event) => {
      return sum + differenceInMinutes(new Date(event.endTime), new Date(event.startTime))
    }, 0)

    const yesterdayTotalTime = yesterdayEvents.reduce((sum, event) => {
      return sum + differenceInMinutes(new Date(event.endTime), new Date(event.startTime))
    }, 0)

    const todayScore = Math.round((todayTotalTime / WORK_MINUTES_PER_DAY) * 100)
    const yesterdayScore = Math.round((yesterdayTotalTime / WORK_MINUTES_PER_DAY) * 100)
    const productivityChange = yesterdayScore > 0
      ? Math.round(((todayScore - yesterdayScore) / yesterdayScore) * 100)
      : (todayScore > 0 ? 100 : 0)

    return {
      totalEvents: filteredEvents.length,
      totalMeetings: filteredEvents.length,
      totalMeetingTime,
      averageMeetingDuration,
      categoryData,
      weeklyData,
      hourlyData,
      priorityData,
      focusTime: Math.max(0, totalWorkMinutesInPeriod - totalMeetingTime),
      productivityScore: isNaN(productivityScore) ? 0 : productivityScore,
      productivityChange,
      totalEventHours: Math.round(totalMeetingTime / 60 * 10) / 10,
      periodWorkDays,
      eventsByPriority: priorityData.map(p => ({ priority: p.name, count: p.count })),
      averageAttendees: filteredEvents.length > 0
        ? Math.round(filteredEvents.reduce((sum, e) => sum + (e.attendees?.length ?? 0), 0) / filteredEvents.length)
        : 0,
    }
  }, [timeframe, dashboardData])

  const handleExport = useCallback((exportFormat: 'csv' | 'json' | 'pdf') => {
    try {
      const filename = `analytics-${timeframe.label.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`

      if (exportFormat === 'json') {
        const exportData = {
          exportDate: new Date().toISOString(),
          timeframe: timeframe,
          analytics: analyticsData,
        }

        const content = JSON.stringify(exportData, null, 2)
        downloadFile(content, `${filename}.json`, 'application/json')
      } else if (exportFormat === 'csv') {
        const csvContent = generateAnalyticsCSV(analyticsData)
        downloadFile(csvContent, `${filename}.csv`, 'text/csv')
      } else if (exportFormat === 'pdf') {
        generateAnalyticsPDF(analyticsData, timeframe)
        return
      }

      toast.success(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.exportSuccess' }, { format: exportFormat.toUpperCase() }))
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.toasts.exportError' }))
      console.error('Export error:', error)
    }
  }, [timeframe, analyticsData, intl, generateAnalyticsCSV, generateAnalyticsPDF])

  // Show loading state
  if (isDashboardLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="text-lg">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.loading' })}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (dashboardError) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="p-8">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-red-500">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.error.title' })}</h3>
              <p className="text-muted-foreground mb-4">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.error.message' })}</p>
              <Button onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.error.retry' })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              onClick={onBackToCalendar}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.actions.backToCalendar' })}
            </Button>

            <Select value={timeframe.label} onValueChange={handleTimeframeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Today">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.periods.today' })}</SelectItem>
                <SelectItem value="This Week">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.periods.thisWeek' })}</SelectItem>
                <SelectItem value="This Month">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.periods.thisMonth' })}</SelectItem>
                <SelectItem value="Last 3 Months">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.periods.last3Months' })}</SelectItem>
                <SelectItem value="This Year">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.periods.thisYear' })}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.actions.refresh' })}
            </Button>

            <Select onValueChange={(value) => handleExport(value as 'csv' | 'json' | 'pdf')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.actions.export' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Download className="h-3 w-3" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Download className="h-3 w-3" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <Download className="h-3 w-3" />
                    PDF
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.totalEvents' })}</p>
                  <p className="text-3xl font-bold">{analyticsData.totalEvents}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {timeframe.label}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.totalEventTime' })}</p>
                  <p className="text-3xl font-bold">
                    {analyticsData.totalEventHours}h
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.acrossWorkDays' }, { days: analyticsData.periodWorkDays })}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.timeUtilization' })}</p>
                  <p className="text-3xl font-bold">{analyticsData.productivityScore}%</p>
                  <div className="mt-2 space-y-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "inline-block text-xs",
                        analyticsData.productivityChange > 0 && "border-green-500 text-green-700",
                        analyticsData.productivityChange < 0 && "border-red-500 text-red-700",
                        analyticsData.productivityChange === 0 && "border-gray-500 text-gray-700"
                      )}
                    >
                      {analyticsData.productivityChange > 0 && '+'}
                      {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.vsYesterday' }, { change: analyticsData.productivityChange })}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.unscheduledTime' })}</p>
                  <p className="text-3xl font-bold">
                    {Math.round(analyticsData.focusTime / 60)}h
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.metrics.availableDeepWork' })}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="patterns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="patterns">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.tabs.timePatterns' })}</TabsTrigger>
            <TabsTrigger value="categories">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.tabs.categories' })}</TabsTrigger>
            <TabsTrigger value="insights">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.tabs.insights' })}</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Pattern */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.weeklyActivity' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.weeklyData || []}>
                      <defs>
                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        </linearGradient>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'events' ? intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.eventsCount' }, { count: value }) : intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.hoursCount' }, { count: value }),
                          name === 'events' ? intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.events' }) : intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.hours' })
                        ]}
                      />
                      <Bar dataKey="events" fill="url(#colorEvents)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="hours" fill="url(#colorHours)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hourly Pattern */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.hourlyDistribution' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.hourlyData || []}>
                      <defs>
                        <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="events"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Category Distribution */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.timeByCategory' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.categoryData || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={(entry) => {
                          const percent = typeof entry.percent === 'number' ? entry.percent : 0
                          return `${entry.name} ${(percent * 100).toFixed(0)}%`
                        }}
                      >
                        {(analyticsData.categoryData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${Math.round(Number(value) / 60)}h ${Number(value) % 60}m`, intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.time' })]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.priorityDistribution' })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Custom Horizontal Bar Chart */}
                    <div className="space-y-3">
                      {(analyticsData.priorityData || []).map((priority, index) => {
                        const maxCount = Math.max(5, ...(analyticsData.priorityData || []).map(p => p.count))
                        const percentage = maxCount > 0 ? (priority.count / maxCount) * 100 : 0

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium w-20">{priority.name}</span>
                              <span className="text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.eventsCount' }, { count: priority.count })}</span>
                            </div>
                            <div className="relative h-8 bg-muted/20 rounded-md overflow-hidden">
                              <div
                                className="absolute left-0 top-0 h-full transition-all duration-500 ease-out rounded-md"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: priority.color,
                                  minWidth: priority.count > 0 ? '2rem' : '0'
                                }}
                              />
                              {priority.count > 0 && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
                                  {priority.count}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                      {(analyticsData.priorityData || []).map((priority, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/10 rounded-md">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: priority.color }}
                            />
                            <span className="text-xs font-medium">{priority.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold">{priority.hours}h</span>
                            <span className="text-xs text-muted-foreground ml-1">({priority.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.categoryBreakdown' })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analyticsData.categoryData || []).map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {Math.round(category.value / 60)}h {category.value % 60}m
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.charts.eventsCount' }, { count: category.count })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Insights */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.title' })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.productivityAnalysis' })}</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {intl.formatMessage(
                        { id: 'modules.calendar.analyticsDashboard.insights.productivityMessage' },
                        {
                          score: analyticsData.productivityScore,
                          suggestion: analyticsData.productivityScore > 75
                            ? intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.scheduleFocusTime' })
                            : intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.goodBalance' })
                        }
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.meetingPatterns' })}</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      {intl.formatMessage(
                        { id: 'modules.calendar.analyticsDashboard.insights.meetingDurationMessage' },
                        {
                          duration: Math.round(analyticsData.averageMeetingDuration),
                          suggestion: analyticsData.averageMeetingDuration > 45
                            ? intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.shorterMeetings' })
                            : intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.wellTimed' })
                        }
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.insights.timeManagement' })}</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {intl.formatMessage(
                        { id: 'modules.calendar.analyticsDashboard.insights.unscheduledTimeMessage' },
                        { hours: Math.round(analyticsData.focusTime / 60) }
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.title' })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-muted/10 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.optimizeMeetings.title' })}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.optimizeMeetings.description' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted/10 rounded-lg">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.protectFocus.title' })}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.protectFocus.description' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-muted/10 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.reviewRecurring.title' })}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {intl.formatMessage({ id: 'modules.calendar.analyticsDashboard.recommendations.reviewRecurring.description' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}