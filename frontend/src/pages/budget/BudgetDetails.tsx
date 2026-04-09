import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, TrendingUp, Clock, FileText, Settings, AlertTriangle, BarChart3, FolderKanban, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudgetSummary, useExpenses } from '@/lib/api/budget-api';
import { useProject, projectService } from '@/lib/api/projects-api';
import { useQuery } from '@tanstack/react-query';
import { AddExpenseModal } from '@/components/budget/AddExpenseModal';
import { ExpenseList } from '@/components/budget/ExpenseList';
import { CategoryList } from '@/components/budget/CategoryList';
import { AddCategoryModal } from '@/components/budget/AddCategoryModal';
import { EditBudgetModal } from '@/components/budget/EditBudgetModal';
import { BudgetCharts } from '@/components/budget/BudgetCharts';
import { BudgetPredictiveAnalytics } from '@/components/budget/BudgetPredictiveAnalytics';
import { TaskBreakdown } from '@/components/budget/TaskBreakdown';
import { TimeTrackingView } from '@/components/budget/TimeTrackingView';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIntl } from 'react-intl';

export default function BudgetDetails() {
  const intl = useIntl();
  const { workspaceId, budgetId } = useParams<{ workspaceId: string; budgetId: string }>();
  const navigate = useNavigate();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const { currentWorkspace, members } = useWorkspace();
  const { user } = useAuth();

  const { data: summary, isLoading } = useBudgetSummary(workspaceId!, budgetId!);
  const { data: expenses = [] } = useExpenses(workspaceId!, budgetId!);

  // Fetch project data if budget is linked to a project
  const projectId = summary?.budget?.projectId;
  const { data: project } = useProject(
    workspaceId || '',
    projectId || ''
  );

  // Fetch tasks if budget is linked to a project
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', workspaceId, projectId],
    queryFn: () => projectService.getTasks(workspaceId!, projectId!),
    enabled: !!workspaceId && !!projectId,
  });
  const tasks = tasksResponse || [];

  // Check user permissions based on workspace membership
  const userRole = useMemo(() => {
    const currentUserMembership = members.find(m => m.user_id === user?.id);
    console.log('🔍 Budget Details - User Role Check:', {
      userId: user?.id,
      currentUserMembership,
      role: currentUserMembership?.role || 'member',
      membersCount: members.length
    });
    return currentUserMembership?.role || 'member';
  }, [members, user?.id]);

  const canManageBudgets = userRole === 'admin' || userRole === 'owner';
  const canAddExpenses = true; // All workspace members can add expenses (approval workflow varies by role)

  console.log('🔍 Budget Details - Permissions:', { userRole, canManageBudgets });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'exceeded':
        return 'bg-red-500/10 text-red-500';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.loading' })}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.notFound' })}</div>
      </div>
    );
  }

  const { budget, totalSpent, remaining, percentageUsed, categoryBreakdown, expenseCount, timeEntryCount } = summary;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/workspaces/${workspaceId}/budget`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{budget.name}</h1>
              <Badge className={getStatusColor(budget.status)}>
                {budget.status}
              </Badge>
            </div>
            {budget.description && (
              <p className="text-muted-foreground mt-1">{budget.description}</p>
            )}
          </div>
        </div>
        {canManageBudgets && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditBudgetOpen(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Project Link Banner */}
      {projectId && project && (
        <Card className="bg-muted/50 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FolderKanban className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'budget.details.linkedToProject' })}</p>
                  <p className="font-semibold text-lg">{project.name}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/workspaces/${workspaceId}/projects/${projectId}`)}
              >
                {intl.formatMessage({ id: 'budget.details.viewProject' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.details.totalBudget' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(budget.totalBudget, budget.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.details.totalSpent' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(totalSpent, budget.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'budget.details.percentUsed' }, { percent: percentageUsed.toFixed(1) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.details.remaining' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
              {formatCurrency(remaining, budget.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'budget.details.percentLeft' }, { percent: Math.max(0, 100 - percentageUsed).toFixed(1) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {intl.formatMessage({ id: 'budget.details.activity' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.expenses' })}</span>
                <span className="font-medium">{expenseCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.timeEntries' })}</span>
                <span className="font-medium">{timeEntryCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: 'budget.details.budgetUsage' })}</CardTitle>
          <CardDescription>
            {percentageUsed >= budget.alertThreshold
              ? intl.formatMessage({ id: 'budget.details.usageAlert' }, { percent: percentageUsed.toFixed(1) })
              : intl.formatMessage({ id: 'budget.details.usageNormal' }, { percent: percentageUsed.toFixed(1) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={Math.min(percentageUsed, 100)}
            className="h-4"
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={canManageBudgets ? "analytics" : "expenses"} className="space-y-4">
        <TabsList>
          {canManageBudgets && (
            <>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'budget.details.tabs.analytics' })}
              </TabsTrigger>
              <TabsTrigger value="forecasting">
                <TrendingUp className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'budget.details.tabs.forecasting' })}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="expenses">
            <FileText className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'budget.details.tabs.expenses' })}
          </TabsTrigger>
          <TabsTrigger value="categories">
            <DollarSign className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'budget.details.tabs.categories' })}
          </TabsTrigger>
          {projectId && (
            <TabsTrigger value="tasks">
              <CheckSquare className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'budget.details.tabs.tasks' })}
            </TabsTrigger>
          )}
          <TabsTrigger value="time">
            <Clock className="w-4 h-4 mr-2" />
            {intl.formatMessage({ id: 'budget.details.tabs.timeTracking' })}
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab - Only for Admins/Owners */}
        {canManageBudgets && (
          <TabsContent value="analytics" className="space-y-4">
            <BudgetCharts summary={summary} expenses={expenses} />
          </TabsContent>
        )}

        {/* Forecasting Tab - Only for Admins/Owners */}
        {canManageBudgets && (
          <TabsContent value="forecasting" className="space-y-4">
            <BudgetPredictiveAnalytics
              workspaceId={workspaceId!}
              budgetId={budgetId!}
              projectionMonths={3}
              currency={budget.currency}
            />
          </TabsContent>
        )}

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{intl.formatMessage({ id: 'budget.details.expenses' })}</h2>
            {canAddExpenses && (
              <Button onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'budget.details.addExpense' })}
              </Button>
            )}
          </div>
          <ExpenseList budgetId={budgetId!} />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{intl.formatMessage({ id: 'budget.details.budgetCategories' })}</h2>
            {canManageBudgets && (
              <Button onClick={() => setIsAddCategoryOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'budget.details.addCategory' })}
              </Button>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryBreakdown.map(({ category, spent, percentage }) => {
              const isOverBudget = percentage > 100;
              const isNearLimit = percentage >= 90 && percentage <= 100;

              return (
                <Card key={category.id} className={isOverBudget ? 'border-red-500/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {category.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        {isOverBudget && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            category.costNature === 'fixed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300'
                          }
                        >
                          {category.costNature === 'fixed' ? intl.formatMessage({ id: 'budget.details.category.fixed' }) : intl.formatMessage({ id: 'budget.details.category.variable' })}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {category.categoryType}
                        </Badge>
                      </div>
                    </div>
                    {category.description && (
                      <CardDescription>{category.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.category.allocated' })}</span>
                      <span className="font-medium">
                        {formatCurrency(category.allocatedAmount, budget.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.category.spent' })}</span>
                      <span className={`font-medium ${isOverBudget ? 'text-red-500' : 'text-orange-500'}`}>
                        {formatCurrency(spent, budget.currency)}
                      </span>
                    </div>
                    {isOverBudget && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.category.overBudget' })}</span>
                        <span className="font-semibold text-red-500">
                          {formatCurrency(spent - category.allocatedAmount, budget.currency)}
                        </span>
                      </div>
                    )}
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${isOverBudget ? 'text-red-500 font-semibold' : isNearLimit ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}`}>
                        {intl.formatMessage({ id: 'budget.details.category.percentUsed' }, { percent: percentage.toFixed(1) })}
                      </p>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-xs">
                          {intl.formatMessage({ id: 'budget.details.category.overBudgetBadge' })}
                        </Badge>
                      )}
                      {isNearLimit && !isOverBudget && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                          {intl.formatMessage({ id: 'budget.details.category.nearLimit' })}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <CategoryList budgetId={budgetId!} />
        </TabsContent>

        {/* Tasks Tab - Only show if budget is linked to a project */}
        {projectId && (
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{intl.formatMessage({ id: 'budget.details.tasks.title' })}</h2>
                <p className="text-muted-foreground mt-1">{intl.formatMessage({ id: 'budget.details.tasks.description' })}</p>
              </div>
            </div>
            {tasks.length > 0 ? (
              <TaskBreakdown
                expenses={expenses}
                tasks={tasks}
                currency={budget.currency}
                totalBudget={budget.totalBudget}
                workspaceId={workspaceId!}
                budgetId={budgetId!}
                canManageTimers={canManageBudgets}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'budget.details.tasks.noTasksTitle' })}</h3>
                  <p className="text-muted-foreground text-center">
                    {intl.formatMessage({ id: 'budget.details.tasks.noTasksDescription' })}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Time Tracking Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{intl.formatMessage({ id: 'budget.details.timeTracking.title' })}</h2>
            <p className="text-muted-foreground">{intl.formatMessage({ id: 'budget.details.timeTracking.description' })}</p>
          </div>
          <TimeTrackingView
            workspaceId={workspaceId!}
            budgetId={budgetId!}
            currency={budget.currency}
            tasks={tasks}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddExpenseModal
        open={isAddExpenseOpen}
        onOpenChange={setIsAddExpenseOpen}
        budgetId={budgetId!}
        currency={budget.currency}
      />

      <AddCategoryModal
        open={isAddCategoryOpen}
        onOpenChange={setIsAddCategoryOpen}
        budgetId={budgetId!}
      />

      <EditBudgetModal
        open={isEditBudgetOpen}
        onOpenChange={setIsEditBudgetOpen}
        budget={budget}
      />
    </div>
  );
}
