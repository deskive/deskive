import { useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCategory } from '@/lib/api/budget-api';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import CostTypeSelector from './CostTypeSelector';

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  allocatedAmount: number;
  categoryType: 'labor' | 'materials' | 'software' | 'travel' | 'overhead' | 'other';
  costNature: 'fixed' | 'variable';
  color: string;
}

const CATEGORY_COLORS = [
  { nameKey: 'budget.modal.category.colors.blue', value: '#3b82f6' },
  { nameKey: 'budget.modal.category.colors.green', value: '#10b981' },
  { nameKey: 'budget.modal.category.colors.yellow', value: '#f59e0b' },
  { nameKey: 'budget.modal.category.colors.red', value: '#ef4444' },
  { nameKey: 'budget.modal.category.colors.purple', value: '#8b5cf6' },
  { nameKey: 'budget.modal.category.colors.pink', value: '#ec4899' },
  { nameKey: 'budget.modal.category.colors.indigo', value: '#6366f1' },
  { nameKey: 'budget.modal.category.colors.teal', value: '#14b8a6' },
];

export function AddCategoryModal({ open, onOpenChange, budgetId }: AddCategoryModalProps) {
  const intl = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CategoryFormData>({
    defaultValues: {
      categoryType: 'other',
      costNature: 'variable',
      color: CATEGORY_COLORS[0].value,
    },
  });

  const createCategory = useCreateCategory(workspaceId!);
  const categoryType = watch('categoryType');
  const costNature = watch('costNature');
  const selectedColor = watch('color');

  const onSubmit = async (data: CategoryFormData) => {
    try {
      await createCategory.mutateAsync({
        budgetId,
        data: {
          ...data,
          allocatedAmount: Number(data.allocatedAmount),
        },
      });

      toast.success(intl.formatMessage({ id: 'budget.modal.category.success.created' }));
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'budget.modal.category.error.createFailed' }));
      console.error('Create category error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'budget.modal.category.title' })}</DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'budget.modal.category.description' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{intl.formatMessage({ id: 'budget.modal.category.fields.name.label' })}</Label>
            <Input
              id="name"
              placeholder={intl.formatMessage({ id: 'budget.modal.category.fields.name.placeholder' })}
              {...register('name', { required: intl.formatMessage({ id: 'budget.modal.category.fields.name.required' }) })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{intl.formatMessage({ id: 'budget.modal.category.fields.description.label' })}</Label>
            <Textarea
              id="description"
              placeholder={intl.formatMessage({ id: 'budget.modal.category.fields.description.placeholder' })}
              {...register('description')}
              rows={2}
            />
          </div>

          {/* Allocated Amount & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="allocatedAmount">{intl.formatMessage({ id: 'budget.modal.category.fields.allocatedAmount.label' })}</Label>
              <Input
                id="allocatedAmount"
                type="number"
                step="0.01"
                placeholder={intl.formatMessage({ id: 'budget.modal.category.fields.allocatedAmount.placeholder' })}
                {...register('allocatedAmount', {
                  required: intl.formatMessage({ id: 'budget.modal.category.fields.allocatedAmount.required' }),
                  min: { value: 0, message: intl.formatMessage({ id: 'budget.modal.category.fields.allocatedAmount.minValue' }) },
                })}
              />
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: 'budget.modal.category.fields.allocatedAmount.helper' })}
              </p>
              {errors.allocatedAmount && (
                <p className="text-sm text-red-500">{errors.allocatedAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryType">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.label' })}</Label>
              <Select
                value={categoryType}
                onValueChange={(value: any) => setValue('categoryType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.options.labor' })}</SelectItem>
                  <SelectItem value="materials">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.options.materials' })}</SelectItem>
                  <SelectItem value="software">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.options.software' })}</SelectItem>
                  <SelectItem value="travel">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.options.travel' })}</SelectItem>
                  <SelectItem value="overhead">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.options.overhead' })}</SelectItem>
                  <SelectItem value="other">{intl.formatMessage({ id: 'budget.modal.category.fields.categoryType.options.other' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost Nature */}
          <CostTypeSelector
            value={costNature}
            onChange={(value) => setValue('costNature', value)}
          />

          {/* Color */}
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: 'budget.modal.category.fields.color.label' })}</Label>
            <div className="flex gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-transform ${
                    selectedColor === color.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setValue('color', color.value)}
                  title={intl.formatMessage({ id: color.nameKey })}
                />
              ))}
            </div>
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
              {intl.formatMessage({ id: 'budget.modal.category.actions.cancel' })}
            </Button>
            <Button type="submit" disabled={createCategory.isPending}>
              {createCategory.isPending
                ? intl.formatMessage({ id: 'budget.modal.category.actions.creating' })
                : intl.formatMessage({ id: 'budget.modal.category.actions.create' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
