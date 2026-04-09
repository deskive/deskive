import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { TaskType } from '@/types/tasks'
import type { Task } from '@/lib/api/projects-api'
import { format, isAfter, isToday } from 'date-fns'

// Per-task custom field type
interface TaskCustomField {
  id: string
  name: string
  fieldType: string
  value: any
  options?: Array<{ id: string; label: string; color?: string }>
}

interface TaskListViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Helper function to format per-task custom field values for display
  const formatCustomFieldValue = (field: TaskCustomField): string => {
    const { fieldType, value, options } = field
    if (value === null || value === undefined || value === '') return '-'

    switch (fieldType) {
      case 'checkbox':
        return value ? '✓' : '✗'
      case 'date':
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return String(value)
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)
      case 'select':
        const selectOption = options?.find(opt => opt.id === value)
        return selectOption?.label || String(value)
      case 'multi_select':
        if (Array.isArray(value)) {
          const labels = value.map(v => {
            const opt = options?.find(o => o.id === v)
            return opt?.label || v
          })
          return labels.join(', ')
        }
        return String(value)
      default:
        return String(value)
    }
  }

  // Get option color for select fields from per-task custom field
  const getOptionColor = (field: TaskCustomField): string | undefined => {
    const { fieldType, value, options } = field
    if (fieldType === 'select') {
      const option = options?.find(opt => opt.id === value)
      return option?.color
    }
    return undefined
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const toggleAllTasks = () => {
    if (selectedTasks.length === sortedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(sortedTasks.map(task => task.id))
    }
  }

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'priority':
        const priorityOrder: { [key: string]: number } = { urgent: 4, high: 3, medium: 2, low: 1 }
        aValue = priorityOrder[a.priority] || 0
        bValue = priorityOrder[b.priority] || 0
        break
      case 'dueDate':
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
        break
      case 'assignee':
        aValue = a.assignee?.name || ''
        bValue = b.assignee?.name || ''
        break
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      default:
        aValue = a.createdAt
        bValue = b.createdAt
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const getTaskTypeIcon = (type?: TaskType) => {
    switch (type) {
      case TaskType.BUG: return '🐛'
      case TaskType.STORY: return '📖'
      case TaskType.EPIC: return '🎯'
      case TaskType.TASK: return '✓'
      case TaskType.SUBTASK: return '📝'
      case TaskType.FEATURE_REQUEST: return '⚡'
      default: return '📋'
    }
  }

  const getTaskTypeColor = (type?: TaskType) => {
    switch (type) {
      case TaskType.BUG: return 'bg-red-200/50 text-red-900'
      case TaskType.STORY: return 'bg-blue-200/50 text-blue-900'
      case TaskType.EPIC: return 'bg-purple-200/50 text-purple-900'
      case TaskType.TASK: return 'bg-green-200/50 text-green-900'
      case TaskType.SUBTASK: return 'bg-neutral-200/50 text-neutral-900'
      case TaskType.FEATURE_REQUEST: return 'bg-orange-200/50 text-orange-900'
      default: return 'bg-neutral-200/50 text-neutral-900'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ArrowUp className="w-4 h-4 text-red-500" />
      case 'medium': return <Minus className="w-4 h-4 text-yellow-500" />
      case 'low': return <ArrowDown className="w-4 h-4 text-green-500" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-blue-200/50 text-blue-900'
      case 'in_progress': return 'bg-yellow-200/50 text-yellow-900'
      case 'review': return 'bg-purple-200/50 text-purple-900'
      case 'completed': return 'bg-green-200/50 text-green-900'
      default: return 'bg-neutral-200/50 text-neutral-900'
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
          <p className="text-muted-foreground">
            Get started by creating your first task
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="flex-shrink-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedTasks.length === sortedTasks.length && sortedTasks.length > 0}
                    onCheckedChange={toggleAllTasks}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 p-0 font-semibold"
                    onClick={() => handleSort('title')}
                  >
                    Task
                    <SortIcon field="title" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 p-0 font-semibold"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <SortIcon field="status" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 p-0 font-semibold"
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                    <SortIcon field="priority" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 p-0 font-semibold"
                    onClick={() => handleSort('assignee')}
                  >
                    Assignee
                    <SortIcon field="assignee" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-8 p-0 font-semibold"
                    onClick={() => handleSort('dueDate')}
                  >
                    Due Date
                    <SortIcon field="dueDate" />
                  </Button>
                </TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Custom Fields</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableBody>
              {sortedTasks.map(task => {
                const isOverdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'completed'
                const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

                return (
                  <TableRow
                    key={task.id}
                    className={`cursor-pointer hover:bg-neutral-200/50 ${
                      selectedTasks.includes(task.id)
                        ? 'bg-neutral-200/70'
                        : ''
                    } ${
                      isOverdue
                        ? 'bg-red-200/30'
                        : isDueToday
                        ? 'bg-yellow-200/30'
                        : ''
                    }`}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => {
                          toggleTaskSelection(task.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getTaskTypeColor(undefined)}`}>
                            {getTaskTypeIcon(undefined)}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {task.id.substring(0, 8)}
                          </span>
                        </div>
                        <p className="font-medium line-clamp-1">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(task.priority)}
                        <span className="text-sm">{task.priority.toUpperCase()}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {task.assignee && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={task.assignee.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.name?.split(' ').map(n => n[0]).join('') ||
                               task.assignee.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{task.assignee.name || task.assignee.email}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {task.dueDate && (
                        <div className={`text-sm ${
                          isOverdue ? 'text-red-600' : isDueToday ? 'text-yellow-600' : 'text-muted-foreground'
                        }`}>
                          {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {task.comments && task.comments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs">{task.comments.length}</span>
                          </div>
                        )}
                        {task.attachments && task.attachments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="w-4 h-4" />
                            <span className="text-xs">{task.attachments.length}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Custom Fields Column (per-task) */}
                    <TableCell>
                      {(task as any).custom_fields && Array.isArray((task as any).custom_fields) && (task as any).custom_fields.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {((task as any).custom_fields as TaskCustomField[])
                            .filter(field => field.value !== undefined && field.value !== null && field.value !== '')
                            .slice(0, 3) // Show max 3 custom fields in table
                            .map(field => {
                              const displayValue = formatCustomFieldValue(field)
                              const optionColor = getOptionColor(field)

                              return (
                                <div
                                  key={field.id}
                                  className="flex items-center gap-1 text-xs"
                                  title={`${field.name}: ${displayValue}`}
                                >
                                  <span className="text-muted-foreground">{field.name}:</span>
                                  {optionColor ? (
                                    <span
                                      className="px-1.5 py-0.5 rounded font-medium"
                                      style={{ backgroundColor: `${optionColor}20`, color: optionColor }}
                                    >
                                      {displayValue}
                                    </span>
                                  ) : (
                                    <span className="font-medium truncate max-w-[80px]">{displayValue}</span>
                                  )}
                                </div>
                              )
                            })}
                          {((task as any).custom_fields as TaskCustomField[]).filter(field => field.value !== undefined && field.value !== null && field.value !== '').length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{((task as any).custom_fields as TaskCustomField[]).filter(field => field.value !== undefined && field.value !== null && field.value !== '').length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
