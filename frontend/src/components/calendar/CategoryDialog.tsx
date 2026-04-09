import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useIntl } from 'react-intl'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'

import type { EventCategory } from '../../types/calendar'
import { useCreateEventCategory, useUpdateEventCategory, useDeleteEventCategory } from '../../lib/api/calendar-api'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { ConfirmationDialog } from '../shared'
import { Trash2, Palette } from 'lucide-react'
import { toast } from 'sonner'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().min(1, 'Color is required'),
  icon: z.string().optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryDialogProps {
  open: boolean
  onClose: () => void
  category?: EventCategory | null
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#78716c', // stone
]

const DEFAULT_ICONS = [
  '📅', '💼', '🏠', '🎯', '🏥', '🎓', '✈️', '🍽️', '🎉', '💪'
]

export function CategoryDialog({ open, onClose, category }: CategoryDialogProps) {
  const intl = useIntl()
  const { currentWorkspace } = useWorkspace()
  const createCategory = useCreateEventCategory()
  const updateCategory = useUpdateEventCategory()
  const deleteCategory = useDeleteEventCategory()
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const isEdit = !!category

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: DEFAULT_COLORS[0],
      icon: '',
    },
  })

  // Update form and state when category changes
  useEffect(() => {
    if (category) {
      // Editing mode - populate with existing data
      form.reset({
        name: category.name,
        description: category.description || '',
        color: category.color,
        icon: category.icon || '',
      })
      setSelectedColor(category.color)
      setSelectedIcon(category.icon || '')
    } else {
      // Create mode - reset to defaults
      form.reset({
        name: '',
        description: '',
        color: DEFAULT_COLORS[0],
        icon: '',
      })
      setSelectedColor(DEFAULT_COLORS[0])
      setSelectedIcon('')
    }
  }, [category, form])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay to ensure dialog close animation completes
      setTimeout(() => {
        form.reset({
          name: '',
          description: '',
          color: DEFAULT_COLORS[0],
          icon: '',
        })
        setSelectedColor(DEFAULT_COLORS[0])
        setSelectedIcon('')
      }, 150)
    }
  }, [open, form])

  const onSubmit = async (data: CategoryFormData) => {
    if (!currentWorkspace) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.categoryDialog.errors.noWorkspace' }))
      return
    }

    const categoryData = {
      name: data.name,
      description: data.description,
      color: selectedColor,
      icon: selectedIcon || undefined,
    }

    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({
          workspaceId: currentWorkspace.id,
          categoryId: category.id,
          data: categoryData
        })
        toast.success(intl.formatMessage({ id: 'modules.calendar.categoryDialog.toast.updateSuccess' }, { name: categoryData.name }))
      } else {
        await createCategory.mutateAsync({
          workspaceId: currentWorkspace.id,
          data: categoryData
        })
        toast.success(intl.formatMessage({ id: 'modules.calendar.categoryDialog.toast.createSuccess' }, { name: categoryData.name }))
      }
      onClose()
    } catch (error: any) {
      console.error('Failed to save category:', error)
      const action = isEdit ? intl.formatMessage({ id: 'modules.calendar.categoryDialog.actions.update' }) : intl.formatMessage({ id: 'modules.calendar.categoryDialog.actions.create' })
      toast.error(intl.formatMessage({ id: 'modules.calendar.categoryDialog.errors.saveFailed' }, { action, error: error.message || intl.formatMessage({ id: 'modules.calendar.categoryDialog.errors.unknown' }) }))
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (category && currentWorkspace) {
      try {
        await deleteCategory.mutateAsync({
          workspaceId: currentWorkspace.id,
          categoryId: category.id
        })
        toast.success(intl.formatMessage({ id: 'modules.calendar.categoryDialog.toast.deleteSuccess' }, { name: category.name }))
        setShowDeleteDialog(false)
        onClose()
      } catch (error: any) {
        console.error('Failed to delete category:', error)
        toast.error(intl.formatMessage({ id: 'modules.calendar.categoryDialog.errors.deleteFailed' }, { error: error.message || intl.formatMessage({ id: 'modules.calendar.categoryDialog.errors.unknown' }) }))
        setShowDeleteDialog(false)
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? intl.formatMessage({ id: 'modules.calendar.categoryDialog.title.edit' }) : intl.formatMessage({ id: 'modules.calendar.categoryDialog.title.create' })}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
            <div className="overflow-y-auto flex-1 px-1 space-y-6 max-h-[calc(90vh-200px)]">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.formatMessage({ id: 'modules.calendar.categoryDialog.fields.name' })}</FormLabel>
                  <FormControl>
                    <Input placeholder={intl.formatMessage({ id: 'modules.calendar.categoryDialog.placeholders.name' })} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.formatMessage({ id: 'modules.calendar.categoryDialog.fields.description' })}</FormLabel>
                  <FormControl>
                    <Input placeholder={intl.formatMessage({ id: 'modules.calendar.categoryDialog.placeholders.description' })} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4" />
                {intl.formatMessage({ id: 'modules.calendar.categoryDialog.fields.color' })}
              </FormLabel>
              <div className="grid grid-cols-5 gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color 
                        ? 'border-foreground scale-110' 
                        : 'border-muted hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSelectedColor(color)
                      form.setValue('color', color)
                    }}
                  />
                ))}
              </div>
              
              <div className="mt-3">
                <Input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value)
                    form.setValue('color', e.target.value)
                  }}
                  className="w-full h-10"
                />
              </div>
            </div>

            <div>
              <FormLabel className="mb-3 block">{intl.formatMessage({ id: 'modules.calendar.categoryDialog.fields.icon' })}</FormLabel>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {DEFAULT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`w-8 h-8 rounded border text-lg flex items-center justify-center transition-all ${
                      selectedIcon === icon 
                        ? 'border-primary bg-primary/10 scale-110' 
                        : 'border-muted hover:border-primary hover:scale-105'
                    }`}
                    onClick={() => {
                      setSelectedIcon(icon)
                      form.setValue('icon', icon)
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <Input
                placeholder={intl.formatMessage({ id: 'modules.calendar.categoryDialog.placeholders.customEmoji' })}
                value={selectedIcon}
                onChange={(e) => {
                  setSelectedIcon(e.target.value)
                  form.setValue('icon', e.target.value)
                }}
                className="text-center"
                maxLength={2}
              />
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4">
              <div className="text-sm font-medium mb-2">{intl.formatMessage({ id: 'modules.calendar.categoryDialog.preview.title' })}</div>
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-lg">{selectedIcon}</span>
                <span className="font-medium">{form.watch('name') || intl.formatMessage({ id: 'modules.calendar.categoryDialog.preview.defaultName' })}</span>
              </div>
            </div>
            </div>

            <DialogFooter className="flex items-center justify-between pt-4 mt-4 border-t">
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={deleteCategory.isPending}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteCategory.isPending ? intl.formatMessage({ id: 'modules.calendar.categoryDialog.buttons.deleting' }) : intl.formatMessage({ id: 'modules.calendar.categoryDialog.buttons.delete' })}
                </Button>
              )}

              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose}>
                  {intl.formatMessage({ id: 'modules.calendar.categoryDialog.buttons.cancel' })}
                </Button>
                <Button
                  type="submit"
                  disabled={createCategory.isPending || updateCategory.isPending}
                  className="btn-gradient-primary border-0"
                >
                  {(createCategory.isPending || updateCategory.isPending)
                    ? intl.formatMessage({ id: 'modules.calendar.categoryDialog.buttons.saving' })
                    : isEdit ? intl.formatMessage({ id: 'modules.calendar.categoryDialog.buttons.update' }) : intl.formatMessage({ id: 'modules.calendar.categoryDialog.buttons.create' })
                  }
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={intl.formatMessage({ id: 'modules.calendar.categoryDialog.deleteDialog.title' })}
        description={intl.formatMessage({ id: 'modules.calendar.categoryDialog.deleteDialog.description' }, { name: category?.name })}
        confirmText={intl.formatMessage({ id: 'modules.calendar.categoryDialog.deleteDialog.confirm' })}
        onConfirm={handleConfirmDelete}
        isLoading={deleteCategory.isPending}
        variant="destructive"
      />
    </>
  )
}