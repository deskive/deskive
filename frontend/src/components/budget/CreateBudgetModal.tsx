import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateBudget, useCreateCategory } from '@/lib/api/budget-api';
import { useProjects } from '@/lib/api/projects-api';
import { toast } from 'sonner';
import { FolderKanban, Sparkles } from 'lucide-react';

interface CreateBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId?: string;
}

interface BudgetFormData {
  name: string;
  description: string;
  budgetType: 'project' | 'task' | 'phase' | 'resource';
  totalBudget: number;
  currency: string;
  startDate: string;
  endDate: string;
  alertThreshold: number;
}

export function CreateBudgetModal({ open, onOpenChange, workspaceId, projectId }: CreateBudgetModalProps) {
  const intl = useIntl();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId);
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BudgetFormData>({
    defaultValues: {
      budgetType: 'project',
      currency: 'USD',
      alertThreshold: 80,
    },
  });

  const createBudget = useCreateBudget(workspaceId);
  const createCategory = useCreateCategory(workspaceId);
  const { data: projectsData, isLoading: projectsLoading } = useProjects(workspaceId);

  // Handle different data structures from the API
  const projects = Array.isArray(projectsData?.data)
    ? projectsData.data
    : Array.isArray(projectsData)
    ? projectsData
    : [];

  const budgetType = watch('budgetType');

  console.log('🔍 CreateBudgetModal - Projects:', {
    workspaceId,
    projectsData,
    projects,
    projectsCount: projects.length,
    isLoading: projectsLoading
  });

  const onSubmit = async (data: BudgetFormData) => {
    try {
      const newBudget = await createBudget.mutateAsync({
        ...data,
        projectId: selectedProjectId || undefined,
        totalBudget: Number(data.totalBudget),
        alertThreshold: Number(data.alertThreshold),
      });

      // Auto-create default categories if enabled and project is linked
      if (autoCreateCategories && selectedProjectId) {
        const totalBudget = Number(data.totalBudget);
        const defaultCategories = [
          {
            name: intl.formatMessage({ id: 'budget.modal.categories.labor.name' }),
            description: intl.formatMessage({ id: 'budget.modal.categories.labor.description' }),
            categoryType: 'labor' as const,
            costNature: 'variable' as const,
            allocatedAmount: Math.round(totalBudget * 0.40), // 40%
            color: '#3b82f6'
          },
          {
            name: intl.formatMessage({ id: 'budget.modal.categories.materials.name' }),
            description: intl.formatMessage({ id: 'budget.modal.categories.materials.description' }),
            categoryType: 'materials' as const,
            costNature: 'variable' as const,
            allocatedAmount: Math.round(totalBudget * 0.25), // 25%
            color: '#10b981'
          },
          {
            name: intl.formatMessage({ id: 'budget.modal.categories.software.name' }),
            description: intl.formatMessage({ id: 'budget.modal.categories.software.description' }),
            categoryType: 'software' as const,
            costNature: 'fixed' as const,
            allocatedAmount: Math.round(totalBudget * 0.15), // 15%
            color: '#8b5cf6'
          },
          {
            name: intl.formatMessage({ id: 'budget.modal.categories.travel.name' }),
            description: intl.formatMessage({ id: 'budget.modal.categories.travel.description' }),
            categoryType: 'travel' as const,
            costNature: 'variable' as const,
            allocatedAmount: Math.round(totalBudget * 0.10), // 10%
            color: '#f59e0b'
          },
          {
            name: intl.formatMessage({ id: 'budget.modal.categories.overhead.name' }),
            description: intl.formatMessage({ id: 'budget.modal.categories.overhead.description' }),
            categoryType: 'overhead' as const,
            costNature: 'fixed' as const,
            allocatedAmount: Math.round(totalBudget * 0.10), // 10%
            color: '#6b7280'
          }
        ];

        try {
          // Create all categories
          await Promise.all(
            defaultCategories.map(category =>
              createCategory.mutateAsync({
                budgetId: newBudget.id,
                data: category
              })
            )
          );
          toast.success(intl.formatMessage({ id: 'budget.modal.success.withCategories' }));
        } catch (categoryError) {
          console.error('Error creating categories:', categoryError);
          toast.success(intl.formatMessage({ id: 'budget.modal.success.partialCategories' }));
        }
      } else {
        toast.success(intl.formatMessage({ id: 'budget.modal.success.created' }));
      }

      reset();
      setSelectedProjectId(undefined);
      setAutoCreateCategories(true);
      onOpenChange(false);
    } catch (error) {
      toast.error(intl.formatMessage({ id: 'budget.modal.error.createFailed' }));
      console.error('Create budget error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'budget.modal.title' })}</DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: 'budget.modal.description' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{intl.formatMessage({ id: 'budget.modal.fields.name.label' })}</Label>
            <Input
              id="name"
              placeholder={intl.formatMessage({ id: 'budget.modal.fields.name.placeholder' })}
              {...register('name', { required: intl.formatMessage({ id: 'budget.modal.fields.name.required' }) })}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{intl.formatMessage({ id: 'budget.modal.fields.description.label' })}</Label>
            <Textarea
              id="description"
              placeholder={intl.formatMessage({ id: 'budget.modal.fields.description.placeholder' })}
              {...register('description')}
              rows={3}
            />
          </div>

          {/* Project Selector - Only show if not already linked to a project */}
          {!projectId && (
            <div className="space-y-2">
              <Label htmlFor="projectId">{intl.formatMessage({ id: 'budget.modal.fields.project.label' })}</Label>
              <Select
                value={selectedProjectId || 'none'}
                onValueChange={(value) => setSelectedProjectId(value === 'none' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={intl.formatMessage({ id: 'budget.modal.fields.project.placeholder' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.modal.fields.project.noProject' })}</span>
                  </SelectItem>
                  {projectsLoading && (
                    <SelectItem value="loading" disabled>
                      <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.modal.fields.project.loading' })}</span>
                    </SelectItem>
                  )}
                  {!projectsLoading && projects.length === 0 && (
                    <SelectItem value="empty" disabled>
                      <span className="text-muted-foreground">{intl.formatMessage({ id: 'budget.modal.fields.project.noProjectsAvailable' })}</span>
                    </SelectItem>
                  )}
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="w-4 h-4" />
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage(
                  { id: 'budget.modal.fields.project.helper' },
                  { count: projects.length }
                )}
              </p>
            </div>
          )}

          {/* Auto-create Categories Checkbox - Only show when project is selected */}
          {selectedProjectId && (
            <div className="flex items-start space-x-3 p-4 rounded-lg border bg-muted/50">
              <Checkbox
                id="autoCreateCategories"
                checked={autoCreateCategories}
                onCheckedChange={(checked) => setAutoCreateCategories(checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="autoCreateCategories" className="cursor-pointer flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">{intl.formatMessage({ id: 'budget.modal.fields.autoCreateCategories.label' })}</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {intl.formatMessage({ id: 'budget.modal.fields.autoCreateCategories.helper' })}
                </p>
              </div>
            </div>
          )}

          {/* Budget Type & Total Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetType">{intl.formatMessage({ id: 'budget.modal.fields.budgetType.label' })}</Label>
              <Select
                value={budgetType}
                onValueChange={(value: any) => setValue('budgetType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">{intl.formatMessage({ id: 'budget.modal.fields.budgetType.options.project' })}</SelectItem>
                  <SelectItem value="task">{intl.formatMessage({ id: 'budget.modal.fields.budgetType.options.task' })}</SelectItem>
                  <SelectItem value="phase">{intl.formatMessage({ id: 'budget.modal.fields.budgetType.options.phase' })}</SelectItem>
                  <SelectItem value="resource">{intl.formatMessage({ id: 'budget.modal.fields.budgetType.options.resource' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalBudget">{intl.formatMessage({ id: 'budget.modal.fields.totalBudget.label' })}</Label>
              <Input
                id="totalBudget"
                type="number"
                step="0.01"
                placeholder={intl.formatMessage({ id: 'budget.modal.fields.totalBudget.placeholder' })}
                {...register('totalBudget', {
                  required: intl.formatMessage({ id: 'budget.modal.fields.totalBudget.required' }),
                  min: { value: 0, message: intl.formatMessage({ id: 'budget.modal.fields.totalBudget.minValue' }) },
                })}
              />
              {errors.totalBudget && (
                <p className="text-sm text-red-500">{errors.totalBudget.message}</p>
              )}
            </div>
          </div>

          {/* Currency & Alert Threshold */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{intl.formatMessage({ id: 'budget.modal.fields.currency.label' })}</Label>
              <Select
                defaultValue="USD"
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

            <div className="space-y-2">
              <Label htmlFor="alertThreshold">{intl.formatMessage({ id: 'budget.modal.fields.alertThreshold.label' })}</Label>
              <Input
                id="alertThreshold"
                type="number"
                placeholder={intl.formatMessage({ id: 'budget.modal.fields.alertThreshold.placeholder' })}
                {...register('alertThreshold', {
                  min: { value: 0, message: intl.formatMessage({ id: 'budget.modal.fields.alertThreshold.validation' }) },
                  max: { value: 100, message: intl.formatMessage({ id: 'budget.modal.fields.alertThreshold.validation' }) },
                })}
              />
              {errors.alertThreshold && (
                <p className="text-sm text-red-500">{errors.alertThreshold.message}</p>
              )}
            </div>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{intl.formatMessage({ id: 'budget.modal.fields.startDate.label' })}</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">{intl.formatMessage({ id: 'budget.modal.fields.endDate.label' })}</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
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
              {intl.formatMessage({ id: 'budget.modal.buttons.cancel' })}
            </Button>
            <Button type="submit" disabled={createBudget.isPending}>
              {createBudget.isPending
                ? intl.formatMessage({ id: 'budget.modal.buttons.creating' })
                : intl.formatMessage({ id: 'budget.modal.buttons.create' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
