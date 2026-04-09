import { useMemo, useState, useEffect } from 'react';
import { CheckSquare, TrendingUp, TrendingDown, Clock, Play, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { BudgetExpense } from '@/lib/api/budget-api';
import { useAllRunningTimersForTask, useStopTimer, useCategories } from '@/lib/api/budget-api';
import { AllocateAndStartTimerModal } from './AllocateAndStartTimerModal';
import { toast } from 'sonner';
import { useIntl } from 'react-intl';

interface TaskBreakdownProps {
  expenses: BudgetExpense[];
  tasks: any[];
  currency: string;
  totalBudget: number;
  workspaceId: string;
  budgetId: string;
  canManageTimers: boolean; // admin/owner permission
}

export function TaskBreakdown({ expenses, tasks, currency, totalBudget, workspaceId, budgetId, canManageTimers }: TaskBreakdownProps) {
  const { formatMessage } = useIntl();
  const [startTimerModalOpen, setStartTimerModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const stopTimer = useStopTimer(workspaceId);
  const { data: categories = [] } = useCategories(workspaceId, budgetId);

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
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stripHtml = (html: string) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleStartTimer = (task: any) => {
    setSelectedTask(task);
    setStartTimerModalOpen(true);
  };

  const handleStopTimer = async (taskId: string, timeEntryId: string) => {
    try {
      await stopTimer.mutateAsync({ timeEntryId, taskId, budgetId });
      toast.success(formatMessage({ id: 'budget.tasks.timerStoppedSuccess' }));
    } catch (error) {
      toast.error(formatMessage({ id: 'budget.tasks.timerStoppedError' }));
      console.error('Stop timer error:', error);
    }
  };

  // Calculate expenses by task
  const taskExpenses = useMemo(() => {
    const taskMap: Record<string, { task: any; expenses: BudgetExpense[]; total: number; count: number }> = {};

    expenses.forEach((expense) => {
      if (expense.taskId && expense.approved) {
        if (!taskMap[expense.taskId]) {
          const task = tasks.find((t) => t.id === expense.taskId);
          if (task) {
            taskMap[expense.taskId] = {
              task,
              expenses: [],
              total: 0,
              count: 0,
            };
          }
        }

        if (taskMap[expense.taskId]) {
          taskMap[expense.taskId].expenses.push(expense);
          taskMap[expense.taskId].total += expense.amount;
          taskMap[expense.taskId].count += 1;
        }
      }
    });

    // Convert to array and sort by total (highest first)
    return Object.values(taskMap).sort((a, b) => b.total - a.total);
  }, [expenses, tasks]);

  // Timer Display Component - Shows ALL running timers for this task
  const TaskTimer = ({ task }: { task: any }) => {
    const { data: runningTimers = [] } = useAllRunningTimersForTask(workspaceId, task.id);
    const [timerDurations, setTimerDurations] = useState<Record<string, number>>({});

    // Update all timer durations
    useEffect(() => {
      if (runningTimers.length > 0) {
        const interval = setInterval(() => {
          const durations: Record<string, number> = {};
          runningTimers.forEach(timer => {
            if (timer.startTime) {
              const start = new Date(timer.startTime).getTime();
              const now = Date.now();
              durations[timer.id] = Math.floor((now - start) / 1000);
            }
          });
          setTimerDurations(durations);
        }, 1000);

        return () => clearInterval(interval);
      } else {
        setTimerDurations({});
      }
    }, [runningTimers]);

    if (!canManageTimers) {
      return null;
    }

    const hasRunningTimers = runningTimers.length > 0;

    return (
      <div className="mt-3 space-y-2">
        {/* Show all running timers */}
        {runningTimers.map((timer) => {
          // Find assignee name from task assignees
          const assignee = task.assignees?.find((a: any) => a.id === timer.userId);
          const assigneeName = assignee ? (assignee.name || assignee.email) : 'Unknown';

          return (
            <div key={timer.id} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400 animate-pulse" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-700 dark:text-green-300">
                  {assigneeName}: {formatDuration(timerDurations[timer.id] || 0)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  {formatCurrency(timer.billingRate || 0)}/hr
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStopTimer(task.id, timer.id)}
                disabled={stopTimer.isPending}
              >
                <Square className="w-3 h-3 mr-1" />
                {formatMessage({ id: 'budget.tasks.stop' })}
              </Button>
            </div>
          );
        })}

        {/* Always show start timer button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleStartTimer(task)}
          className="w-full"
        >
          <Play className="w-3 h-3 mr-1" />
          {hasRunningTimers
            ? formatMessage({ id: 'budget.tasks.startTimerAnother' })
            : formatMessage({ id: 'budget.tasks.startTimer' })}
        </Button>
      </div>
    );
  };

  // Calculate unlinked expenses
  const unlinkedExpenses = useMemo(() => {
    return expenses.filter((exp) => !exp.taskId && exp.approved);
  }, [expenses]);

  const unlinkedTotal = useMemo(() => {
    return unlinkedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [unlinkedExpenses]);

  const totalExpenses = useMemo(() => {
    return expenses.filter((exp) => exp.approved).reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  // Create task list with expense data
  const tasksWithExpenses = useMemo(() => {
    return tasks.map(task => {
      const taskExps = expenses.filter(exp => exp.taskId === task.id && exp.approved);
      const total = taskExps.reduce((sum, exp) => sum + exp.amount, 0);

      return {
        task,
        expenses: taskExps,
        total,
        count: taskExps.length,
      };
    });
  }, [tasks, expenses]);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{formatMessage({ id: 'budget.tasks.noTasksTitle' })}</h3>
          <p className="text-muted-foreground text-center">
            {formatMessage({ id: 'budget.tasks.noTasksDesc' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {formatMessage({ id: 'budget.tasks.totalTasks' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatMessage({ id: 'budget.tasks.withExpenses' }, { count: tasksWithExpenses.filter(t => t.count > 0).length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {formatMessage({ id: 'budget.tasks.taskLinkedExpenses' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalExpenses - unlinkedTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatMessage({ id: 'budget.tasks.expensesCount' }, { count: tasksWithExpenses.reduce((sum, t) => sum + t.count, 0) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {formatMessage({ id: 'budget.tasks.unlinkedExpenses' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(unlinkedTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatMessage({ id: 'budget.tasks.expensesCount' }, { count: unlinkedExpenses.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{formatMessage({ id: 'budget.tasks.allTasks' })}</h3>
        <div className="space-y-3">
          {tasksWithExpenses.map(({ task, expenses: taskExps, total, count }) => {
              // Calculate percentage of TOTAL BUDGET, not total expenses
              const percentage = totalBudget > 0 ? (total / totalBudget) * 100 : 0;

              return (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckSquare className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold">{task.title}</h4>
                          {task.status && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {task.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        {task.description && stripHtml(task.description).trim() && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {stripHtml(task.description)}
                          </p>
                        )}
                      </div>
                      {count > 0 ? (
                        <div className="text-right">
                          <div className="text-xl font-bold">{formatCurrency(total)}</div>
                          <div className="text-xs text-muted-foreground">{count} expenses</div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">{formatMessage({ id: 'budget.tasks.noExpensesYet' })}</Badge>
                        </div>
                      )}
                    </div>

                    {count > 0 && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{formatMessage({ id: 'budget.tasks.percentOfBudget' })}</span>
                            <span className="font-medium">{percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(percentage, 100)} className="h-2" />
                        </div>

                        {/* Expense Details */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground mb-2">{formatMessage({ id: 'budget.tasks.expenseDetails' })}</div>
                          <div className="space-y-1">
                            {taskExps.slice(0, 3).map((exp) => (
                              <div
                                key={exp.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground truncate flex-1">
                                  {exp.title}
                                </span>
                                <span className="font-medium ml-2">
                                  {formatCurrency(exp.amount)}
                                </span>
                              </div>
                            ))}
                            {taskExps.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                {formatMessage({ id: 'budget.tasks.moreExpenses' }, { count: taskExps.length - 3 })}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Timer Control */}
                    <TaskTimer task={task} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      {/* Start Timer Modal */}
      {selectedTask && (
        <AllocateAndStartTimerModal
          open={startTimerModalOpen}
          onOpenChange={setStartTimerModalOpen}
          workspaceId={workspaceId}
          task={selectedTask}
          budgetCategories={categories}
          budgetId={budgetId}
          currency={currency}
        />
      )}

      {/* Unlinked Expenses */}
      {unlinkedExpenses.length > 0 && (
        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              {formatMessage({ id: 'budget.tasks.unlinkedExpenses' })}
            </CardTitle>
            <CardDescription>
              {formatMessage({ id: 'budget.tasks.unlinkedExpensesDesc' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">{formatMessage({ id: 'budget.tasks.totalUnlinked' })}</span>
              <span className="text-xl font-bold text-orange-500">
                {formatCurrency(unlinkedTotal)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatMessage({ id: 'budget.tasks.unlinkedCount' }, { count: unlinkedExpenses.length })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
