import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateExpense, useCategories, useBudgetSummary } from '@/lib/api/budget-api';
import { projectService } from '@/lib/api/projects-api';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

interface AddExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  currency: string;
}

interface ExpenseFormData {
  title: string;
  description: string;
  amount: number;
  expenseDate: string;
  categoryId: string;
  taskId: string;
  expenseType: 'manual' | 'invoice' | 'purchase';
  billable: boolean;
  vendor: string;
  invoiceNumber: string;
  notes: string;
}

export function AddExpenseModal({ open, onOpenChange, budgetId, currency }: AddExpenseModalProps) {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ExpenseFormData>({
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
      expenseType: 'manual',
      billable: true,
    },
  });

  const createExpense = useCreateExpense(workspaceId!);
  const { data: categories } = useCategories(workspaceId!, budgetId);
  const { data: summary } = useBudgetSummary(workspaceId!, budgetId);

  // Fetch tasks if budget is linked to a project
  const projectId = summary?.budget?.projectId;
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', workspaceId, projectId],
    queryFn: () => projectService.getTasks(workspaceId!, projectId!),
    enabled: !!workspaceId && !!projectId,
  });
  const tasks = tasksResponse || [];

  const expenseType = watch('expenseType');
  const billable = watch('billable');
  const selectedCategoryId = watch('categoryId');
  const selectedTaskId = watch('taskId');
  const expenseAmount = watch('amount');

  // Helper function to format currency
  const formatCurrency = (amount: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  // Calculate category spending and warnings
  const categoryWarning = useMemo(() => {
    if (!selectedCategoryId || !summary || !expenseAmount) return null;

    const category = summary.categoryBreakdown.find(cb => cb.category.id === selectedCategoryId);
    if (!category) return null;

    const allocated = category.category.allocatedAmount;
    const spent = category.spent;
    const remaining = allocated - spent;
    const newTotal = spent + Number(expenseAmount);
    const overage = newTotal - allocated;

    if (overage > 0) {
      return {
        type: 'over' as const,
        message: intl.formatMessage(
          { id: 'budget.modal.expense.warning.exceed' },
          { amount: formatCurrency(overage, currency) }
        ),
        allocated,
        spent,
        remaining,
        newTotal,
        percentage: Math.round((newTotal / allocated) * 100),
      };
    } else if (remaining < allocated * 0.1 && Number(expenseAmount) > remaining) {
      return {
        type: 'warning' as const,
        message: intl.formatMessage(
          { id: 'budget.modal.expense.warning.remaining' },
          { amount: formatCurrency(remaining, currency) }
        ),
        allocated,
        spent,
        remaining,
        newTotal,
        percentage: Math.round((newTotal / allocated) * 100),
      };
    }

    return null;
  }, [selectedCategoryId, expenseAmount, summary, currency]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await createExpense.mutateAsync({
        budgetId,
        ...data,
        amount: Number(data.amount),
        currency,
        categoryId: data.categoryId || undefined,
        taskId: data.taskId || undefined,
      });

      toast.success(intl.formatMessage({ id: 'budget.modal.expense.success' }));
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'budget.modal.expense.error' }));
      console.error('Add expense error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'budget.modal.expense.title' })}</DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'budget.modal.expense.description' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{intl.formatMessage({ id: 'budget.modal.expense.fields.title.label' })}</Label>
            <Input
              id="title"
              placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.title.placeholder' })}
              {...register('title', {
                required: intl.formatMessage({ id: 'budget.modal.expense.fields.title.required' })
              })}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{intl.formatMessage({ id: 'budget.modal.expense.fields.description.label' })}</Label>
            <Textarea
              id="description"
              placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.description.placeholder' })}
              {...register('description')}
              rows={2}
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {intl.formatMessage({ id: 'budget.modal.expense.fields.amount.label' }, { currency })}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.amount.placeholder' })}
                {...register('amount', {
                  required: intl.formatMessage({ id: 'budget.modal.expense.fields.amount.required' }),
                  min: { value: 0, message: intl.formatMessage({ id: 'budget.modal.expense.fields.amount.minValue' }) },
                })}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDate">{intl.formatMessage({ id: 'budget.modal.expense.fields.date.label' })}</Label>
              <Input
                id="expenseDate"
                type="date"
                {...register('expenseDate', {
                  required: intl.formatMessage({ id: 'budget.modal.expense.fields.date.required' })
                })}
              />
              {errors.expenseDate && (
                <p className="text-sm text-red-500">{errors.expenseDate.message}</p>
              )}
            </div>
          </div>

          {/* Category & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">{intl.formatMessage({ id: 'budget.modal.expense.fields.category.label' })}</Label>
              <Select onValueChange={(value) => setValue('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.category.placeholder' })} />
                </SelectTrigger>
                <SelectContent>
                  {categories && categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {intl.formatMessage({ id: 'budget.modal.expense.fields.category.noCategories' })}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseType">{intl.formatMessage({ id: 'budget.modal.expense.fields.type.label' })}</Label>
              <Select
                value={expenseType}
                onValueChange={(value: any) => setValue('expenseType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{intl.formatMessage({ id: 'budget.modal.expense.fields.type.manual' })}</SelectItem>
                  <SelectItem value="invoice">{intl.formatMessage({ id: 'budget.modal.expense.fields.type.invoice' })}</SelectItem>
                  <SelectItem value="purchase">{intl.formatMessage({ id: 'budget.modal.expense.fields.type.purchase' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Task Selector - Only show if budget is linked to a project */}
          {projectId && tasks.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="taskId">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>{intl.formatMessage({ id: 'budget.modal.expense.fields.task.label' })}</span>
                </div>
              </Label>
              <Select onValueChange={(value) => setValue('taskId', value === 'none' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.task.placeholder' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.modal.expense.fields.task.noTask' })}</span>
                  </SelectItem>
                  {tasks.map((task: any) => (
                    <SelectItem key={task.id} value={task.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        {task.status && (
                          <span className="text-xs text-muted-foreground">({task.status})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage(
                  { id: 'budget.modal.expense.fields.task.helper' },
                  { count: tasks.length }
                )}
              </p>
            </div>
          )}

          {/* Budget Warning Alert */}
          {categoryWarning && (
            <Alert variant={categoryWarning.type === 'over' ? 'destructive' : 'default'} className="border-l-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">{categoryWarning.message}</p>
                  <div className="text-xs space-y-0.5">
                    <p>
                      {intl.formatMessage({ id: 'budget.modal.expense.warning.allocated' })}:{' '}
                      {formatCurrency(categoryWarning.allocated, currency)}
                    </p>
                    <p>
                      {intl.formatMessage({ id: 'budget.modal.expense.warning.currentlySpent' })}:{' '}
                      {formatCurrency(categoryWarning.spent, currency)}
                    </p>
                    <p className={categoryWarning.type === 'over' ? 'text-red-600 font-semibold' : ''}>
                      {intl.formatMessage({ id: 'budget.modal.expense.warning.afterExpense' })}:{' '}
                      {formatCurrency(categoryWarning.newTotal, currency)} ({categoryWarning.percentage}%)
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Vendor & Invoice Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">{intl.formatMessage({ id: 'budget.modal.expense.fields.vendor.label' })}</Label>
              <Input
                id="vendor"
                placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.vendor.placeholder' })}
                {...register('vendor')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">{intl.formatMessage({ id: 'budget.modal.expense.fields.invoiceNumber.label' })}</Label>
              <Input
                id="invoiceNumber"
                placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.invoiceNumber.placeholder' })}
                {...register('invoiceNumber')}
              />
            </div>
          </div>

          {/* Billable */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              checked={billable}
              onCheckedChange={(checked) => setValue('billable', checked as boolean)}
            />
            <Label htmlFor="billable" className="cursor-pointer">
              {intl.formatMessage({ id: 'budget.modal.expense.fields.billable.label' })}
            </Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{intl.formatMessage({ id: 'budget.modal.expense.fields.notes.label' })}</Label>
            <Textarea
              id="notes"
              placeholder={intl.formatMessage({ id: 'budget.modal.expense.fields.notes.placeholder' })}
              {...register('notes')}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              {intl.formatMessage({ id: 'budget.modal.expense.cancel' })}
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending
                ? intl.formatMessage({ id: 'budget.modal.expense.adding' })
                : intl.formatMessage({ id: 'budget.modal.expense.submit' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
