import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useIntl } from 'react-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Users,
  Clock,
  LayoutGrid,
  List as ListIcon,
  TrendingUp,
  Plus,
  ArrowLeft,
  MoreVertical,
  Circle,
  CheckCircle2,
  PlayCircle,
  Settings,
  Filter,
  Trash2,
  DollarSign
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService, type Task, useDeleteTask, projectKeys } from '@/lib/api/projects-api'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { TaskListView } from './task-list-view'
import { TimelineView } from './timeline-view'
import { GanttView } from './gantt-view'
import { TeamView } from './team-view'
import { ProjectBudgets } from './ProjectBudgets'
import { CreateTaskModal } from './create-task-modal'
import { TaskDetailModal } from './task-detail-modal'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'

interface UnifiedTaskViewProps {
  projectId: string
  workspaceId: string
  initialView?: string
  onAddTask?: (status?: 'todo' | 'in_progress' | 'review' | 'completed') => void
  onBack?: () => void
}

export function UnifiedTaskView({
  projectId,
  workspaceId,
  initialView = 'board',
  onAddTask,
  onBack
}: UnifiedTaskViewProps) {
  const [currentView, setCurrentView] = useState(initialView)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL')
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high' | 'ALL'>('ALL')
  // Track optimistic status changes locally to prevent flicker
  const [optimisticStatusChanges, setOptimisticStatusChanges] = useState<Record<string, string>>({})
  // Track card positions for drawing connections
  const [cardPositions, setCardPositions] = useState<Record<string, DOMRect>>({})
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragAnimationFrameRef = useRef<number | null>(null)
  // Delete task dialog state
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  // Edit task state
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false)
  // View task detail state
  const [taskToView, setTaskToView] = useState<Task | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const { members } = useWorkspace()
  const intl = useIntl()

  // Check user permissions for budgets
  const userRole = useMemo(() => {
    const currentUserMembership = members.find(m => m.user_id === user?.id);
    return currentUserMembership?.role || 'member';
  }, [members, user?.id]);

  const canManageBudgets = userRole === 'admin' || userRole === 'owner';

  // Delete task mutation
  const deleteTaskMutation = useDeleteTask()

  const { data: projectResponse, isLoading: projectLoading } = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectService.getProject(workspaceId, projectId),
    enabled: !!projectId && !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  })

  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: () => projectService.getTasks(workspaceId, projectId),
    enabled: !!projectId && !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  })

  const project = projectResponse
  const apiTasks = tasksResponse || []
  const isLoading = projectLoading || tasksLoading

  // Map API response (snake_case) to Task interface (camelCase) - memoized to prevent flicker
  // Use optimistic status if available, otherwise use API status
  const tasks: Task[] = useMemo(() =>
    apiTasks.map((apiTask: any) => ({
      id: apiTask.id,
      projectId: apiTask.project_id,
      title: apiTask.title,
      description: apiTask.description,
      status: optimisticStatusChanges[apiTask.id] || apiTask.status,
      priority: apiTask.priority,
      // Use the new assignees array with user details if available, otherwise fallback to assigned_to
      assignees: apiTask.assignees || (apiTask.assigned_to ? [apiTask.assigned_to] : []),
      assignee: apiTask.assigned_to ? { id: apiTask.assigned_to, email: apiTask.assigned_to, name: apiTask.assigned_to } : undefined,
      assigneeId: apiTask.assigned_to,
      dueDate: apiTask.due_date,
      estimatedHours: apiTask.estimated_hours ? parseFloat(apiTask.estimated_hours) : undefined,
      actualHours: apiTask.actual_hours ? parseFloat(apiTask.actual_hours) : undefined,
      tags: apiTask.labels || [],
      attachments: apiTask.attachments || [],
      subtasks: [], // Will be populated when subtasks are available from API
      dependencies: [],
      comments: [],
      createdAt: apiTask.created_at,
      updatedAt: apiTask.updated_at,
      completedAt: apiTask.completed_at,
      parentTaskId: apiTask.parent_task_id, // Add parent task relationship
      // Include updated_by_user and created_by_user from backend
      updated_by_user: apiTask.updated_by_user,
      created_by_user: apiTask.created_by_user,
      // Per-task custom fields (array of TaskCustomField)
      custom_fields: apiTask.custom_fields || [],
    } as any)),
    [apiTasks, optimisticStatusChanges]
  )

  // Debug: Log project data to verify kanban_stages (only on mount or when project changes)
  useEffect(() => {
    if (project) {
      console.log('Project data:', project)
      console.log('Kanban stages:', project?.kanban_stages)
      console.log('Tasks from API:', tasks)
    }
  }, [project?.id, tasks.length])

  const viewOptions = [
    { value: 'board', label: intl.formatMessage({ id: 'tasks.boardView' }), icon: LayoutGrid },
    { value: 'list', label: intl.formatMessage({ id: 'tasks.listView' }), icon: ListIcon },
    { value: 'timeline', label: intl.formatMessage({ id: 'tasks.timelineView' }), icon: Clock },
    { value: 'gantt', label: intl.formatMessage({ id: 'tasks.ganttChart' }), icon: TrendingUp },
    { value: 'team', label: intl.formatMessage({ id: 'tasks.teamView' }), icon: Users },
    { value: 'budgets', label: 'Budgets', icon: DollarSign }
  ]

  const getCurrentViewName = () => {
    const view = viewOptions.find(v => v.value === currentView)
    return view ? view.label : intl.formatMessage({ id: 'tasks.boardView' })
  }

  const handleAddTask = () => {
    if (onAddTask) {
      onAddTask()
    }
  }

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack()
    }
  }

  // Filter tasks - memoized to prevent unnecessary re-renders
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesAssignee = selectedAssignee === 'ALL' || task.assigneeId === selectedAssignee
      const matchesPriority = selectedPriority === 'ALL' || task.priority === selectedPriority
      return matchesSearch && matchesAssignee && matchesPriority
    })
  }, [tasks, searchTerm, selectedAssignee, selectedPriority])

  // Function to update card positions - defined here so it has access to filteredTasks
  const updatePositions = useCallback(() => {
    const positions: Record<string, DOMRect> = {}

    // Create a set of visible task IDs for quick lookup
    const visibleTaskIds = new Set(filteredTasks.map(t => t.id))

    Object.entries(cardRefs.current).forEach(([taskId, element]) => {
      // Only store positions for visible tasks
      if (element && visibleTaskIds.has(taskId)) {
        positions[taskId] = element.getBoundingClientRect()
      }
    })

    setCardPositions(positions)
  }, [filteredTasks])

  // Continuous position updates during drag
  const startDragUpdates = useCallback(() => {
    const updateLoop = () => {
      if (isDraggingRef.current) {
        updatePositions()
        dragAnimationFrameRef.current = requestAnimationFrame(updateLoop)
      }
    }
    updateLoop()
  }, [updatePositions])

  const stopDragUpdates = useCallback(() => {
    isDraggingRef.current = false
    if (dragAnimationFrameRef.current) {
      cancelAnimationFrame(dragAnimationFrameRef.current)
      dragAnimationFrameRef.current = null
    }
    // Final update after drag ends
    requestAnimationFrame(updatePositions)
  }, [updatePositions])

  // Update card positions for drawing connections
  useEffect(() => {
    // Debounce to prevent excessive updates
    const timeout = setTimeout(() => {
      requestAnimationFrame(updatePositions)
    }, 100)

    return () => {
      clearTimeout(timeout)
    }
  }, [filteredTasks, currentView, updatePositions])

  // Handle resize events separately
  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(updatePositions)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [updatePositions])

  // Identify parent-child task relationships - only for filtered/visible tasks
  const taskConnections = useMemo(() => {
    const connections: Array<{ parentId: string; childId: string }> = []

    // Create a set of visible task IDs for quick lookup
    const visibleTaskIds = new Set(filteredTasks.map(t => t.id))

    filteredTasks.forEach(task => {
      const parentTaskId = (task as any).parentTaskId
      // Only create connection if both parent and child are visible
      if (parentTaskId && visibleTaskIds.has(parentTaskId)) {
        connections.push({
          parentId: parentTaskId,
          childId: task.id
        })
      }
    })

    return connections
  }, [filteredTasks])

  // Group tasks by status for Kanban board - use dynamic stages from project
  const kanbanColumns = project?.kanban_stages && project.kanban_stages.length > 0
    ? project.kanban_stages
        .sort((a, b) => a.order - b.order)
        .map(stage => ({
          id: stage.id,
          title: stage.name,
          status: stage.id,
          color: stage.color,
        }))
    : [
        { id: 'todo', title: 'To Do', status: 'todo', color: '#3B82F6' },
        { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: '#EAB308' },
        { id: 'review', title: 'Review', status: 'review', color: '#A855F7' },
        { id: 'completed', title: 'Done', status: 'completed', color: '#22C55E' }
      ]

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950 border border-red-200 dark:border-red-900'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900'
      case 'low':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-950 border border-green-200 dark:border-green-900'
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />
      case 'in_progress': return <PlayCircle className="w-4 h-4" />
      case 'review': return <Clock className="w-4 h-4" />
      default: return <Circle className="w-4 h-4" />
    }
  }

  // Update task mutation - simplified since optimistic update is handled in onDragEnd
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: string; newStatus: string }) =>
      projectService.updateTask(workspaceId, taskId, { status: newStatus as any }),
    onSuccess: () => {
      // Invalidate projects list to update dashboard stats
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })

  const onDragStart = () => {
    isDraggingRef.current = true
    startDragUpdates()
  }

  const onDragEnd = (result: any) => {
    // Stop continuous updates
    stopDragUpdates()

    if (!result.destination) return

    const { source, destination, draggableId } = result

    // If dropped in the same position, do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const newStatus = destination.droppableId
    const oldStatus = source.droppableId

    // IMMEDIATELY update optimistic state - this prevents any flicker
    setOptimisticStatusChanges(prev => ({
      ...prev,
      [draggableId]: newStatus
    }))

    // Also update cache for consistency
    const previousTasks = queryClient.getQueryData<any[]>(projectKeys.tasks(projectId))
    queryClient.setQueryData<any[]>(projectKeys.tasks(projectId), (old) => {
      if (!old) return old
      return old.map((apiTask: any) =>
        apiTask.id === draggableId ? {
          ...apiTask,
          status: newStatus,
          // Optimistically update the updated_by_user field with current user
          updated_by_user: user ? {
            id: user.id,
            name: user.metadata?.name || user.name || user.username || user.email || 'Unknown User',
            email: user.email,
            avatar_url: user.metadata?.avatarUrl || user.avatarUrl || null
          } : apiTask.updated_by_user
        } : apiTask
      )
    })

    // Call mutation - it will handle API call and rollback on error
    updateTaskMutation.mutate(
      { taskId: draggableId, newStatus },
      {
        onSuccess: () => {
          // Clear optimistic state on success - let API data take over
          setOptimisticStatusChanges(prev => {
            const updated = { ...prev }
            delete updated[draggableId]
            return updated
          })
        },
        onError: (error) => {
          // Rollback optimistic state on error
          setOptimisticStatusChanges(prev => {
            const updated = { ...prev }
            delete updated[draggableId]
            return updated
          })

          // Rollback cache to previous state
          if (previousTasks) {
            queryClient.setQueryData(projectKeys.tasks(projectId), previousTasks)
          }

          toast({
            title: 'Error',
            description: 'Failed to update task status. Changes have been reverted.',
            variant: 'destructive'
          })
        }
      }
    )
  }

  // Calculate task progress based on current stage / total stages
  const getTaskProgress = (task: Task) => {
    const currentStage = kanbanColumns.findIndex(col => col.status === task.status)
    if (currentStage === -1) return 0
    const totalStages = kanbanColumns.length
    return Math.round(((currentStage + 1) / totalStages) * 100)
  }

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setEditTaskModalOpen(true)
  }

  // Handle view task details
  const handleViewTask = (task: Task) => {
    setTaskToView(task)
    setDetailModalOpen(true)
  }

  // Handle delete task
  const handleDeleteTask = (task: Task) => {
    setTaskToDelete({ id: task.id, title: task.title })
    setDeleteDialogOpen(true)
  }

  const confirmDeleteTask = () => {
    if (!taskToDelete) return

    deleteTaskMutation.mutate(
      { workspaceId, taskId: taskToDelete.id, projectId },
      {
        onSuccess: () => {
          toast({
            title: intl.formatMessage({ id: 'tasks.taskDeleted' }),
            description: intl.formatMessage({ id: 'tasks.taskDeletedSuccess' }, { title: taskToDelete.title }),
          })
          setDeleteDialogOpen(false)
          setTaskToDelete(null)
        },
        onError: (error: any) => {
          toast({
            title: intl.formatMessage({ id: 'common.error' }),
            description: error.message || intl.formatMessage({ id: 'common.error' }),
            variant: 'destructive',
          })
        }
      }
    )
  }

  // Check if a line segment intersects with a rectangle
  const lineIntersectsRect = (x1: number, y1: number, x2: number, y2: number, rect: DOMRect, containerRect: DOMRect) => {
    const rectLeft = rect.left - containerRect.left
    const rectTop = rect.top - containerRect.top
    const rectRight = rect.right - containerRect.left
    const rectBottom = rect.bottom - containerRect.top

    // Add padding around cards
    const padding = 10
    const expandedRect = {
      left: rectLeft - padding,
      top: rectTop - padding,
      right: rectRight + padding,
      bottom: rectBottom + padding
    }

    // Check if line passes through the expanded rectangle
    // Simple AABB (Axis-Aligned Bounding Box) intersection test
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)

    return !(maxX < expandedRect.left || minX > expandedRect.right ||
             maxY < expandedRect.top || minY > expandedRect.bottom)
  }

  // Generate SVG path for connection between parent and child cards with smart routing
  const generateConnectionPath = (
    parentRect: DOMRect,
    childRect: DOMRect,
    containerRect: DOMRect,
    parentId: string,
    childId: string
  ) => {
    // Calculate positions relative to container
    const parentRight = parentRect.right - containerRect.left
    const parentBottom = parentRect.bottom - containerRect.top
    const parentTop = parentRect.top - containerRect.top
    const parentCenterY = parentTop + parentRect.height / 2

    const childLeft = childRect.left - containerRect.left
    const childBottom = childRect.bottom - containerRect.top
    const childTop = childRect.top - containerRect.top
    const childCenterY = childTop + childRect.height / 2

    // Get all card rectangles to avoid (including parent and child)
    const obstacles: DOMRect[] = []
    Object.entries(cardPositions).forEach(([taskId, rect]) => {
      obstacles.push(rect)
    })

    // Use orthogonal (right-angle) routing - prefer routing from below
    const horizontalGap = 20
    const verticalGap = 15

    // Start from parent right edge center
    const startX = parentRight
    const startY = parentCenterY

    // End at child left edge center
    const endX = childLeft
    const endY = childCenterY

    const waypoints: Array<{ x: number; y: number }> = []

    // Calculate the lowest card bottom to route below - only consider cards that are BETWEEN parent and child
    // Exclude cards in the parent and child columns themselves to prevent unnecessary extension
    const parentColumnLeft = parentRect.left - containerRect.left
    const parentColumnRight = parentRect.right - containerRect.left
    const childColumnLeft = childRect.left - containerRect.left
    const childColumnRight = childRect.right - containerRect.left

    // Find cards that are between the parent and child columns (in the path of the connection)
    const relevantObstacles = obstacles.filter(rect => {
      const rectLeft = rect.left - containerRect.left
      const rectRight = rect.right - containerRect.left
      const rectCenterX = (rectLeft + rectRight) / 2

      // Exclude cards in the parent column (same horizontal position as parent)
      const isInParentColumn = Math.abs(rectCenterX - (parentColumnLeft + parentColumnRight) / 2) < 20

      // Exclude cards in the child column (same horizontal position as child)
      const isInChildColumn = Math.abs(rectCenterX - (childColumnLeft + childColumnRight) / 2) < 20

      // Only include cards that are horizontally between parent and child columns
      const isBetween = rectCenterX > parentColumnRight && rectCenterX < childColumnLeft

      return isBetween && !isInParentColumn && !isInChildColumn
    })

    // If no obstacles in between, route just below the parent and child cards
    const allCardsBottom = relevantObstacles.length > 0
      ? Math.max(...relevantObstacles.map(r => r.bottom - containerRect.top))
      : Math.max(parentBottom, childBottom)
    const routingY = allCardsBottom + verticalGap

    // Strategy: Route from below to avoid all cards
    // 1. Exit parent card horizontally
    waypoints.push({ x: startX + horizontalGap, y: startY })

    // 2. Go down to routing level (below all cards)
    waypoints.push({ x: startX + horizontalGap, y: routingY })

    // 3. Move horizontally below all cards
    waypoints.push({ x: endX - horizontalGap, y: routingY })

    // 4. Come up to child card level
    waypoints.push({ x: endX - horizontalGap, y: endY })

    // Build the SVG path with smooth corners
    let path = `M ${startX} ${startY}`

    // Create path with rounded corners
    const cornerRadius = 8
    for (let i = 0; i < waypoints.length; i++) {
      const point = waypoints[i]
      const prevPoint = i === 0 ? { x: startX, y: startY } : waypoints[i - 1]
      const nextPoint = i === waypoints.length - 1 ? { x: endX, y: endY } : waypoints[i + 1]

      // Calculate if this is a corner (direction changes)
      const isHorizontalBefore = Math.abs(point.y - prevPoint.y) < 1
      const isHorizontalAfter = Math.abs(nextPoint.y - point.y) < 1

      if (isHorizontalBefore !== isHorizontalAfter) {
        // This is a corner - use rounded corner
        const dx = point.x - prevPoint.x
        const dy = point.y - prevPoint.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > cornerRadius * 2) {
          // Calculate corner points
          const ratio = cornerRadius / dist
          const beforeCornerX = prevPoint.x + dx * (1 - ratio)
          const beforeCornerY = prevPoint.y + dy * (1 - ratio)

          path += ` L ${beforeCornerX} ${beforeCornerY}`
          path += ` Q ${point.x} ${point.y}`

          const dx2 = nextPoint.x - point.x
          const dy2 = nextPoint.y - point.y
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
          const ratio2 = cornerRadius / dist2
          const afterCornerX = point.x + dx2 * ratio2
          const afterCornerY = point.y + dy2 * ratio2

          path += ` ${afterCornerX} ${afterCornerY}`
        } else {
          path += ` L ${point.x} ${point.y}`
        }
      } else {
        path += ` L ${point.x} ${point.y}`
      }
    }

    path += ` L ${endX} ${endY}`

    return {
      path,
      parentDot: { x: startX, y: startY },
      childDot: { x: endX, y: endY }
    }
  }

  // Render connections overlay
  const ConnectionsOverlay = () => {
    if (!containerRef.current) return null

    const containerRect = containerRef.current.getBoundingClientRect()

    return (
      <svg
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible'
        }}
      >
        {taskConnections.map(({ parentId, childId }) => {
          const parentRect = cardPositions[parentId]
          const childRect = cardPositions[childId]

          if (!parentRect || !childRect) return null

          const { path, parentDot, childDot } = generateConnectionPath(
            parentRect,
            childRect,
            containerRect,
            parentId,
            childId
          )

          return (
            <g key={`${parentId}-${childId}`}>
              {/* Connection line */}
              <path
                d={path}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="5 5"
                className="opacity-70"
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* Parent connection dot */}
              <circle
                cx={parentDot.x}
                cy={parentDot.y}
                r="5"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className="opacity-90"
              />
              {/* Child connection dot */}
              <circle
                cx={childDot.x}
                cy={childDot.y}
                r="5"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className="opacity-90"
              />
            </g>
          )
        })}
      </svg>
    )
  }

  // Per-task custom field type
  interface TaskCustomField {
    id: string
    name: string
    fieldType: string
    value: any
    options?: Array<{ id: string; label: string; color?: string }>
  }

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
        // Find the option label
        const selectOption = options?.find(opt => opt.id === value)
        return selectOption?.label || String(value)
      case 'multi_select':
        // Find option labels for all selected values
        if (Array.isArray(value)) {
          const labels = value.map(v => {
            const opt = options?.find(o => o.id === v)
            return opt?.label || v
          })
          return labels.join(', ')
        }
        return String(value)
      case 'url':
      case 'email':
      case 'phone':
      case 'text':
      default:
        return String(value)
    }
  }

  // Get color for select/multi_select options from per-task custom field
  const getOptionColor = (field: TaskCustomField): string | undefined => {
    const { fieldType, value, options } = field
    if (fieldType === 'select') {
      const option = options?.find(opt => opt.id === value)
      return option?.color
    }
    return undefined
  }

  // Task Card Component - Enhanced with dark mode support and detailed information
  const TaskCard = ({ task, columnColor, isSubtask = false }: { task: Task; columnColor?: string; isSubtask?: boolean }) => {
    const progress = getTaskProgress(task)
    const currentStageIndex = kanbanColumns.findIndex(col => col.status === task.status)
    const currentStageName = currentStageIndex !== -1 ? kanbanColumns[currentStageIndex].title : 'Unknown'
    const hasSubtasks = task.subtasks && task.subtasks.length > 0
    const hasTags = task.tags && task.tags.length > 0
    const hasAttachments = task.attachments && task.attachments.length > 0
    const hasComments = task.comments && task.comments.length > 0
    const hasDueDate = !!task.dueDate
    const hasParent = !!(task as any).parentTaskId

    // Format due date
    const formatDueDate = (dateString: string) => {
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-600 dark:text-red-400' }
      if (diffDays === 0) return { text: 'Due today', color: 'text-orange-600 dark:text-orange-400' }
      if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-yellow-600 dark:text-yellow-400' }
      if (diffDays <= 7) return { text: `${diffDays}d left`, color: 'text-blue-600 dark:text-blue-400' }
      return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-muted-foreground' }
    }

    const dueDateInfo = hasDueDate ? formatDueDate(task.dueDate!) : null

    return (
      <div
        className={`bg-card border-2 rounded-lg p-3 hover:shadow-lg transition-all cursor-pointer group ${
          hasParent ? 'border-l-4' : ''
        }`}
        style={{
          borderColor: columnColor || 'hsl(var(--border))',
          ...(hasParent && { borderLeftColor: columnColor || 'hsl(var(--primary))' }),
        }}
        onMouseEnter={(e) => {
          if (columnColor) {
            e.currentTarget.style.borderColor = columnColor
          }
        }}
        onClick={() => handleViewTask(task)}
        onDoubleClick={() => handleEditTask(task)}
      >

        {/* Priority Badge */}
        <div className="flex items-center gap-2 mb-2">
          {hasParent && (
            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          )}
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
            {task.priority.toUpperCase()}
          </span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {task.title}
            </h4>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-accent rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditTask(task)
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'tasks.editTask' })}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteTask(task)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'tasks.deleteTask' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        {hasTags && (
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full border border-border"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Custom Fields Display (per-task) */}
        {(task as any).custom_fields && Array.isArray((task as any).custom_fields) && (task as any).custom_fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {((task as any).custom_fields as TaskCustomField[])
              .filter(field => field.value !== undefined && field.value !== null && field.value !== '')
              .slice(0, 4) // Show max 4 custom fields on card
              .map(field => {
                const displayValue = formatCustomFieldValue(field)
                const optionColor = getOptionColor(field)

                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted/50 rounded border border-border/50"
                    title={`${field.name}: ${displayValue}`}
                  >
                    <span className="text-muted-foreground font-medium truncate max-w-[60px]">{field.name}:</span>
                    {optionColor ? (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: `${optionColor}20`, color: optionColor }}
                      >
                        {displayValue}
                      </span>
                    ) : (
                      <span className="text-foreground truncate max-w-[80px]">{displayValue}</span>
                    )}
                  </div>
                )
              })}
            {((task as any).custom_fields as TaskCustomField[]).filter(field => field.value !== undefined && field.value !== null && field.value !== '').length > 4 && (
              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                +{((task as any).custom_fields as TaskCustomField[]).filter(field => field.value !== undefined && field.value !== null && field.value !== '').length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Progress Bar - Always show */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {currentStageName}
            </span>
            <span className="font-medium text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Due Date */}
              {/* {hasDueDate && dueDateInfo && (
                <div className={`flex items-center gap-1 text-xs ${dueDateInfo.color}`}>
                  <Clock className="w-3 h-3" />
                  <span className="font-medium">{dueDateInfo.text}</span>
                </div>
              )} */}

              {/* Attachments */}
              {/* {hasAttachments && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span>{task.attachments!.length}</span>
                </div>
              )} */}

              {/* Comments */}
              {/* {hasComments && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>{task.comments!.length}</span>
                </div>
              )} */}

              {/* Estimated Hours */}
              {/* {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{task.estimatedHours}h</span>
                </div>
              )} */}
            </div>

          {/* Assignee Avatars */}
          {/* {task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0 && (
            <div className="flex items-center -space-x-2">
              {task.assignees.filter(a => a).slice(0, 3).map((assignee: any, index) => {
                // Handle both object format (with name) and string format (ID)
                const assigneeName = typeof assignee === 'object' && assignee?.name ? String(assignee.name) :
                                     typeof assignee === 'string' ? assignee :
                                     'Unknown';
                const assigneeEmail = typeof assignee === 'object' && assignee?.email ? String(assignee.email) : '';

                // Get initials from name (e.g., "John Doe" -> "JD")
                const getInitials = (name: string) => {
                  // Ensure name is a string and not undefined/null
                  const safeName = String(name || 'Unknown');
                  if (!safeName || safeName === 'Unknown' || safeName === 'null' || safeName === 'undefined') return '?';
                  const parts = safeName.split(' ').filter(p => p.length > 0);
                  if (parts.length >= 2) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return safeName.substring(0, Math.min(2, safeName.length)).toUpperCase();
                };

                const initial = getInitials(assigneeName);
                const displayTitle = assigneeEmail ? `${assigneeName} (${assigneeEmail})` : assigneeName;

                return (
                  <div
                    key={typeof assignee === 'object' ? assignee.id : assignee || index}
                    className="w-6 h-6 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground shadow-sm ring-2 ring-background"
                    title={displayTitle}
                    style={{ zIndex: task.assignees.length - index }}
                  >
                    <span className="text-xs font-semibold">
                      {initial}
                    </span>
                  </div>
                );
              })}
              {task.assignees.length > 3 && (
                <div
                  className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs font-semibold shadow-sm ring-2 ring-background"
                  title={`+${task.assignees.length - 3} more`}
                >
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          )} */}
        </div>

        {/* Updated By Information */}
 
        {(task as any).updated_by_user && (
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Updated by <span className="font-medium">{(task as any).updated_by_user.name}</span></span>
          </div>
        )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'tasks.loadingTasks' })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Unified Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b bg-background">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-semibold">
              {project?.name || 'Project'} - {getCurrentViewName()}
            </h1>
            <Badge variant="outline" className="text-xs">
              {intl.formatMessage({ id: 'tasks.tasksCount' }, { count: tasks.length })}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAddTask}>
              <Plus className="w-3 h-3 mr-1" />
              {intl.formatMessage({ id: 'tasks.addTask' })}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-3 h-3 mr-1" />
                  {intl.formatMessage({ id: 'tasks.viewOptions' })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">{intl.formatMessage({ id: 'tasks.changeView' })}</div>
                <DropdownMenuSeparator />
                {viewOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setCurrentView(option.value)}
                      className={`flex items-center gap-2 ${
                        currentView === option.value ? 'bg-accent' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Compact Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-2.5 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder={intl.formatMessage({ id: 'tasks.searchTasks' })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <Select value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as any)}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder={intl.formatMessage({ id: 'tasks.priority' })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{intl.formatMessage({ id: 'tasks.all' })}</SelectItem>
              <SelectItem value="low">{intl.formatMessage({ id: 'tasks.low' })}</SelectItem>
              <SelectItem value="medium">{intl.formatMessage({ id: 'tasks.medium' })}</SelectItem>
              <SelectItem value="high">{intl.formatMessage({ id: 'tasks.high' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dynamic Content Area - Kanban Board */}
      <div className="flex-1 overflow-hidden p-3">
        {currentView === 'board' && (
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div ref={containerRef} className="relative flex gap-3 h-full overflow-x-auto pb-2">
              {/* Render connection overlay */}
              <ConnectionsOverlay />
              {kanbanColumns.map(column => {
                const columnTasks = getTasksByStatus(column.status)

                return (
                  <div key={column.id} className="w-64 flex-shrink-0 flex flex-col">
                    {/* Column Header */}
                    <div
                      className="flex items-center justify-between mb-2 p-2.5 rounded-lg border-2 bg-background"
                      style={{ borderColor: column.color }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                        <h3 className="font-semibold text-sm">{column.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {columnTasks.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onAddTask?.(column.status as any)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 mr-2" />
                              {intl.formatMessage({ id: 'tasks.columnSettings' })}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Tasks */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 space-y-2 min-h-[200px] rounded-lg p-2 transition-colors overflow-y-auto ${
                            snapshot.isDraggingOver ? 'bg-muted/50' : ''
                          }`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={(el) => {
                                    provided.innerRef(el)
                                    cardRefs.current[task.id] = el
                                  }}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`transition-transform ${
                                    snapshot.isDragging ? 'rotate-2 scale-105' : ''
                                  }`}
                                >
                                  <TaskCard task={task} columnColor={column.color} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {columnTasks.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                              <div className="text-xl mb-2">📋</div>
                              <p className="text-sm">{intl.formatMessage({ id: 'tasks.noTasks' })}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        )}

        {currentView === 'list' && (
          <TaskListView tasks={filteredTasks} onTaskClick={handleViewTask} />
        )}

        {currentView === 'timeline' && (
          <TimelineView tasks={filteredTasks} onAddTask={handleAddTask} />
        )}

        {currentView === 'gantt' && (
          <GanttView tasks={filteredTasks} onAddTask={handleAddTask} />
        )}

        {currentView === 'team' && (
          <TeamView tasks={filteredTasks} onAddTask={handleAddTask} />
        )}

        {currentView === 'budgets' && (
          <ProjectBudgets
            workspaceId={workspaceId}
            projectId={projectId}
            canManageBudgets={canManageBudgets}
          />
        )}

        {!['board', 'list', 'timeline', 'gantt', 'team', 'budgets'].includes(currentView) && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500">This view is coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: 'tasks.deleteTaskTitle' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'tasks.deleteTaskConfirm' }, { title: taskToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: 'common.cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? intl.formatMessage({ id: 'tasks.deleting' }) : intl.formatMessage({ id: 'common.delete' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Task Modal */}
      <CreateTaskModal
        open={editTaskModalOpen}
        onOpenChange={(open) => {
          setEditTaskModalOpen(open)
          if (!open) setTaskToEdit(null)
        }}
        workspaceId={workspaceId}
        projectId={projectId}
        task={taskToEdit}
        onTaskCreated={() => {
          // Refresh tasks after edit
        }}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open)
          if (!open) setTaskToView(null)
        }}
        task={taskToView}
        onEdit={(task) => {
          setDetailModalOpen(false)
          setTaskToView(null)
          handleEditTask(task)
        }}
        kanbanStages={kanbanColumns.map(col => ({
          id: col.status,
          name: col.title,
          color: col.color
        }))}
        workspaceId={workspaceId}
      />
    </div>
  )
}
