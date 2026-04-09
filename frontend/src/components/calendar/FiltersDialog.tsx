import { useState } from 'react'
import { useIntl } from 'react-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '../ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '../ui/input'
import { Separator } from '@/components/ui/separator'
import type { CalendarFilter, EventPriority, EventStatus } from '../../types/calendar'
import { useCalendarStore } from '../../stores/calendarStore'
import { useEventCategories } from '../../lib/api/calendar-api'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { Badge } from '@/components/ui/badge'

interface FiltersDialogProps {
  open: boolean
  onClose: () => void
}

export function FiltersDialog({ open, onClose }: FiltersDialogProps) {
  const intl = useIntl()
  const { filters, updateFilters, resetFilters } = useCalendarStore()
  const { currentWorkspace } = useWorkspace()
  const { data: categories = [] } = useEventCategories(currentWorkspace?.id || '')
  const [localFilters, setLocalFilters] = useState<CalendarFilter>(filters)

  const priorities: EventPriority[] = ['low', 'normal', 'high', 'urgent']
  const statuses: EventStatus[] = ['confirmed', 'tentative', 'cancelled', 'pending']

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...localFilters.categories, categoryId]
      : localFilters.categories.filter(id => id !== categoryId)
    
    setLocalFilters({ ...localFilters, categories: newCategories })
  }

  const handlePriorityToggle = (priority: EventPriority, checked: boolean) => {
    const newPriorities = checked
      ? [...localFilters.priorities, priority]
      : localFilters.priorities.filter(p => p !== priority)
    
    setLocalFilters({ ...localFilters, priorities: newPriorities })
  }

  const handleStatusToggle = (status: EventStatus, checked: boolean) => {
    const newStatuses = checked
      ? [...localFilters.statuses, status]
      : localFilters.statuses.filter(s => s !== status)
    
    setLocalFilters({ ...localFilters, statuses: newStatuses })
  }

  const handleTagAdd = (tag: string) => {
    if (tag.trim() && !localFilters.tags?.includes(tag.trim())) {
      setLocalFilters({
        ...localFilters,
        tags: [...(localFilters.tags || []), tag.trim()]
      })
    }
  }

  const handleTagRemove = (tag: string) => {
    setLocalFilters({
      ...localFilters,
      tags: localFilters.tags?.filter(t => t !== tag) || []
    })
  }

  const handleApplyFilters = () => {
    updateFilters(localFilters)
    onClose()
  }

  const handleResetFilters = () => {
    const resetFiltersData: CalendarFilter = {
      categories: [],
      attendees: [],
      priorities: [],
      statuses: [],
      tags: [],
      searchQuery: '',
      showDeclinedEvents: false,
      showCancelledEvents: false,
      showPrivateEvents: true,
    }
    resetFilters()
    setLocalFilters(resetFiltersData)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (localFilters.categories.length > 0) count++
    if (localFilters.priorities.length > 0) count++
    if (localFilters.statuses.length > 0) count++
    if (localFilters.tags && localFilters.tags.length > 0) count++
    if (localFilters.searchQuery) count++
    if (localFilters.dateRange) count++
    return count
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{intl.formatMessage({ id: 'modules.calendar.filtersDialog.title' })}</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">
                {intl.formatMessage({ id: 'modules.calendar.filtersDialog.activeFilters' }, { count: getActiveFiltersCount() })}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Categories */}
          <div>
            <Label className="text-base font-medium">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.categories' })}</Label>
            <div className="mt-2 space-y-2">
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={localFilters.categories.includes(category.id)}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category.id, checked as boolean)
                    }
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <Label htmlFor={`category-${category.id}`}>
                      {category.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Priorities */}
          <div>
            <Label className="text-base font-medium">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.priorities' })}</Label>
            <div className="mt-2 space-y-2">
              {priorities.map(priority => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={localFilters.priorities.includes(priority)}
                    onCheckedChange={(checked) =>
                      handlePriorityToggle(priority, checked as boolean)
                    }
                  />
                  <Label htmlFor={`priority-${priority}`} className="capitalize">
                    {intl.formatMessage({ id: `modules.calendar.filtersDialog.priority.${priority}` })}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div>
            <Label className="text-base font-medium">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.status' })}</Label>
            <div className="mt-2 space-y-2">
              {statuses.map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={localFilters.statuses.includes(status)}
                    onCheckedChange={(checked) =>
                      handleStatusToggle(status, checked as boolean)
                    }
                  />
                  <Label htmlFor={`status-${status}`} className="capitalize">
                    {intl.formatMessage({ id: `modules.calendar.filtersDialog.statusValue.${status}` })}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <Label className="text-base font-medium">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.tags' })}</Label>
            <div className="mt-2">
              {localFilters.tags && localFilters.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {localFilters.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleTagRemove(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                placeholder={intl.formatMessage({ id: 'modules.calendar.filtersDialog.addTagPlaceholder' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTagAdd(e.currentTarget.value)
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Display Options */}
          <div>
            <Label className="text-base font-medium">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.displayOptions' })}</Label>
            <div className="mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-declined">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.showDeclinedEvents' })}</Label>
                <Switch
                  id="show-declined"
                  checked={localFilters.showDeclinedEvents}
                  onCheckedChange={(checked) =>
                    setLocalFilters({ ...localFilters, showDeclinedEvents: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-cancelled">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.showCancelledEvents' })}</Label>
                <Switch
                  id="show-cancelled"
                  checked={localFilters.showCancelledEvents}
                  onCheckedChange={(checked) =>
                    setLocalFilters({ ...localFilters, showCancelledEvents: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-private">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.showPrivateEvents' })}</Label>
                <Switch
                  id="show-private"
                  checked={localFilters.showPrivateEvents}
                  onCheckedChange={(checked) =>
                    setLocalFilters({ ...localFilters, showPrivateEvents: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div>
            <Label className="text-base font-medium">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.dateRange' })}</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start-date" className="text-sm">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.dateFrom' })}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={localFilters.dateRange?.start ?
                    localFilters.dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    setLocalFilters({
                      ...localFilters,
                      dateRange: date ? {
                        start: date,
                        end: localFilters.dateRange?.end || new Date()
                      } : undefined
                    })
                  }}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm">{intl.formatMessage({ id: 'modules.calendar.filtersDialog.dateTo' })}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={localFilters.dateRange?.end ?
                    localFilters.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    setLocalFilters({
                      ...localFilters,
                      dateRange: date ? {
                        start: localFilters.dateRange?.start || new Date(),
                        end: date
                      } : undefined
                    })
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleResetFilters}>
            {intl.formatMessage({ id: 'modules.calendar.filtersDialog.reset' })}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {intl.formatMessage({ id: 'modules.calendar.filtersDialog.cancel' })}
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="btn-gradient-primary border-0"
            >
              {intl.formatMessage({ id: 'modules.calendar.filtersDialog.applyFilters' })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}