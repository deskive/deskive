import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  DollarSign,
  Activity,
  Target,
  Clock
} from 'lucide-react';
import { useVariableCostProjections, useBudgetSummary } from '@/lib/api/budget-api';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useIntl } from 'react-intl';

interface BudgetPredictiveAnalyticsProps {
  workspaceId: string;
  budgetId: string;
  projectionMonths?: number;
  currency?: string;
}

export function BudgetPredictiveAnalytics({
  workspaceId,
  budgetId,
  projectionMonths = 3,
  currency = 'USD'
}: BudgetPredictiveAnalyticsProps) {
  const { formatMessage } = useIntl();
  const { data: projections, isLoading: projectionsLoading } = useVariableCostProjections(
    workspaceId,
    budgetId,
    projectionMonths
  );

  const { data: summary, isLoading: summaryLoading } = useBudgetSummary(workspaceId, budgetId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate health metrics
  const healthMetrics = useMemo(() => {
    if (!projections || !summary) return null;

    const totalAllocated = summary.budget.totalBudget;
    const currentSpent = summary.totalSpent;
    const projectedTotal = projections.totalProjectedSpend;
    const variableAllocated = projections.totalAllocated;

    // Calculate burn rate (spending per month)
    const monthsElapsed = Math.max(1, projectionMonths / 2); // Estimate
    const burnRate = currentSpent / monthsElapsed;

    // Calculate runway (months until budget exhausted)
    const remainingBudget = totalAllocated - currentSpent;
    const runway = burnRate > 0 ? remainingBudget / burnRate : Infinity;

    // Projected completion date
    const today = new Date();
    const projectedCompletionDate = new Date(today);
    projectedCompletionDate.setMonth(today.getMonth() + Math.ceil(runway));

    // Budget health score (0-100)
    const spendRatio = currentSpent / totalAllocated;
    const projectionRatio = projectedTotal / variableAllocated;
    const healthScore = Math.max(0, 100 - (spendRatio * 50 + projectionRatio * 50));

    return {
      burnRate,
      runway,
      projectedCompletionDate,
      healthScore,
      overageRisk: projectedTotal > variableAllocated,
      overageAmount: Math.max(0, projectedTotal - variableAllocated),
    };
  }, [projections, summary, projectionMonths]);

  // Generate trend data for charts
  const trendData = useMemo(() => {
    if (!projections || !summary) return [];

    const data = [];
    const monthlyBurnRate = summary.totalSpent / Math.max(1, projectionMonths / 2);

    // Historical data (current)
    data.push({
      month: 'Current',
      actual: summary.totalSpent,
      projected: summary.totalSpent,
      allocated: summary.budget.totalBudget,
    });

    // Projected future months
    for (let i = 1; i <= projectionMonths; i++) {
      data.push({
        month: `+${i}M`,
        actual: null,
        projected: summary.totalSpent + (monthlyBurnRate * i),
        allocated: summary.budget.totalBudget,
      });
    }

    return data;
  }, [projections, summary, projectionMonths]);

  // Category risk analysis
  const categoryRisks = useMemo(() => {
    if (!projections) return [];

    return projections.projections
      .filter(p => p.projectedOverage > 0)
      .sort((a, b) => b.projectedOverage - a.projectedOverage)
      .slice(0, 5);
  }, [projections]);

  if (projectionsLoading || summaryLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">{formatMessage({ id: 'budget.forecasting.loading' })}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projections || !summary || !healthMetrics) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            {formatMessage({ id: 'budget.forecasting.noData' })}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return formatMessage({ id: 'budget.forecasting.healthExcellent' });
    if (score >= 60) return formatMessage({ id: 'budget.forecasting.healthGood' });
    if (score >= 40) return formatMessage({ id: 'budget.forecasting.healthFair' });
    return formatMessage({ id: 'budget.forecasting.healthAtRisk' });
  };

  return (
    <div className="space-y-6">
      {/* Health Alerts */}
      {healthMetrics.overageRisk && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{formatMessage({ id: 'budget.forecasting.overageRiskTitle' })}</AlertTitle>
          <AlertDescription>
            {formatMessage({ id: 'budget.forecasting.overageRiskDesc' }, {
              amount: formatCurrency(healthMetrics.overageAmount),
              months: projectionMonths,
              strong: (chunks: any) => <strong>{chunks}</strong>
            })}
          </AlertDescription>
        </Alert>
      )}

      {healthMetrics.runway < 3 && healthMetrics.runway !== Infinity && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>{formatMessage({ id: 'budget.forecasting.limitedRunwayTitle' })}</AlertTitle>
          <AlertDescription>
            {formatMessage({ id: 'budget.forecasting.limitedRunwayDesc' }, {
              burnRate: formatCurrency(healthMetrics.burnRate),
              months: Math.ceil(healthMetrics.runway),
              date: healthMetrics.projectedCompletionDate.toLocaleDateString(),
              strong: (chunks: any) => <strong>{chunks}</strong>
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {formatMessage({ id: 'budget.forecasting.healthScore' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getHealthColor(healthMetrics.healthScore)}`}>
              {Math.round(healthMetrics.healthScore)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getHealthLabel(healthMetrics.healthScore)}
            </p>
            <Progress
              value={healthMetrics.healthScore}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        {/* Burn Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {formatMessage({ id: 'budget.forecasting.burnRate' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(healthMetrics.burnRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatMessage({ id: 'budget.forecasting.perMonth' })}</p>
          </CardContent>
        </Card>

        {/* Budget Runway */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatMessage({ id: 'budget.forecasting.runway' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {healthMetrics.runway === Infinity
                ? '∞'
                : `${Math.ceil(healthMetrics.runway)}M`
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthMetrics.runway === Infinity
                ? formatMessage({ id: 'budget.forecasting.budgetSustainable' })
                : formatMessage({ id: 'budget.forecasting.monthsRemaining' })
              }
            </p>
          </CardContent>
        </Card>

        {/* Projected Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatMessage({ id: 'budget.forecasting.completionDate' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {healthMetrics.runway === Infinity
                ? formatMessage({ id: 'budget.forecasting.onTrack' })
                : healthMetrics.projectedCompletionDate.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthMetrics.runway === Infinity
                ? formatMessage({ id: 'budget.forecasting.withinBudget' })
                : formatMessage({ id: 'budget.forecasting.projectedExhaustion' })
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{formatMessage({ id: 'budget.forecasting.spendingTrend' })}</CardTitle>
          <CardDescription>
            {formatMessage({ id: 'budget.forecasting.spendingTrendDesc' }, { months: projectionMonths })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${currency} ${(value / 1000).toFixed(1)}k`;
                    }
                    return `${currency} ${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  name={formatMessage({ id: 'budget.forecasting.actualSpending' })}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorProjected)"
                  name={formatMessage({ id: 'budget.forecasting.projectedSpending' })}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="allocated"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name={formatMessage({ id: 'budget.forecasting.budgetLimit' })}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Risk Analysis */}
      {categoryRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {formatMessage({ id: 'budget.forecasting.categoryRisks' })}
            </CardTitle>
            <CardDescription>
              {formatMessage({ id: 'budget.forecasting.categoryRisksDesc' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryRisks.map((category) => {
                const overagePercent = (category.projectedOverage / category.allocatedAmount) * 100;

                return (
                  <div key={category.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {category.categoryType}
                        </Badge>
                        <span className="font-medium">{category.categoryName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500">
                          +{formatCurrency(category.projectedOverage)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">{formatMessage({ id: 'budget.forecasting.current' })}</div>
                        <div className="font-medium">{formatCurrency(category.currentSpent)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{formatMessage({ id: 'budget.forecasting.projected' })}</div>
                        <div className="font-medium text-orange-500">
                          {formatCurrency(category.projectedTotal)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">{formatMessage({ id: 'budget.forecasting.allocated' })}</div>
                        <div className="font-medium">{formatCurrency(category.allocatedAmount)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min((category.projectedTotal / category.allocatedAmount) * 100, 100)}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatMessage({ id: 'budget.forecasting.percentOver' }, { percent: overagePercent.toFixed(0) })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{formatMessage({ id: 'budget.forecasting.monthlyBreakdown' })}</CardTitle>
          <CardDescription>
            {formatMessage({ id: 'budget.forecasting.monthlyBreakdownDesc' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projections.projections}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="categoryName"
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${currency} ${(value / 1000).toFixed(1)}k`;
                    }
                    return `${currency} ${value}`;
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))'
                  }}
                />
                <Legend />
                <Bar
                  dataKey="currentSpent"
                  fill="#3b82f6"
                  name={formatMessage({ id: 'budget.forecasting.currentSpent' })}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="projectedTotal"
                  fill="#f59e0b"
                  name={formatMessage({ id: 'budget.forecasting.projectedTotal' })}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="allocatedAmount"
                  fill="#10b981"
                  name={formatMessage({ id: 'budget.forecasting.allocated' })}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {formatMessage({ id: 'budget.forecasting.projectionSummary' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.forecasting.totalVariableCosts' })}</div>
              <div className="text-xl font-bold">{formatCurrency(projections.totalAllocated)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.forecasting.projectedSpending' })}</div>
              <div className="text-xl font-bold text-orange-500">
                {formatCurrency(projections.totalProjectedSpend)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.forecasting.projectionPeriod' })}</div>
              <div className="text-xl font-bold">{formatMessage({ id: 'budget.forecasting.monthsCount' }, { count: projectionMonths })}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{formatMessage({ id: 'budget.forecasting.status' })}</div>
              <div className="flex items-center gap-2 mt-1">
                {healthMetrics.overageRisk ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    <span className="text-lg font-bold text-red-500">{formatMessage({ id: 'budget.forecasting.overBudget' })}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5 text-green-500" />
                    <span className="text-lg font-bold text-green-500">{formatMessage({ id: 'budget.forecasting.onTrack' })}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
