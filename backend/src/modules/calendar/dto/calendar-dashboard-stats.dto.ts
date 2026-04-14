import { ApiProperty } from '@nestjs/swagger';

export class CalendarOverviewStatsDto {
  @ApiProperty({
    description: 'Total number of events in the selected period',
    example: 3,
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Total time spent in events (in hours)',
    example: 3.5,
  })
  totalEventTime: number;

  @ApiProperty({
    description: 'Time utilization percentage',
    example: 9,
  })
  timeUtilization: number;

  @ApiProperty({
    description: 'Unscheduled time available (in hours)',
    example: 37,
  })
  unscheduledTime: number;

  @ApiProperty({
    description: 'Period description',
    example: 'This Week',
  })
  period: string;

  @ApiProperty({
    description: 'Time range description',
    example: 'Across 5 work days',
  })
  timeRange: string;

  @ApiProperty({
    description: 'Utilization comparison with previous period',
    example: '+100% vs yesterday',
  })
  utilizationComparison: string;

  @ApiProperty({
    description: 'Available time description',
    example: 'Available for deep work',
  })
  availabilityNote: string;
}

export class WeeklyActivityDataDto {
  @ApiProperty({
    description: 'Day of the week',
    example: 'Mon',
  })
  day: string;

  @ApiProperty({
    description: 'Number of events on this day',
    example: 2,
  })
  events: number;

  @ApiProperty({
    description: 'Total hours of events on this day',
    example: 1.5,
  })
  hours: number;
}

export class HourlyDistributionDataDto {
  @ApiProperty({
    description: 'Hour of the day (0-23)',
    example: 14,
  })
  hour: number;

  @ApiProperty({
    description: 'Number of events at this hour',
    example: 2,
  })
  eventCount: number;

  @ApiProperty({
    description: 'Percentage of total events at this hour',
    example: 15.5,
  })
  percentage: number;
}

export class CategoryStatsDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Work',
  })
  name: string;

  @ApiProperty({
    description: 'Total time spent in this category (in hours)',
    example: 2.0,
  })
  totalTime: number;

  @ApiProperty({
    description: 'Number of events in this category',
    example: 1,
  })
  eventCount: number;

  @ApiProperty({
    description: 'Percentage of total time',
    example: 57,
  })
  percentage: number;

  @ApiProperty({
    description: 'Category color for charts',
    example: '#3B82F6',
  })
  color: string;
}

export class PriorityStatsDto {
  @ApiProperty({
    description: 'Priority level',
    example: 'High',
  })
  priority: string;

  @ApiProperty({
    description: 'Number of events with this priority',
    example: 1,
  })
  eventCount: number;

  @ApiProperty({
    description: 'Total time for this priority (in hours)',
    example: 2.0,
  })
  totalTime: number;

  @ApiProperty({
    description: 'Percentage of total events',
    example: 33,
  })
  percentage: number;

  @ApiProperty({
    description: 'Color for visualization',
    example: '#F59E0B',
  })
  color: string;
}

export class CategoryBreakdownDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Work',
  })
  category: string;

  @ApiProperty({
    description: 'Time spent in this category (formatted)',
    example: '2h 0m',
  })
  timeSpent: string;

  @ApiProperty({
    description: 'Number of events',
    example: 1,
  })
  eventCount: number;

  @ApiProperty({
    description: 'Color for visualization',
    example: '#3B82F6',
  })
  color: string;
}

export class AIInsightDto {
  @ApiProperty({
    description: 'Type of insight',
    enum: ['pattern', 'suggestion', 'recommendation', 'observation', 'tip'],
    example: 'suggestion',
  })
  type: string;

  @ApiProperty({
    description: 'Actionable insight message',
    example: 'Reserve mornings for focused tasks',
  })
  message: string;
}

export class CalendarInsightsDto {
  @ApiProperty({
    description: 'Peak productivity hour',
    example: '14:00 - Most events scheduled',
  })
  peakHour: string;

  @ApiProperty({
    description: 'Busiest day of the week',
    example: 'Tuesday - 40% of weekly events',
  })
  busiestDay: string;

  @ApiProperty({
    description: 'Most common event duration',
    example: '60 minutes - 45% of events',
  })
  commonDuration: string;

  @ApiProperty({
    description: 'Meeting pattern insight',
    example: 'Most meetings are scheduled in the afternoon',
  })
  meetingPattern: string;

  @ApiProperty({
    description: 'AI-powered productivity suggestion',
    example: 'Consider blocking more time for deep work in the morning',
  })
  productivityTip: string;

  @ApiProperty({
    description: 'AI-generated actionable insights',
    type: [AIInsightDto],
    example: [
      { type: 'pattern', message: 'Heavy afternoon schedule detected' },
      { type: 'suggestion', message: 'Reserve mornings for focused tasks' },
    ],
  })
  aiInsights: AIInsightDto[];

  @ApiProperty({
    description: 'Whether AI insights are enabled and working',
    example: true,
  })
  aiPowered: boolean;
}

export class CalendarDashboardStatsDto {
  @ApiProperty({
    description: 'Overview statistics',
    type: CalendarOverviewStatsDto,
  })
  overview: CalendarOverviewStatsDto;

  @ApiProperty({
    description: 'Weekly activity breakdown by day',
    type: [WeeklyActivityDataDto],
  })
  weeklyActivity: WeeklyActivityDataDto[];

  @ApiProperty({
    description: 'Hourly distribution of events',
    type: [HourlyDistributionDataDto],
  })
  hourlyDistribution: HourlyDistributionDataDto[];

  @ApiProperty({
    description: 'Time distribution by category',
    type: [CategoryStatsDto],
  })
  categoryStats: CategoryStatsDto[];

  @ApiProperty({
    description: 'Event distribution by priority',
    type: [PriorityStatsDto],
  })
  priorityStats: PriorityStatsDto[];

  @ApiProperty({
    description: 'Category breakdown with detailed time',
    type: [CategoryBreakdownDto],
  })
  categoryBreakdown: CategoryBreakdownDto[];

  @ApiProperty({
    description: 'AI-generated insights about calendar patterns',
    type: CalendarInsightsDto,
  })
  insights: CalendarInsightsDto;

  @ApiProperty({
    description: 'Date range for the statistics',
    example: {
      startDate: '2024-01-15T00:00:00.000Z',
      endDate: '2024-01-21T23:59:59.999Z',
    },
  })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({
    description: 'When the statistics were generated',
    example: '2024-01-21T10:30:00.000Z',
  })
  generatedAt: string;
}
