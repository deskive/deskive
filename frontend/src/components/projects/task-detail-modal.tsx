import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Calendar,
  Clock,
  User,
  Tag,
  ArrowUp,
  ArrowDown,
  Minus,
  Edit,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  FileText,
  Users,
  Hash,
  Type,
  CheckSquare,
  Globe,
  Mail,
  Phone,
  List,
  CalendarDays
} from 'lucide-react'
import { format, formatDistanceToNow, isAfter, isPast } from 'date-fns'
import type { Task } from '@/lib/api/projects-api'
import { githubApi, type GitHubIssueLink } from '@/lib/api/github-api'
import { GitHubLinksDisplay } from '@/components/github/github-links-display'

// Per-task custom field structure
interface TaskCustomField {
  id: string;
  name: string;
  fieldType: string;
  value: any;
  options?: Array<{ id: string; label: string; color?: string }>;
}

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task) => void
  kanbanStages?: Array<{ id: string; name: string; color: string }>
  workspaceId?: string
}

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  onEdit,
  kanbanStages = [],
  workspaceId: propWorkspaceId
}: TaskDetailModalProps) {
  const params = useParams<{ workspaceId: string }>()
  const workspaceId = propWorkspaceId || params.workspaceId || ''

  const [githubLinks, setGithubLinks] = useState<GitHubIssueLink[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)

  // Load GitHub links when task changes
  useEffect(() => {
    if (open && task && workspaceId) {
      loadGithubLinks()
    } else {
      setGithubLinks([])
    }
  }, [open, task?.id, workspaceId])

  const loadGithubLinks = async () => {
    if (!task || !workspaceId) return
    try {
      setIsLoadingLinks(true)
      const links = await githubApi.getTaskLinks(workspaceId, task.id)
      setGithubLinks(links)
    } catch (error) {
      console.error('Failed to load GitHub links:', error)
    } finally {
      setIsLoadingLinks(false)
    }
  }

  if (!task) return null

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return <ArrowUp className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Minus className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <ArrowDown className="w-4 h-4 text-green-500" />
      default:
        return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusInfo = (status: string) => {
    const stage = kanbanStages.find(s => s.id === status)
    if (stage) {
      return { name: stage.name, color: stage.color }
    }
    // Fallback colors
    switch (status) {
      case 'todo':
        return { name: 'To Do', color: '#3B82F6' }
      case 'in_progress':
        return { name: 'In Progress', color: '#EAB308' }
      case 'review':
        return { name: 'Review', color: '#A855F7' }
      case 'completed':
      case 'done':
        return { name: 'Done', color: '#22C55E' }
      default:
        return { name: status.replace('_', ' '), color: '#6B7280' }
    }
  }

  const statusInfo = getStatusInfo(task.status)
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && task.status !== 'done'
  const isDueSoon = task.dueDate && !isOverdue && isAfter(new Date(task.dueDate), new Date()) &&
    (new Date(task.dueDate).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000

  // Format custom field value for display (per-task custom fields)
  const formatCustomFieldValue = (field: TaskCustomField): React.ReactNode => {
    const { fieldType, value, options } = field
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>

    switch (fieldType) {
      case 'checkbox':
        return value ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <div className="w-4 h-4 rounded border border-muted-foreground/30" />
        )
      case 'date':
        try {
          return format(new Date(value), 'MMM dd, yyyy')
        } catch {
          return String(value)
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)
      case 'select':
        const selectOption = options?.find(opt => opt.id === value)
        if (selectOption) {
          return (
            <Badge
              variant="secondary"
              style={{
                backgroundColor: selectOption.color ? `${selectOption.color}20` : undefined,
                color: selectOption.color || undefined
              }}
            >
              {selectOption.label}
            </Badge>
          )
        }
        return String(value)
      case 'multi_select':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v: string) => {
                const opt = options?.find(o => o.id === v)
                return opt ? (
                  <Badge
                    key={v}
                    variant="secondary"
                    style={{
                      backgroundColor: opt.color ? `${opt.color}20` : undefined,
                      color: opt.color || undefined
                    }}
                  >
                    {opt.label}
                  </Badge>
                ) : null
              })}
            </div>
          )
        }
        return String(value)
      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <Globe className="w-3 h-3" />
            {value}
          </a>
        )
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {value}
          </a>
        )
      case 'phone':
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:underline flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {value}
          </a>
        )
      default:
        return String(value)
    }
  }

  // Get icon for field type
  const getFieldTypeIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return <Type className="w-4 h-4 text-muted-foreground" />
      case 'number': return <Hash className="w-4 h-4 text-muted-foreground" />
      case 'date': return <CalendarDays className="w-4 h-4 text-muted-foreground" />
      case 'select': return <List className="w-4 h-4 text-muted-foreground" />
      case 'multi_select': return <List className="w-4 h-4 text-muted-foreground" />
      case 'checkbox': return <CheckSquare className="w-4 h-4 text-muted-foreground" />
      case 'url': return <Globe className="w-4 h-4 text-muted-foreground" />
      case 'email': return <Mail className="w-4 h-4 text-muted-foreground" />
      case 'phone': return <Phone className="w-4 h-4 text-muted-foreground" />
      case 'person': return <User className="w-4 h-4 text-muted-foreground" />
      default: return <Type className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Get assignees from task
  const assignees = task.assignees || (task.assignee ? [task.assignee] : [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: `${statusInfo.color}20`,
                    color: statusInfo.color,
                    borderColor: statusInfo.color
                  }}
                >
                  {statusInfo.name}
                </Badge>
                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                  <span className="flex items-center gap-1">
                    {getPriorityIcon(task.priority)}
                    {task.priority.toUpperCase()}
                  </span>
                </Badge>
              </div>
              <DialogTitle className="text-xl font-semibold line-clamp-2">
                {task.title}
              </DialogTitle>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(task)
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-120px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h3>
                <div
                  className="text-sm prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              </div>
            )}

            <Separator />

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignees */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assignees
                </h3>
                {assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((assignee: any, index: number) => {
                      const name = typeof assignee === 'object' ? (assignee.name || assignee.email || 'Unknown') : assignee
                      const avatarUrl = typeof assignee === 'object' ? assignee.avatar_url : undefined
                      return (
                        <div key={index} className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {String(name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{name}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No assignees</span>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </h3>
                {task.dueDate ? (
                  <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}>
                    {isOverdue && <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })})
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No due date</span>
                )}
              </div>

              {/* Estimated Hours */}
              {task.estimatedHours && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Estimated Time
                  </h3>
                  <span className="text-sm">{task.estimatedHours} hours</span>
                </div>
              )}

              {/* Created */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Created
                </h3>
                <span className="text-sm">
                  {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                  <span className="text-muted-foreground ml-1">
                    ({formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })})
                  </span>
                </span>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* GitHub Links */}
            {workspaceId && (
              <>
                <Separator />
                <GitHubLinksDisplay
                  workspaceId={workspaceId}
                  taskId={task.id}
                  links={githubLinks}
                  onLinksChange={setGithubLinks}
                  showAddButton={true}
                />
              </>
            )}

            {/* Custom Fields (per-task) */}
            {(task as any).custom_fields && Array.isArray((task as any).custom_fields) && (task as any).custom_fields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Custom Fields</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {((task as any).custom_fields as TaskCustomField[])
                      .filter(field => field.value !== undefined && field.value !== null && field.value !== '')
                      .map(field => (
                        <div key={field.id} className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getFieldTypeIcon(field.fieldType)}
                            <span>{field.name}</span>
                          </div>
                          <div className="text-sm pl-6">
                            {formatCustomFieldValue(field)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* Updated Info */}
            {(task as any).updated_by_user && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Last updated by <span className="font-medium">{(task as any).updated_by_user.name}</span>
                  {task.updatedAt && (
                    <span> {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
