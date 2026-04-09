import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgets } from '@/lib/api/budget-api';
import { CreateBudgetModal } from '@/components/budget/CreateBudgetModal';

interface ProjectBudgetsProps {
  workspaceId: string;
  projectId: string;
  canManageBudgets: boolean;
}

export function ProjectBudgets({ workspaceId, projectId, canManageBudgets }: ProjectBudgetsProps) {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: budgets, isLoading } = useBudgets(workspaceId, projectId);

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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading budgets...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Budgets</h2>
          <p className="text-muted-foreground mt-1">Track expenses and budgets for this project</p>
        </div>
        {canManageBudgets && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Budget
          </Button>
        )}
      </div>

      {/* Budget List */}
      {!budgets || budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budgets yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create a budget to track expenses for this project
            </p>
            {canManageBudgets && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Budget
              </Button>
            )}
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
                    {budget.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Budget Amount */}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Budget</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(budget.totalBudget, budget.currency)}
                  </div>
                </div>

                {/* Budget Type */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline" className="capitalize">
                    {budget.budgetType}
                  </Badge>
                </div>

                {/* Dates */}
                {(budget.startDate || budget.endDate) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Period</span>
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
                  <span className="text-muted-foreground">Alert at</span>
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
        workspaceId={workspaceId}
        projectId={projectId}
      />
    </div>
  );
}
