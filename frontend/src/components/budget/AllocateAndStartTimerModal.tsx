import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useCreateTaskAllocations, useTaskAllocations, useStartTimer, useTaskAssigneeRates, useSetTaskAssigneeRates } from '@/lib/api/budget-api';
import type { BudgetCategory } from '@/lib/api/budget-api';
import { toast } from 'sonner';
import { Clock, DollarSign, ArrowRight, ArrowLeft, Trash2, Plus, Users } from 'lucide-react';

interface AllocateAndStartTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  task: {
    id: string;
    name: string;
    budgetId?: string;
    assignees?: Array<{ id: string; name: string; email: string }>;
  };
  budgetCategories: BudgetCategory[];
  budgetId: string;
  currency: string;
}

interface CategoryAllocation {
  categoryId: string;
  allocatedAmount: number;
  notes?: string;
}

interface AssigneeRate {
  userId: string;
  hourlyRate: number;
  currency?: string;
  notes?: string;
}

interface Step3FormData {
  assigneeId: string;
  description: string;
  billable: boolean;
}

export function AllocateAndStartTimerModal({
  open,
  onOpenChange,
  workspaceId,
  task,
  budgetCategories,
  budgetId,
  currency,
}: AllocateAndStartTimerModalProps) {
  const [step, setStep] = useState(1);
  const [allocations, setAllocations] = useState<CategoryAllocation[]>([]);
  const [assigneeRates, setAssigneeRates] = useState<AssigneeRate[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const initializedRef = useRef(false);

  const { data: existingAllocations, isLoading: loadingAllocations } = useTaskAllocations(workspaceId, task.id);
  const { data: existingRates, isLoading: loadingRates } = useTaskAssigneeRates(workspaceId, task.id);
  const createAllocations = useCreateTaskAllocations(workspaceId);
  const setRatesMutation = useSetTaskAssigneeRates(workspaceId);
  const startTimer = useStartTimer(workspaceId);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Step3FormData>({
    defaultValues: {
      billable: true,
    },
  });

  const billable = watch('billable');

  // Initialize data when modal opens (only once per open)
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;

      // Load existing category allocations
      if (existingAllocations && existingAllocations.length > 0) {
        setAllocations(
          existingAllocations.map((a) => ({
            categoryId: a.categoryId,
            allocatedAmount: a.allocatedAmount,
            notes: a.notes,
          }))
        );
        // Skip to step 2 if both allocations AND rates exist
        if (existingRates && existingRates.length > 0) {
          setStep(3); // Skip to step 3 if everything is configured
        } else {
          setStep(2); // Skip to step 2 if only allocations exist
        }
      } else {
        setAllocations([]);
        setStep(1);
      }

      // Load existing assignee rates or initialize from assignees
      if (existingRates && existingRates.length > 0) {
        setAssigneeRates(
          existingRates.map((r) => ({
            userId: r.userId,
            hourlyRate: r.hourlyRate,
            currency: r.currency,
            notes: r.notes,
          }))
        );
      } else if (task.assignees && task.assignees.length > 0) {
        // Initialize with default rates for all assignees
        setAssigneeRates(
          task.assignees.map((assignee) => ({
            userId: assignee.id,
            hourlyRate: 50, // Default rate
            currency: currency,
            notes: '',
          }))
        );
      }

      // Reset step 3 form
      reset({
        assigneeId: task.assignees && task.assignees.length > 0 ? task.assignees[0].id : '',
        description: '',
        billable: true,
      });
      setSelectedAssignee(task.assignees && task.assignees.length > 0 ? task.assignees[0].id : '');
    }

    // Reset initialization flag and step when modal closes
    if (!open) {
      initializedRef.current = false;
      setStep(1); // Reset to step 1 for next open
    }
  }, [open, existingAllocations, existingRates, task, reset, currency]);

  const handleAddAllocation = () => {
    if (allocations.length >= budgetCategories.length) {
      toast.error('All categories have been allocated');
      return;
    }

    const usedCategoryIds = new Set(allocations.map((a) => a.categoryId));
    const availableCategory = budgetCategories.find((c) => !usedCategoryIds.has(c.id));

    if (availableCategory) {
      setAllocations([
        ...allocations,
        {
          categoryId: availableCategory.id,
          allocatedAmount: 0,
          notes: '',
        },
      ]);
    }
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const handleUpdateAllocation = (index: number, field: keyof CategoryAllocation, value: any) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const handleUpdateAssigneeRate = (userId: string, field: keyof AssigneeRate, value: any) => {
    setAssigneeRates(prev =>
      prev.map(rate =>
        rate.userId === userId ? { ...rate, [field]: value } : rate
      )
    );
  };

  const getCategoryById = (categoryId: string) => {
    return budgetCategories.find((c) => c.id === categoryId);
  };

  const getAssigneeName = (userId: string) => {
    const assignee = task.assignees?.find(a => a.id === userId);
    return assignee ? (assignee.name || assignee.email) : 'Unknown';
  };

  const getTotalAllocated = () => {
    return allocations.reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);
  };

  const handleStep1Next = async () => {
    console.log('🔵 Step 1 Next clicked', { allocations, taskId: task.id, budgetId });

    if (allocations.length === 0) {
      toast.error('Please add at least one category allocation');
      return;
    }

    const hasInvalidAmount = allocations.some((a) => !a.allocatedAmount || a.allocatedAmount <= 0);
    if (hasInvalidAmount) {
      toast.error('All allocations must have a positive amount');
      return;
    }

    try {
      // ALWAYS save/update allocations when clicking Next
      console.log('📤 Calling createAllocations API...', { taskId: task.id, budgetId, allocations });
      await createAllocations.mutateAsync({
        taskId: task.id,
        budgetId,
        allocations,
      });
      console.log('✅ Allocations saved successfully');
      toast.success('Category allocations saved');

      setStep(2);
    } catch (error) {
      console.error('❌ Failed to save allocations:', error);
      toast.error('Failed to save allocations');
      console.error('Save allocations error:', error);
    }
  };

  const handleStep2Next = async () => {
    // Validate all assignee rates
    const hasInvalidRate = assigneeRates.some((r) => !r.hourlyRate || r.hourlyRate <= 0);
    if (hasInvalidRate) {
      toast.error('All assignees must have a positive hourly rate');
      return;
    }

    try {
      // Save assignee rates
      await setRatesMutation.mutateAsync({
        taskId: task.id,
        rates: assigneeRates,
      });
      toast.success('Assignee rates saved');
      setStep(3);
    } catch (error) {
      toast.error('Failed to save assignee rates');
      console.error('Save rates error:', error);
    }
  };

  const handleStep3Submit = async (data: Step3FormData) => {
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }

    try {
      // Backend will automatically fetch task-specific rate for this assignee
      await startTimer.mutateAsync({
        taskId: task.id,
        assigneeId: selectedAssignee,
        hourlyRate: 0, // Placeholder, backend will use task-specific rate
        description: data.description || undefined,
        billable: data.billable,
      });

      toast.success('Timer started successfully');
      reset();
      setAllocations([]);
      setAssigneeRates([]);
      setStep(1);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to start timer');
      console.error('Start timer error:', error);
    }
  };

  const availableCategories = budgetCategories.filter(
    (c) => !allocations.some((a) => a.categoryId === c.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 && <DollarSign className="w-5 h-5" />}
            {step === 2 && <Users className="w-5 h-5" />}
            {step === 3 && <Clock className="w-5 h-5" />}
            {step === 1 && 'Step 1: Allocate Budget Categories'}
            {step === 2 && 'Step 2: Set Assignee Rates'}
            {step === 3 && 'Step 3: Start Timer'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && `Allocate budget categories for: ${task.name}`}
            {step === 2 && `Set hourly rates for each assignee on: ${task.name}`}
            {step === 3 && `Configure timer settings for: ${task.name}`}
          </DialogDescription>
        </DialogHeader>

        {(loadingAllocations || loadingRates) ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* STEP 1: Category Allocation */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  {allocations.map((allocation, index) => {
                    const category = getCategoryById(allocation.categoryId);
                    return (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3 bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium">Category</Label>
                              {category && (
                                <>
                                  <Badge variant={category.costNature === 'variable' ? 'default' : 'secondary'}>
                                    {category.costNature}
                                  </Badge>
                                  <Badge variant="outline">{category.categoryType}</Badge>
                                </>
                              )}
                            </div>
                            <Select
                              value={allocation.categoryId}
                              onValueChange={(value) =>
                                handleUpdateAllocation(index, 'categoryId', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {category && (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name} - {currency} {category.allocatedAmount.toFixed(2)}
                                  </SelectItem>
                                )}
                                {availableCategories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name} - {currency} {cat.allocatedAmount.toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAllocation(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">Allocated Amount ({currency})</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={allocation.allocatedAmount}
                              onChange={(e) =>
                                handleUpdateAllocation(
                                  index,
                                  'allocatedAmount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                            />
                            {category && category.costNature === 'variable' && (
                              <p className="text-xs text-muted-foreground">
                                Will be calculated hourly based on timer duration
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Notes (Optional)</Label>
                            <Input
                              type="text"
                              value={allocation.notes || ''}
                              onChange={(e) =>
                                handleUpdateAllocation(index, 'notes', e.target.value)
                              }
                              placeholder="Add notes..."
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {allocations.length < budgetCategories.length && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddAllocation}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                )}

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">Total Allocated:</span>
                  <span className="text-lg font-bold">{currency} {getTotalAllocated().toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* STEP 2: Assignee Rates */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Set different hourly rates for each team member working on this task. These rates will be used to calculate labor costs when timers are running.
                  </p>
                </div>

                <div className="space-y-3">
                  {assigneeRates.map((rate) => (
                    <div
                      key={rate.userId}
                      className="p-4 border rounded-lg space-y-3 bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <Label className="font-medium">{getAssigneeName(rate.userId)}</Label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Hourly Rate ({currency}) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={rate.hourlyRate}
                            onChange={(e) =>
                              handleUpdateAssigneeRate(
                                rate.userId,
                                'hourlyRate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="50.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Notes (Optional)</Label>
                          <Input
                            type="text"
                            value={rate.notes || ''}
                            onChange={(e) =>
                              handleUpdateAssigneeRate(rate.userId, 'notes', e.target.value)
                            }
                            placeholder="e.g., Senior developer rate"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {assigneeRates.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No assignees found for this task. Please assign team members first.
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Timer Configuration */}
            {step === 3 && (
              <form onSubmit={handleSubmit(handleStep3Submit)} className="space-y-4">
                {/* Show info banner if multiple assignees */}
                {task.assignees && task.assignees.length > 1 && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Who is working right now?</strong> This task has multiple assignees. Select who will be tracked by this timer.
                    </p>
                  </div>
                )}

                {/* Assignee Selection - Show differently based on count */}
                <div className="space-y-2">
                  {task.assignees && task.assignees.length === 1 ? (
                    // Single assignee - just show as info
                    <>
                      <Label>Team Member Being Tracked</Label>
                      <div className="p-3 bg-muted rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {task.assignees[0].name || task.assignees[0].email}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {currency} {(assigneeRates.find(r => r.userId === task.assignees![0].id)?.hourlyRate || 0).toFixed(2)}/hr
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Time will be tracked at the configured hourly rate.
                      </p>
                    </>
                  ) : (
                    // Multiple assignees - show dropdown
                    <>
                      <Label htmlFor="assignee">Select Team Member to Track *</Label>
                      {task.assignees && task.assignees.length > 0 ? (
                        <Select
                          value={selectedAssignee}
                          onValueChange={(value) => {
                            setSelectedAssignee(value);
                            setValue('assigneeId', value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Who is working now?" />
                          </SelectTrigger>
                          <SelectContent>
                            {task.assignees.map((assignee) => {
                              const rate = assigneeRates.find(r => r.userId === assignee.id);
                              return (
                                <SelectItem key={assignee.id} value={assignee.id}>
                                  {assignee.name || assignee.email}
                                  {rate && ` - ${currency} ${rate.hourlyRate}/hr`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No assignees for this task. Please assign a user first.
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Timer will use the selected person's configured hourly rate.
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What are you working on?"
                    {...register('description')}
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billable"
                    checked={billable}
                    onCheckedChange={(checked) => setValue('billable', checked as boolean)}
                  />
                  <Label htmlFor="billable" className="cursor-pointer font-normal">
                    Billable time (costs will be added to budget)
                  </Label>
                </div>

                {/* Summary */}
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium text-sm">Budget Allocations:</p>
                  <div className="space-y-1 text-sm">
                    {allocations.map((allocation, index) => {
                      const category = getCategoryById(allocation.categoryId);
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {category && (
                              <>
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category.color || '#888' }}
                                />
                                <span>{category.name}</span>
                                <Badge
                                  variant={category.costNature === 'variable' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {category.costNature}
                                </Badge>
                              </>
                            )}
                          </span>
                          <span className="font-medium">{currency} {allocation.allocatedAmount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between font-semibold">
                    <span>Total:</span>
                    <span>{currency} {getTotalAllocated().toFixed(2)}</span>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStep1Next}
                disabled={createAllocations.isPending || allocations.length === 0}
              >
                {createAllocations.isPending ? 'Saving...' : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={setRatesMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleStep2Next}
                disabled={setRatesMutation.isPending || assigneeRates.length === 0}
              >
                {setRatesMutation.isPending ? 'Saving...' : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                disabled={startTimer.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSubmit(handleStep3Submit)}
                disabled={startTimer.isPending || !selectedAssignee || !task.assignees || task.assignees.length === 0}
              >
                {startTimer.isPending ? 'Starting...' : 'Start Timer'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
