import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useStartTimer, useTaskAssigneeRate } from '@/lib/api/budget-api';
import { toast } from 'sonner';
import { Clock, Loader2 } from 'lucide-react';

interface StartTaskTimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  task: {
    id: string;
    name: string;
    assignees?: Array<{ id: string; name: string; email: string }>;
  };
}

interface TimerFormData {
  assigneeId: string;
  hourlyRate: number;
  description: string;
  billable: boolean;
}

export function StartTaskTimerModal({ open, onOpenChange, workspaceId, task }: StartTaskTimerModalProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TimerFormData>({
    defaultValues: {
      billable: true,
      hourlyRate: 50, // Default rate
    },
  });

  const startTimer = useStartTimer(workspaceId);
  const billable = watch('billable');

  // Fetch task-specific rate for selected assignee
  const { data: taskRate, isLoading: loadingRate } = useTaskAssigneeRate(workspaceId, task.id, selectedAssignee);

  // Update hourly rate when task-specific rate is fetched
  useEffect(() => {
    if (taskRate?.hourlyRate) {
      setValue('hourlyRate', taskRate.hourlyRate);
    }
  }, [taskRate, setValue]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const initialAssignee = task.assignees && task.assignees.length > 0 ? task.assignees[0].id : '';
      reset({
        assigneeId: initialAssignee,
        hourlyRate: 50,
        description: '',
        billable: true,
      });
      setSelectedAssignee(initialAssignee);
    }
  }, [open, task, reset]);

  const onSubmit = async (data: TimerFormData) => {
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }

    try {
      await startTimer.mutateAsync({
        taskId: task.id,
        assigneeId: selectedAssignee,
        hourlyRate: Number(data.hourlyRate),
        description: data.description || undefined,
        billable: data.billable,
      });

      toast.success('Timer started successfully');
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to start timer');
      console.error('Start timer error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Start Timer
          </DialogTitle>
          <DialogDescription>
            Start tracking time for: <strong>{task.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Assignee Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee *</Label>
            {task.assignees && task.assignees.length > 0 ? (
              <Select
                value={selectedAssignee}
                onValueChange={(value) => {
                  setSelectedAssignee(value);
                  setValue('assigneeId', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {task.assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name || assignee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assignees for this task. Please assign a user first.
              </p>
            )}
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
            <div className="relative">
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="50.00"
                {...register('hourlyRate', {
                  required: 'Hourly rate is required',
                  min: { value: 0, message: 'Must be positive' },
                })}
                disabled={loadingRate}
              />
              {loadingRate && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {errors.hourlyRate && (
              <p className="text-sm text-red-500">{errors.hourlyRate.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {taskRate
                ? `Using task-specific rate for this assignee (${taskRate.currency} ${taskRate.hourlyRate}/hr)`
                : 'No task-specific rate set. You can enter a rate or configure rates in the budget allocation modal.'}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What are you working on?"
              {...register('description')}
              rows={2}
            />
          </div>

          {/* Billable Checkbox */}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={startTimer.isPending || !selectedAssignee || !task.assignees || task.assignees.length === 0}
            >
              {startTimer.isPending ? 'Starting...' : 'Start Timer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
