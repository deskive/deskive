import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateBudget, useDeleteBudget } from '@/lib/api/budget-api';
import { toast } from 'sonner';
import type { Budget } from '@/lib/api/budget-api';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useIntl } from 'react-intl';

interface EditBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
}

interface BudgetFormData {
  name: string;
  description: string;
  totalBudget: number;
  currency: string;
  startDate: string;
  endDate: string;
  alertThreshold: number;
  status: 'active' | 'completed' | 'exceeded' | 'archived';
}

export function EditBudgetModal({ open, onOpenChange, budget }: EditBudgetModalProps) {
  const { formatMessage } = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BudgetFormData>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateBudget = useUpdateBudget(workspaceId!);
  const deleteBudget = useDeleteBudget(workspaceId!);
  const status = watch('status');

  // Populate form with current budget data when modal opens
  useEffect(() => {
    if (open && budget) {
      reset({
        name: budget.name,
        description: budget.description || '',
        totalBudget: budget.totalBudget,
        currency: budget.currency,
        startDate: budget.startDate ? budget.startDate.split('T')[0] : '',
        endDate: budget.endDate ? budget.endDate.split('T')[0] : '',
        alertThreshold: budget.alertThreshold || 80,
        status: budget.status,
      });
    }
  }, [open, budget, reset]);

  const onSubmit = async (formData: BudgetFormData) => {
    try {
      await updateBudget.mutateAsync({
        budgetId: budget.id,
        data: {
          name: formData.name,
          description: formData.description,
          totalBudget: Number(formData.totalBudget),
          currency: formData.currency,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          alertThreshold: Number(formData.alertThreshold),
          status: formData.status,
        },
      });

      toast.success(formatMessage({ id: 'budget.editModal.updateSuccess' }));
      onOpenChange(false);
    } catch (error) {
      toast.error(formatMessage({ id: 'budget.editModal.updateError' }));
      console.error('Update budget error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBudget.mutateAsync(budget.id);
      toast.success(formatMessage({ id: 'budget.editModal.deleteSuccess' }));
      setShowDeleteConfirm(false);
      onOpenChange(false);
      navigate(`/workspaces/${workspaceId}/budget`);
    } catch (error) {
      toast.error(formatMessage({ id: 'budget.editModal.deleteError' }));
      console.error('Delete budget error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formatMessage({ id: 'budget.editModal.title' })}</DialogTitle>
          <DialogDescription>
            {formatMessage({ id: 'budget.editModal.description' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{formatMessage({ id: 'budget.editModal.name' })}</Label>
            <Input
              id="name"
              placeholder={formatMessage({ id: 'budget.editModal.namePlaceholder' })}
              {...register('name', { required: formatMessage({ id: 'budget.editModal.nameRequired' }) })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{formatMessage({ id: 'budget.editModal.description' })}</Label>
            <Textarea
              id="description"
              placeholder={formatMessage({ id: 'budget.editModal.descriptionPlaceholder' })}
              {...register('description')}
              rows={3}
            />
          </div>

          {/* Total Budget & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalBudget">{formatMessage({ id: 'budget.editModal.totalBudget' })}</Label>
              <Input
                id="totalBudget"
                type="number"
                step="0.01"
                placeholder="10000"
                {...register('totalBudget', {
                  required: formatMessage({ id: 'budget.editModal.totalBudgetRequired' }),
                  min: { value: 0, message: formatMessage({ id: 'budget.editModal.mustBePositive' }) },
                })}
              />
              {errors.totalBudget && (
                <p className="text-sm text-red-500">{errors.totalBudget.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{formatMessage({ id: 'budget.editModal.currency' })}</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="BDT">BDT (৳)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{formatMessage({ id: 'budget.editModal.startDate' })}</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">{formatMessage({ id: 'budget.editModal.endDate' })}</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
            </div>
          </div>

          {/* Alert Threshold */}
          <div className="space-y-2">
            <Label htmlFor="alertThreshold">{formatMessage({ id: 'budget.editModal.alertThreshold' })}</Label>
            <Input
              id="alertThreshold"
              type="number"
              min="0"
              max="100"
              placeholder="80"
              {...register('alertThreshold', {
                required: formatMessage({ id: 'budget.editModal.alertThresholdRequired' }),
                min: { value: 0, message: formatMessage({ id: 'budget.editModal.alertThresholdMin' }) },
                max: { value: 100, message: formatMessage({ id: 'budget.editModal.alertThresholdMax' }) },
              })}
            />
            <p className="text-xs text-muted-foreground">
              {formatMessage({ id: 'budget.editModal.alertThresholdHelper' })}
            </p>
            {errors.alertThreshold && (
              <p className="text-sm text-red-500">{errors.alertThreshold.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{formatMessage({ id: 'budget.editModal.status' })}</Label>
            <Select
              value={status}
              onValueChange={(value: any) => setValue('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{formatMessage({ id: 'budget.editModal.statusActive' })}</SelectItem>
                <SelectItem value="completed">{formatMessage({ id: 'budget.editModal.statusCompleted' })}</SelectItem>
                <SelectItem value="exceeded">{formatMessage({ id: 'budget.editModal.statusExceeded' })}</SelectItem>
                <SelectItem value="archived">{formatMessage({ id: 'budget.editModal.statusArchived' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-destructive/20">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-destructive">{formatMessage({ id: 'budget.editModal.dangerZone' })}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatMessage({ id: 'budget.editModal.dangerZoneDesc' })}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {formatMessage({ id: 'budget.editModal.deleteBudget' })}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {formatMessage({ id: 'budget.editModal.cancel' })}
            </Button>
            <Button type="submit" disabled={updateBudget.isPending}>
              {updateBudget.isPending ? formatMessage({ id: 'budget.editModal.saving' }) : formatMessage({ id: 'budget.editModal.saveChanges' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{formatMessage({ id: 'budget.editModal.confirmDeleteTitle' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {formatMessage({ id: 'budget.editModal.confirmDeleteDesc' }, { name: budget.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{formatMessage({ id: 'budget.editModal.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBudget.isPending}
            >
              {deleteBudget.isPending ? formatMessage({ id: 'budget.editModal.deleting' }) : formatMessage({ id: 'budget.editModal.deleteBudget' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
