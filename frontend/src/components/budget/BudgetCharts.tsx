import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { BudgetSummary, BudgetExpense } from '@/lib/api/budget-api';
import { useIntl } from 'react-intl';

interface BudgetChartsProps {
  summary: BudgetSummary;
  expenses: BudgetExpense[];
}

// Color palette
const COLORS = {
  spent: '#f97316', // orange
  remaining: '#22c55e', // green
  overbudget: '#ef4444', // red
  categories: ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#10b981', '#f43f5e'],
};

export function BudgetCharts({ summary, expenses }: BudgetChartsProps) {
  const { formatMessage } = useIntl();
  const { budget, totalSpent, remaining, percentageUsed, categoryBreakdown } = summary;

  // 1. Budget Donut Chart Data
  const budgetDonutData = useMemo(() => {
    if (remaining >= 0) {
      return [
        { name: formatMessage({ id: 'budget.charts.spent' }), value: totalSpent, color: COLORS.spent },
        { name: formatMessage({ id: 'budget.charts.remaining' }), value: remaining, color: COLORS.remaining },
      ];
    } else {
      // Over budget
      return [
        { name: formatMessage({ id: 'budget.charts.budget' }), value: budget.totalBudget, color: COLORS.spent },
        { name: formatMessage({ id: 'budget.charts.overBudget' }), value: Math.abs(remaining), color: COLORS.overbudget },
      ];
    }
  }, [totalSpent, remaining, budget.totalBudget, formatMessage]);

  // 2. Category Breakdown Pie Chart Data
  const categoryPieData = useMemo(() => {
    return categoryBreakdown
      .filter((item) => item.spent > 0)
      .map((item, index) => ({
        name: item.category.name,
        value: item.spent,
        color: COLORS.categories[index % COLORS.categories.length],
      }));
  }, [categoryBreakdown]);

  // 3. Spending Timeline Data (create smooth cumulative line)
  const timelineData = useMemo(() => {
    // Only use approved expenses for accurate timeline
    const approvedExpenses = expenses.filter((exp) => exp.approved);

    if (approvedExpenses.length === 0) return [];

    // Sort expenses by date
    const sortedExpenses = [...approvedExpenses].sort((a, b) =>
      new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    );

    // Get date range
    const firstDate = new Date(sortedExpenses[0].expenseDate);
    const lastDate = new Date(sortedExpenses[sortedExpenses.length - 1].expenseDate);

    // If budget has start date, use it as starting point
    if (budget.startDate) {
      const budgetStart = new Date(budget.startDate);
      if (budgetStart < firstDate) {
        firstDate.setTime(budgetStart.getTime());
      }
    }

    // Create data points for each day
    const dataPoints: Array<{ date: string; cumulative: number }> = [];
    let cumulative = 0;
    let expenseIndex = 0;

    const currentDate = new Date(firstDate);
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Add any expenses on this date
      while (
        expenseIndex < sortedExpenses.length &&
        new Date(sortedExpenses[expenseIndex].expenseDate).toISOString().split('T')[0] === dateStr
      ) {
        cumulative += sortedExpenses[expenseIndex].amount;
        expenseIndex++;
      }

      dataPoints.push({
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumulative,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Reduce data points if too many (keep every nth point for performance)
    if (dataPoints.length > 30) {
      const step = Math.ceil(dataPoints.length / 30);
      return dataPoints.filter((_, index) => index % step === 0 || index === dataPoints.length - 1);
    }

    return dataPoints;
  }, [expenses, budget.startDate]);

  // 4. Burn Rate with Forecast
  const burnRateData = useMemo(() => {
    if (!budget.startDate || !budget.endDate) return null;

    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);
    const today = new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const idealBurnRate = budget.totalBudget / totalDays;
    const actualBurnRate = totalSpent / daysElapsed;

    // Forecast
    const forecastedTotal = actualBurnRate * totalDays;
    const isOverpacing = forecastedTotal > budget.totalBudget;

    return {
      totalDays,
      daysElapsed,
      daysRemaining,
      idealBurnRate: idealBurnRate.toFixed(2),
      actualBurnRate: actualBurnRate.toFixed(2),
      forecastedTotal: forecastedTotal.toFixed(2),
      isOverpacing,
      percentageComplete: ((daysElapsed / totalDays) * 100).toFixed(1),
      budgetPercentageUsed: percentageUsed.toFixed(1),
    };
  }, [budget, totalSpent, percentageUsed]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: budget.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-primary">{formatCurrency(value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Budget Donut + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Budget Overview Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{formatMessage({ id: 'budget.charts.budgetOverview' })}</CardTitle>
            <CardDescription>{formatMessage({ id: 'budget.charts.budgetOverviewDesc' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {budgetDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-3xl font-bold">{percentageUsed.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.charts.used' })}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-6 mt-4">
                {budgetDonutData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <div className="text-sm">
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-muted-foreground">{formatCurrency(entry.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Category Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{formatMessage({ id: 'budget.charts.spendingByCategory' })}</CardTitle>
            <CardDescription>{formatMessage({ id: 'budget.charts.spendingByCategoryDesc' })}</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryPieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={(entry: any) => {
                        const value = typeof entry.value === 'number' ? entry.value : 0;
                        return `${entry.name}: ${((value / totalSpent) * 100).toFixed(0)}%`;
                      }}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                  {categoryPieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <div className="text-xs truncate">
                        <div className="font-medium">{entry.name}</div>
                        <div className="text-muted-foreground">{formatCurrency(entry.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                {formatMessage({ id: 'budget.charts.noExpensesYet' })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Spending Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>{formatMessage({ id: 'budget.charts.spendingTimeline' })}</CardTitle>
          <CardDescription>{formatMessage({ id: 'budget.charts.spendingTimelineDesc' })}</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.spent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.spent} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ strokeWidth: 0.5 }}
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ strokeWidth: 0.5 }}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), formatMessage({ id: 'budget.charts.totalSpent' })]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Area
                  type="monotoneX"
                  dataKey="cumulative"
                  stroke={COLORS.spent}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {formatMessage({ id: 'budget.charts.noTimelineData' })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Burn Rate Analysis */}
      {burnRateData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {formatMessage({ id: 'budget.charts.burnRateAnalysis' })}
              {burnRateData.isOverpacing && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {formatMessage({ id: 'budget.charts.overPacing' })}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{formatMessage({ id: 'budget.charts.burnRateAnalysisDesc' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Daily Burn Rate */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.charts.idealDailyRate' })}</div>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(Number(burnRateData.idealBurnRate))}
                </div>
                <div className="text-xs text-muted-foreground">{formatMessage({ id: 'budget.charts.perDay' })}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.charts.actualDailyRate' })}</div>
                <div className={`text-2xl font-bold ${burnRateData.isOverpacing ? 'text-red-500' : 'text-orange-500'}`}>
                  {formatCurrency(Number(burnRateData.actualBurnRate))}
                </div>
                <div className="text-xs flex items-center gap-1">
                  {burnRateData.isOverpacing ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-red-500" />
                      <span className="text-red-500">{formatMessage({ id: 'budget.charts.aboveTarget' })}</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">{formatMessage({ id: 'budget.charts.onTrack' })}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline Progress */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.charts.timelineProgress' })}</div>
                <div className="text-2xl font-bold">{burnRateData.percentageComplete}%</div>
                <div className="text-xs text-muted-foreground">
                  {formatMessage({ id: 'budget.charts.daysProgress' }, {
                    elapsed: burnRateData.daysElapsed,
                    total: burnRateData.totalDays,
                    remaining: burnRateData.daysRemaining
                  })}
                </div>
              </div>

              {/* Forecasted Total */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.charts.forecastedTotal' })}</div>
                <div className={`text-2xl font-bold ${burnRateData.isOverpacing ? 'text-red-500' : 'text-blue-500'}`}>
                  {formatCurrency(Number(burnRateData.forecastedTotal))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {burnRateData.isOverpacing ? (
                    <span className="text-red-500">
                      {formatMessage({ id: 'budget.charts.overBudgetAmount' }, {
                        amount: formatCurrency(Number(burnRateData.forecastedTotal) - budget.totalBudget)
                      })}
                    </span>
                  ) : (
                    <span className="text-green-500">{formatMessage({ id: 'budget.charts.withinBudget' })}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Visual comparison bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{formatMessage({ id: 'budget.charts.budgetVsTime' })}</span>
                <span
                  className={
                    Number(burnRateData.budgetPercentageUsed) > Number(burnRateData.percentageComplete)
                      ? 'text-red-500'
                      : 'text-green-500'
                  }
                >
                  {Number(burnRateData.budgetPercentageUsed) > Number(burnRateData.percentageComplete)
                    ? formatMessage({ id: 'budget.charts.spendingFaster' })
                    : formatMessage({ id: 'budget.charts.onPaceOrUnder' })}
                </span>
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{formatMessage({ id: 'budget.charts.budgetUsed' })}</span>
                    <span className="font-medium">{burnRateData.budgetPercentageUsed}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        Number(burnRateData.budgetPercentageUsed) > 100
                          ? 'bg-red-500'
                          : Number(burnRateData.budgetPercentageUsed) > 90
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(Number(burnRateData.budgetPercentageUsed), 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{formatMessage({ id: 'budget.charts.timeElapsed' })}</span>
                    <span className="font-medium">{burnRateData.percentageComplete}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${burnRateData.percentageComplete}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
