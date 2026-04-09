import { useMemo, useState } from 'react';
import { Clock, Play, User, Calendar, DollarSign, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllTimeEntriesForBudget, useRunningTimer, type TimeEntry } from '@/lib/api/budget-api';
import { format, formatDistanceToNow } from 'date-fns';
import { useIntl } from 'react-intl';

interface TimeTrackingViewProps {
  workspaceId: string;
  budgetId: string;
  currency: string;
  tasks?: any[];
}

export function TimeTrackingView({ workspaceId, budgetId, currency, tasks = [] }: TimeTrackingViewProps) {
  const intl = useIntl();
  const [filterTaskId, setFilterTaskId] = useState<string>('all');
  const {
    data: timeEntries = [],
    isLoading: timeEntriesLoading,
    isError: timeEntriesError
  } = useAllTimeEntriesForBudget(
    workspaceId,
    budgetId,
    filterTaskId === 'all' ? undefined : filterTaskId
  );
  const {
    data: runningTimer,
    isLoading: runningTimerLoading,
    isError: runningTimerError
  } = useRunningTimer(workspaceId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatDurationShort = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDuration = timeEntries.reduce((sum, entry) => sum + (entry.durationSeconds || 0), 0);
    const totalBilled = timeEntries.reduce((sum, entry) => {
      const amount = Number(entry.billedAmount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const billableEntries = timeEntries.filter(entry => entry.billable).length;
    const uniqueUsers = new Set(timeEntries.map(entry => entry.userId)).size;

    return {
      totalDuration,
      totalBilled,
      billableEntries,
      totalEntries: timeEntries.length,
      uniqueUsers,
    };
  }, [timeEntries]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, TimeEntry[]> = {};

    timeEntries.forEach(entry => {
      const date = format(new Date(entry.startTime), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return sortedDates.map(date => ({
      date,
      entries: grouped[date].sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ),
    }));
  }, [timeEntries]);

  const getTaskName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.title || intl.formatMessage({ id: 'budget.timeTracking.unknownTask' });
  };

  // Show loading state
  if (timeEntriesLoading || runningTimerLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">
          {intl.formatMessage({ id: 'budget.timeTracking.loading' })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Running Timer Banner */}
      {runningTimer && runningTimer.isRunning && runningTimer.startTime && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {intl.formatMessage({ id: 'budget.timeTracking.timerRunning' })}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {getTaskName(runningTimer.taskId)} • {intl.formatMessage({ id: 'budget.timeTracking.started' })} {formatDistanceToNow(new Date(runningTimer.startTime))} {intl.formatMessage({ id: 'budget.timeTracking.ago' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatDuration(runningTimer.durationSeconds || 0)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {formatCurrency(runningTimer.billingRate || 0)}/hr
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.totalTime' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDurationShort(stats.totalDuration)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.entries' }, { count: stats.totalEntries })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.totalBilled' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalBilled)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.fromBillableTime' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.billableEntries' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.billableEntries}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.percentOfTotal' }, {
                percent: stats.totalEntries > 0 ? ((stats.billableEntries / stats.totalEntries) * 100).toFixed(0) : 0
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.teamMembers' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.uniqueUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'budget.timeTracking.stats.trackedTime' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{intl.formatMessage({ id: 'budget.timeTracking.filterByTask' })}</span>
        </div>
        <Select value={filterTaskId} onValueChange={setFilterTaskId}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{intl.formatMessage({ id: 'budget.timeTracking.allTasks' })}</SelectItem>
            {tasks.map(task => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time Entries List */}
      {timeEntries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {intl.formatMessage({ id: 'budget.timeTracking.noEntriesTitle' })}
            </h3>
            <p className="text-muted-foreground text-center">
              {intl.formatMessage({ id: 'budget.timeTracking.noEntriesDescription' })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {entriesByDate.map(({ date, entries }) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="flex-1 h-px bg-border ml-2" />
                <span className="text-sm text-muted-foreground">
                  {formatDurationShort(entries.reduce((sum, e) => sum + e.durationSeconds, 0))}
                </span>
              </div>

              <div className="space-y-2">
                {entries.map(entry => {
                  const task = tasks.find(t => t.id === entry.taskId);

                  return (
                    <Card key={entry.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4 text-primary" />
                              <span className="font-medium">
                                {task?.title || intl.formatMessage({ id: 'budget.timeTracking.unknownTask' })}
                              </span>
                              {entry.billable && (
                                <Badge variant="default" className="text-xs">
                                  {intl.formatMessage({ id: 'budget.timeTracking.billable' })}
                                </Badge>
                              )}
                              {entry.isRunning && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                  {intl.formatMessage({ id: 'budget.timeTracking.running' })}
                                </Badge>
                              )}
                            </div>

                            {entry.description && (
                              <p className="text-sm text-muted-foreground pl-6">
                                {entry.description}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground pl-6">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {format(new Date(entry.startTime), 'h:mm a')}
                                  {entry.endTime && ` - ${format(new Date(entry.endTime), 'h:mm a')}`}
                                </span>
                              </div>
                              {entry.billingRate && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span>{formatCurrency(entry.billingRate)}/hr</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            <div className="text-lg font-bold">
                              {formatDurationShort(entry.durationSeconds)}
                            </div>
                            {entry.billedAmount && entry.billedAmount > 0 && (
                              <div className="text-sm font-medium text-green-600">
                                {formatCurrency(entry.billedAmount)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
