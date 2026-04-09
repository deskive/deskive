import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertCircle, ArrowLeft, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgets } from '@/lib/api/budget-api';
import { useProjects } from '@/lib/api/projects-api';
import { CreateBudgetModal } from '@/components/budget/CreateBudgetModal';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIntl } from 'react-intl';

export default function BudgetList() {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId?: string }>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { currentWorkspace, members } = useWorkspace();
  const { user } = useAuth();

  const { data: budgets, isLoading } = useBudgets(workspaceId!, projectId);
  const { data: projectsData } = useProjects(workspaceId!);
  const projects = projectsData?.data || [];

  // Check user permissions based on workspace membership
  const userRole = useMemo(() => {
    const currentUserMembership = members.find(m => m.user_id === user?.id);
    return currentUserMembership?.role || 'member';
  }, [members, user?.id]);

  const canManageBudgets = userRole === 'admin' || userRole === 'owner';

  // Helper function to get project name
  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'exceeded':
        return 'bg-red-500/10 text-red-500';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500';
      case 'archived':
        return 'bg-gray-500/10 text-gray-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return formatMessage({ id: `budget.status.${status}` });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">
          {formatMessage({ id: 'budget.loading' })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/workspaces/${workspaceId}/more`)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {formatMessage({ id: 'budget.title' })}
            </h1>
            <p className="text-muted-foreground mt-1">
              {formatMessage({ id: 'budget.subtitle' })}
            </p>
          </div>
        </div>
        {canManageBudgets && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {formatMessage({ id: 'budget.createButton' })}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {budgets && budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {formatMessage({ id: 'budget.stats.totalBudgets' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{budgets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {formatMessage({ id: 'budget.stats.activeBudgets' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {budgets.filter((b) => b.status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {formatMessage({ id: 'budget.stats.exceededBudgets' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {budgets.filter((b) => b.status === 'exceeded').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget List */}
      {!budgets || budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {formatMessage({ id: 'budget.empty.title' })}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {formatMessage({ id: 'budget.empty.description' })}
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {formatMessage({ id: 'budget.createButton' })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <Card
              key={budget.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => navigate(`/workspaces/${workspaceId}/budget/${budget.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{budget.name}</CardTitle>
                    {budget.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {budget.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge className={getStatusColor(budget.status)}>
                    {getStatusLabel(budget.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Budget Amount */}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {formatMessage({ id: 'budget.card.totalBudget' })}
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(budget.totalBudget, budget.currency)}
                  </div>
                </div>

                {/* Budget Type */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatMessage({ id: 'budget.card.type' })}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {formatMessage({ id: `budget.type.${budget.budgetType}` })}
                  </Badge>
                </div>

                {/* Linked Project */}
                {budget.projectId && getProjectName(budget.projectId) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatMessage({ id: 'budget.card.project' })}
                    </span>
                    <div className="flex items-center gap-1.5 text-primary">
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span className="font-medium">{getProjectName(budget.projectId)}</span>
                    </div>
                  </div>
                )}

                {/* Dates */}
                {(budget.startDate || budget.endDate) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatMessage({ id: 'budget.card.period' })}
                    </span>
                    <span>
                      {budget.startDate
                        ? new Date(budget.startDate).toLocaleDateString()
                        : '—'}{' '}
                      -{' '}
                      {budget.endDate
                        ? new Date(budget.endDate).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                )}

                {/* Alert Threshold */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatMessage({ id: 'budget.card.alertAt' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {budget.alertThreshold}%
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Budget Modal */}
      <CreateBudgetModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        workspaceId={workspaceId!}
        projectId={projectId}
      />
    </div>
  );
}
