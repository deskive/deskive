import { CheckCircle, XCircle, FileText, Clock, ExternalLink, CheckSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExpenses, useBudgetSummary } from '@/lib/api/budget-api';
import { projectService } from '@/lib/api/projects-api';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

interface ExpenseListProps {
  budgetId: string;
}

export function ExpenseList({ budgetId }: ExpenseListProps) {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: expenses, isLoading } = useExpenses(workspaceId!, budgetId);
  const { data: summary } = useBudgetSummary(workspaceId!, budgetId);

  // Fetch tasks if budget is linked to a project
  const projectId = summary?.budget?.projectId;
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', workspaceId, projectId],
    queryFn: () => projectService.getTasks(workspaceId!, projectId!),
    enabled: !!workspaceId && !!projectId,
  });
  const tasks = tasksResponse || [];

  // Create a task lookup map
  const taskMap = useMemo(() => {
    const map: Record<string, any> = {};
    tasks.forEach((task: any) => {
      map[task.id] = task;
    });
    return map;
  }, [tasks]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (expense: any) => {
    if (expense.approved) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          {intl.formatMessage({ id: 'budget.expenses.status.approved' })}
        </Badge>
      );
    }

    if (expense.rejected) {
      return (
        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
          <XCircle className="w-3 h-3 mr-1" />
          {intl.formatMessage({ id: 'budget.expenses.status.rejected' })}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Clock className="w-3 h-3 mr-1" />
        {intl.formatMessage({ id: 'budget.expenses.status.pending' })}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">{intl.formatMessage({ id: 'budget.expenses.loading' })}</div>;
  }

  if (!expenses || expenses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'budget.expenses.empty.title' })}</h3>
          <p className="text-muted-foreground text-center">
            {intl.formatMessage({ id: 'budget.expenses.empty.description' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <Card key={expense.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{expense.title}</h3>
                  {expense.billable && (
                    <Badge variant="outline" className="text-xs">
                      {intl.formatMessage({ id: 'budget.expenses.billable' })}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {expense.expenseType.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Task Badge */}
                {expense.taskId && taskMap[expense.taskId] && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      <CheckSquare className="w-3 h-3 mr-1" />
                      {intl.formatMessage({ id: 'budget.expenses.task' })}: {taskMap[expense.taskId].title}
                    </Badge>
                    {taskMap[expense.taskId].status && (
                      <span className="text-xs text-muted-foreground">
                        ({taskMap[expense.taskId].status})
                      </span>
                    )}
                  </div>
                )}

                {expense.description && (
                  <p className="text-sm text-muted-foreground mb-2">{expense.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </span>
                  {expense.vendor && <span>• {expense.vendor}</span>}
                  {expense.invoiceNumber && <span>• {expense.invoiceNumber}</span>}
                </div>

                {expense.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {intl.formatMessage({ id: 'budget.expenses.note' })}: {expense.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-xl font-bold">
                  {formatCurrency(expense.amount, expense.currency)}
                </div>

                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(expense)}

                  {expense.approvalRequestId && !expense.approved && !expense.rejected && (
                    <Link
                      to={`/workspaces/${workspaceId}/more/approvals/${expense.approvalRequestId}`}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      {intl.formatMessage({ id: 'budget.expenses.viewRequest' })}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}

                  {expense.rejected && expense.rejectionReason && (
                    <div className="text-xs text-red-600 max-w-[200px] text-right mt-1">
                      {expense.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
