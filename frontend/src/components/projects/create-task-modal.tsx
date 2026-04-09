import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NotesMentionTextarea } from '@/components/ui/notes-mention-textarea'
import { RichTextEditor, type RichTextAttachment } from '@/components/ui/rich-text-editor'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
// import { EnhancedDatePicker } from '@/components/shared/enhanced-date-picker' // Replaced with native date input
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { TaskType, TaskStatus, TaskPriority } from '@/types/tasks'
// import { mockUsers } from '@/lib/mock-data' // Removed - use real API data
import {
  CalendarDays,
  Clock,
  User,
  Flag,
  Tag,
  ArrowUp,
  ArrowDown,
  Minus,
  FileText,
  Link as LinkIcon,
  Plus,
  X,
  Sparkles,
  CheckCircle,
  Circle,
  Loader2,
  Type,
  Hash,
  CheckSquare,
  Mail,
  Phone,
  Globe,
  Users,
  List,
  Trash2,
  Settings2
} from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { projectService, projectKeys, type CustomFieldType } from '@/lib/api/projects-api'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useGenerateDescriptionSuggestions } from '@/lib/api/ai-api'
import { useToast } from '@/components/ui/use-toast'
import { fileApi } from '@/lib/api/files-api'
import { calendarApi } from '@/lib/api/calendar-api'
import { FilePreviewDialog } from '@/components/files/FileOperationDialogs'
import { EventPreviewDialog } from '@/components/calendar/EventPreviewDialog'
import { cn } from '@/lib/utils'
import { FileText as FileIcon, Calendar as CalendarIcon, HardDrive } from 'lucide-react'

interface CreateTaskModalProps{
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  workspaceId: string
  parentTaskId?: string
  defaultStatus?: 'todo' | 'in_progress' | 'review' | 'completed'
  task?: any // Task to edit (optional)
  onTaskCreated?: () => void
}

export function CreateTaskModal({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  parentTaskId,
  defaultStatus,
  task,
  onTaskCreated
}: CreateTaskModalProps) {
  const intl = useIntl()
  const isEditMode = !!task
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: parentTaskId ? TaskType.SUBTASK : TaskType.TASK,
    status: '' as any, // Will be updated by useEffect when defaultStatus or kanbanStages are available
    priority: 'medium' as 'low' | 'medium' | 'high',
    projectId: projectId || '',
    assigneeIds: [] as string[],
    reporterId: '1',
    parentTaskId: parentTaskId || '',
    dueDate: null as Date | null,
    estimatedHours: '',
    tags: [] as string[],
    links: [] as string[],
  })

  const [newTag, setNewTag] = useState('')
  const [newLink, setNewLink] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)

  // Attachment states
  const [attachments, setAttachments] = useState<RichTextAttachment[]>([])
  const [filePreviewOpen, setFilePreviewOpen] = useState(false)
  const [filePreviewData, setFilePreviewData] = useState<any>(null)
  const [filePreviewLoading, setFilePreviewLoading] = useState(false)
  const [eventPreviewOpen, setEventPreviewOpen] = useState(false)
  const [eventPreviewData, setEventPreviewData] = useState<any>(null)
  const [eventPreviewLoading, setEventPreviewLoading] = useState(false)

  // Per-task custom fields state (each task has its own field definitions and values)
  interface TaskCustomField {
    id: string;
    name: string;
    fieldType: CustomFieldType;
    value: any;
    options?: Array<{ id: string; label: string; color?: string }>;
  }
  const [taskCustomFields, setTaskCustomFields] = useState<TaskCustomField[]>([])
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text')
  const [newFieldOptions, setNewFieldOptions] = useState<Array<{ label: string; color?: string }>>([])
  const [newOptionInput, setNewOptionInput] = useState('')

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const descriptionMutation = useGenerateDescriptionSuggestions()
  const navigate = useNavigate()

  // Fetch project to get kanban stages
  const { data: projectData } = useQuery({
    queryKey: projectId ? projectKeys.detail(projectId) : ['project', 'empty'],
    queryFn: () => (projectId && workspaceId) ? projectService.getProject(workspaceId, projectId) : Promise.resolve(null),
    enabled: !!projectId && !!workspaceId && open,
    staleTime: 60 * 1000, // 1 minute
  })

  // Fetch project members (only show project members in assignees list)
  const { data: projectMembers = [] } = useQuery({
    queryKey: ['projectMembers', workspaceId, formData.projectId || projectId],
    queryFn: () => projectService.getProjectMembers(workspaceId, formData.projectId || projectId!),
    enabled: !!workspaceId && !!(formData.projectId || projectId) && open,
  })

  // Use project members for assignees dropdown
  const availableAssignees = projectMembers

  // Fetch available tasks for parent task selection
  const { data: availableTasks } = useQuery({
    queryKey: projectId ? projectKeys.tasks(projectId) : ['tasks', 'empty'],
    queryFn: () => (projectId && workspaceId) ? projectService.getTasks(workspaceId, projectId) : Promise.resolve([]),
    enabled: !!projectId && !!workspaceId && open,
    staleTime: 60 * 1000, // 1 minute
  })

  const tasks = Array.isArray(availableTasks) ? availableTasks : []

  // Get kanban stages from project or use defaults
  const kanbanStages = projectData?.kanban_stages && projectData.kanban_stages.length > 0
    ? projectData.kanban_stages.sort((a, b) => a.order - b.order)
    : [
        { id: 'todo', name: 'To Do', order: 0, color: '#3B82F6' },
        { id: 'in_progress', name: 'In Progress', order: 1, color: '#EAB308' },
        { id: 'review', name: 'Review', order: 2, color: '#A855F7' },
        { id: 'completed', name: 'Done', order: 3, color: '#22C55E' }
      ]

  React.useEffect(() => {
    if (projectId && projectId !== formData.projectId) {
      setFormData(prev => ({ ...prev, projectId }))
    }
  }, [projectId, formData.projectId])

  // Update status when modal opens and defaultStatus is provided (from column + button)
  React.useEffect(() => {
    if (open && defaultStatus && !isEditMode) {
      setFormData(prev => ({ ...prev, status: defaultStatus as any }))
    }
  }, [open, defaultStatus, isEditMode])

  // Prefill form data when editing
  React.useEffect(() => {
    if (task && open) {
      // Get assignees - prefer assigned_to (array of IDs) over assignees (array of objects)
      let rawAssignees = task.assigned_to || task.assignees || (task.assigneeId ? [task.assigneeId] : []);

      // Flatten array if it's nested (backend sometimes returns [[...]] instead of [...])
      if (Array.isArray(rawAssignees) && rawAssignees.length > 0 && Array.isArray(rawAssignees[0])) {
        rawAssignees = rawAssignees[0];
      }

      // Extract IDs if assignees are objects (backend returns {id, name, email, avatar_url})
      const assigneeIds: string[] = Array.isArray(rawAssignees)
        ? rawAssignees.map((a: any) => typeof a === 'object' && a !== null ? a.id : a).filter(Boolean)
        : [];

      console.log('🔍 Edit Task - Raw assignees:', rawAssignees);
      console.log('🔍 Edit Task - Extracted assignee IDs:', assigneeIds);
      console.log('🔍 Edit Task - Task object:', task);
      console.log('🔍 Edit Task - Project members:', projectMembers);

      setFormData({
        name: task.title || '',
        description: task.description || '',
        type: task.task_type || TaskType.TASK,
        status: task.status || '',
        priority: task.priority || 'medium',
        projectId: task.projectId || projectId || '',
        assigneeIds: assigneeIds,
        reporterId: '1',
        parentTaskId: (task as any).parentTaskId || '',
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
        tags: task.tags || [],
        links: [],
      })
    }
  }, [task, open, projectId, projectMembers])

  const saveTaskMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Use formData.projectId which contains the task's projectId when editing
      const targetProjectId = data.projectId || projectId
      if (!targetProjectId || !workspaceId) throw new Error('Project ID and Workspace ID are required')

      // Map form data to API schema
      const taskData: import('@/lib/api/projects-api').CreateTaskRequest = {
        title: data.name,
        description: data.description || undefined,
        task_type: data.type?.toLowerCase() as any || 'task',
        status: data.status,
        priority: data.priority,
        parent_task_id: data.parentTaskId || undefined,
        assigned_to: data.assigneeIds.length > 0 ? data.assigneeIds : undefined,
        due_date: data.dueDate?.toISOString() || undefined,
        estimated_hours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
        labels: data.tags.length > 0 ? data.tags : undefined,
        custom_fields: taskCustomFields.length > 0 ? taskCustomFields : undefined,
      }

      if (isEditMode && task) {
        // Update existing task - calls PATCH /api/v1/workspaces/{workspaceId}/projects/tasks/{taskId}
        return projectService.updateTask(workspaceId, task.id, taskData)
      } else {
        // Create new task
        return projectService.createTask(workspaceId, targetProjectId, taskData)
      }
    },
    onSuccess: (_, data) => {
      // Use the projectId from formData which is set correctly for both create and edit
      const targetProjectId = data.projectId || projectId
      if (targetProjectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.tasks(targetProjectId) })
        queryClient.invalidateQueries({ queryKey: projectKeys.analytics(targetProjectId) })
      }
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      onTaskCreated?.()
      onOpenChange(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating task:', error)
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: parentTaskId ? TaskType.SUBTASK : TaskType.TASK,
      status: defaultStatus || '' as any,
      priority: 'medium',
      projectId: projectId || '',
      assigneeIds: [],
      reporterId: '1',
      parentTaskId: parentTaskId || '',
      dueDate: null,
      estimatedHours: '',
      tags: [],
      links: [],
    })
    setTaskCustomFields([])
    setActiveTab('basic')
    setAiDescriptionLoading(false)
  }

  // Load custom fields when editing, or reset when creating new task
  React.useEffect(() => {
    if (open) {
      if (task?.custom_fields && Array.isArray(task.custom_fields)) {
        // Edit mode - load existing custom fields (per-task fields with definitions and values)
        setTaskCustomFields(task.custom_fields)
      } else if (!task) {
        // Create mode - reset custom fields
        setTaskCustomFields([])
      }
    }
  }, [task, open])

  // Helper function to get icon for field type
  const getFieldTypeIcon = (fieldType: CustomFieldType) => {
    switch (fieldType) {
      case 'text': return <Type className="w-4 h-4" />
      case 'number': return <Hash className="w-4 h-4" />
      case 'date': return <CalendarDays className="w-4 h-4" />
      case 'select': return <List className="w-4 h-4" />
      case 'multi_select': return <List className="w-4 h-4" />
      case 'checkbox': return <CheckSquare className="w-4 h-4" />
      case 'url': return <Globe className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'person': return <User className="w-4 h-4" />
      default: return <Type className="w-4 h-4" />
    }
  }

  // Handle adding a new custom field to this task
  const handleCreateCustomField = () => {
    if (!newFieldName.trim()) return

    // Generate a unique ID for the field
    const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create options with IDs for select types
    const options = ['select', 'multi_select'].includes(newFieldType) && newFieldOptions.length > 0
      ? newFieldOptions.map((opt, idx) => ({
          id: `opt_${Date.now()}_${idx}`,
          label: opt.label,
          color: opt.color
        }))
      : undefined

    // Add new field to task's custom fields
    const newField: TaskCustomField = {
      id: fieldId,
      name: newFieldName,
      fieldType: newFieldType,
      value: getDefaultValue(newFieldType),
      options
    }

    setTaskCustomFields(prev => [...prev, newField])
    setShowAddFieldModal(false)
    setNewFieldName('')
    setNewFieldType('text')
    setNewFieldOptions([])
    toast({
      title: intl.formatMessage({ id: 'modules.projects.createTask.toast.fieldAdded' }),
      description: intl.formatMessage({ id: 'modules.projects.createTask.toast.fieldAddedDescription' }, { name: newFieldName }),
    })
  }

  // Get default value based on field type
  const getDefaultValue = (fieldType: CustomFieldType) => {
    switch (fieldType) {
      case 'checkbox': return false
      case 'number': return null
      case 'multi_select': return []
      default: return ''
    }
  }

  // Handle removing a custom field from this task
  const handleRemoveCustomField = (fieldId: string) => {
    setTaskCustomFields(prev => prev.filter(f => f.id !== fieldId))
  }

  // Handle updating a custom field value
  const handleUpdateFieldValue = (fieldId: string, value: any) => {
    setTaskCustomFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, value } : f
    ))
  }

  // Render input for per-task custom field based on type
  const renderTaskCustomFieldInput = (field: TaskCustomField) => {
    const { id, fieldType, name, value, options } = field

    switch (fieldType) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value)}
            placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.enterField' }, { name: name.toLowerCase() })}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value ? Number(e.target.value) : null)}
            placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.zero' })}
          />
        )
      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value)}
            className="dark:[color-scheme:dark]"
          />
        )
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleUpdateFieldValue(id, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
        )
      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value)}
            placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.url' })}
          />
        )
      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value)}
            placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.email' })}
          />
        )
      case 'phone':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value)}
            placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.phone' })}
          />
        )
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(v) => handleUpdateFieldValue(id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.selectField' }, { name: name.toLowerCase() })} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  <div className="flex items-center gap-2">
                    {opt.color && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                    )}
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case 'multi_select':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {selectedValues.map((optId: string) => {
                const opt = options?.find(o => o.id === optId)
                return opt ? (
                  <Badge
                    key={optId}
                    variant="secondary"
                    style={{ backgroundColor: opt.color ? `${opt.color}20` : undefined }}
                  >
                    {opt.label}
                    <button
                      onClick={() => handleUpdateFieldValue(id, selectedValues.filter((v: string) => v !== optId))}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ) : null
              })}
            </div>
            <Select
              value=""
              onValueChange={(v) => {
                if (!selectedValues.includes(v)) {
                  handleUpdateFieldValue(id, [...selectedValues, v])
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.addOption' })} />
              </SelectTrigger>
              <SelectContent>
                {options?.filter(opt => !selectedValues.includes(opt.id)).map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <div className="flex items-center gap-2">
                      {opt.color && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      )}
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleUpdateFieldValue(id, e.target.value)}
            placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.enterField' }, { name: name.toLowerCase() })}
          />
        )
    }
  }

  const getTaskTypeIcon = (type: TaskType) => {
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

  const getTaskTypeColor = (type: TaskType) => {
    switch (type) {
      case TaskType.BUG: return 'bg-red-100 text-red-800 border-red-200'
      case TaskType.STORY: return 'bg-blue-100 text-blue-800 border-blue-200'
      case TaskType.EPIC: return 'bg-purple-100 text-purple-800 border-purple-200'
      case TaskType.TASK: return 'bg-green-100 text-green-800 border-green-200'
      case TaskType.SUBTASK: return 'bg-gray-100 text-gray-800 border-gray-200'
      case TaskType.FEATURE_REQUEST: return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTaskTypeLabel = (type: TaskType) => {
    switch (type) {
      case TaskType.BUG: return intl.formatMessage({ id: 'modules.projects.createTask.taskTypes.bug', defaultMessage: 'Bug' })
      case TaskType.STORY: return intl.formatMessage({ id: 'modules.projects.createTask.taskTypes.story', defaultMessage: 'Story' })
      case TaskType.EPIC: return intl.formatMessage({ id: 'modules.projects.createTask.taskTypes.epic', defaultMessage: 'Epic' })
      case TaskType.TASK: return intl.formatMessage({ id: 'modules.projects.createTask.taskTypes.task', defaultMessage: 'Task' })
      case TaskType.SUBTASK: return intl.formatMessage({ id: 'modules.projects.createTask.taskTypes.subtask', defaultMessage: 'Subtask' })
      case TaskType.FEATURE_REQUEST: return intl.formatMessage({ id: 'modules.projects.createTask.taskTypes.featureRequest', defaultMessage: 'Feature Request' })
      default: return type
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return intl.formatMessage({ id: 'modules.projects.createTask.priorities.low', defaultMessage: 'Low' })
      case 'medium': return intl.formatMessage({ id: 'modules.projects.createTask.priorities.medium', defaultMessage: 'Medium' })
      case 'high': return intl.formatMessage({ id: 'modules.projects.createTask.priorities.high', defaultMessage: 'High' })
      default: return priority
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

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleAddLink = () => {
    if (newLink.trim() && !formData.links.includes(newLink.trim())) {
      try {
        new URL(newLink.trim())
        setFormData(prev => ({
          ...prev,
          links: [...prev.links, newLink.trim()]
        }))
        setNewLink('')
      } catch {
        console.error('Invalid URL')
      }
    }
  }

  const handleRemoveLink = (linkToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter(link => link !== linkToRemove)
    }))
  }

  // Helper function to get icon for attachment type
  const getAttachmentIcon = (type: 'notes' | 'events' | 'files' | 'drive') => {
    switch (type) {
      case 'notes':
        return <FileText className="h-4 w-4" />
      case 'events':
        return <CalendarIcon className="h-4 w-4" />
      case 'files':
        return <FileIcon className="h-4 w-4" />
      case 'drive':
        return <HardDrive className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Handle click on linked attachment
  const handleAttachmentClick = async (attachment: RichTextAttachment) => {
    if (!workspaceId) return

    if (attachment.type === 'notes') {
      // Navigate to note
      onOpenChange(false)
      navigate(`/workspaces/${workspaceId}/notes/${attachment.id}`)
    } else if (attachment.type === 'files') {
      // Open file preview modal
      setFilePreviewLoading(true)
      setFilePreviewOpen(true)
      try {
        const fileData = await fileApi.getFile(workspaceId, attachment.id)
        setFilePreviewData(fileData)
      } catch (error) {
        console.error('Error fetching file:', error)
        toast({
          title: intl.formatMessage({ id: 'modules.projects.createTask.toast.error' }),
          description: intl.formatMessage({ id: 'modules.projects.createTask.toast.failedToLoadFile' }),
          variant: 'destructive'
        })
        setFilePreviewData({ id: attachment.id, name: attachment.title, type: 'file' })
      } finally {
        setFilePreviewLoading(false)
      }
    } else if (attachment.type === 'events') {
      // Open event preview modal
      setEventPreviewLoading(true)
      setEventPreviewOpen(true)
      try {
        const eventData = await calendarApi.getEvent(workspaceId, attachment.id)
        setEventPreviewData(eventData)
      } catch (error) {
        console.error('Error fetching event:', error)
        toast({
          title: intl.formatMessage({ id: 'modules.projects.createTask.toast.error' }),
          description: intl.formatMessage({ id: 'modules.projects.createTask.toast.failedToLoadEvent' }),
          variant: 'destructive'
        })
        setEventPreviewData({ id: attachment.id, title: attachment.title })
      } finally {
        setEventPreviewLoading(false)
      }
    } else if (attachment.type === 'drive') {
      // Open Google Drive file in new tab
      if (attachment.driveFileUrl) {
        window.open(attachment.driveFileUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast({
          title: intl.formatMessage({ id: 'modules.projects.createTask.toast.error' }),
          description: intl.formatMessage({ id: 'modules.projects.createTask.toast.driveUrlNotAvailable' }),
          variant: 'destructive'
        })
      }
    }
  }

  const generateAIDescription = async () => {
    // Validate that task title is filled
    if (!formData.name.trim()) {
      toast({
        title: intl.formatMessage({ id: 'modules.projects.createTask.toast.titleRequired' }),
        description: intl.formatMessage({ id: 'modules.projects.createTask.toast.titleRequiredDescription' }),
        variant: "destructive"
      })
      return
    }

    setAiDescriptionLoading(true)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)

    try {
      const taskName = formData.name.trim()
      const taskType = formData.type
      const taskPriority = formData.priority

      // Build context based on task details
      let context = ''
      if (taskType === TaskType.BUG) {
        context = intl.formatMessage({ id: 'modules.projects.createTask.contexts.bug' })
      } else if (taskType === TaskType.STORY) {
        context = intl.formatMessage({ id: 'modules.projects.createTask.contexts.story' })
      } else if (taskType === TaskType.EPIC) {
        context = intl.formatMessage({ id: 'modules.projects.createTask.contexts.epic' })
      } else if (taskType === TaskType.SUBTASK) {
        context = intl.formatMessage({ id: 'modules.projects.createTask.contexts.subtask' })
      }
      if (taskPriority === 'high') {
        context += ' ' + intl.formatMessage({ id: 'modules.projects.createTask.contexts.highPriority' })
      } else if (taskPriority === 'low') {
        context += ' ' + intl.formatMessage({ id: 'modules.projects.createTask.contexts.lowPriority' })
      }

      // Call the unified description suggestions API
      const response = await descriptionMutation.mutateAsync({
        type: 'task',
        title: taskName,
        context: context || undefined,
        count: 3,
        tone: 'professional',
        length: 'medium',
      })

      // Backend returns already parsed suggestions
      setDescriptionSuggestions(response.suggestions)
      setShowDescriptionSuggestions(true)

      toast({
        title: intl.formatMessage({ id: 'modules.projects.createTask.toast.descriptionsGenerated' }),
        description: intl.formatMessage({ id: 'modules.projects.createTask.toast.descriptionsGeneratedDescription' }),
      })
    } catch (error) {
      console.error('AI description generation failed:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.projects.createTask.toast.generationFailed' }),
        description: intl.formatMessage({ id: 'modules.projects.createTask.toast.generationFailedDescription' }),
        variant: "destructive"
      })
    } finally {
      setAiDescriptionLoading(false)
    }
  }

  const selectDescriptionSuggestion = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      description: suggestion
    }))
    setShowDescriptionSuggestions(false)
    setDescriptionSuggestions([])
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      await saveTaskMutation.mutateAsync(formData)
    } catch (error) {
      console.error('Error saving task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    return formData.name.trim() && formData.projectId && formData.status
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: isEditMode ? 'modules.projects.createTask.editTitle' : 'modules.projects.createTask.title' })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: isEditMode ? 'modules.projects.createTask.editDescription' : 'modules.projects.createTask.description' })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">
              {intl.formatMessage({ id: 'modules.projects.createTask.tabs.basicInfo' })}
            </TabsTrigger>
            <TabsTrigger value="details">
              {intl.formatMessage({ id: 'modules.projects.createTask.tabs.details' })}
            </TabsTrigger>
            <TabsTrigger value="custom">
              {intl.formatMessage({ id: 'modules.projects.createTask.tabs.customFields' })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {intl.formatMessage({ id: 'modules.projects.createTask.taskTitle' })}*
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={intl.formatMessage({ id: 'modules.projects.createTask.taskTitlePlaceholder' })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="type">
                    {intl.formatMessage({ id: 'modules.projects.createTask.type' })}
                  </Label>
                  <Select value={formData.type} onValueChange={(value: TaskType) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskType).map(type => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <span>{getTaskTypeIcon(type)}</span>
                            <span className="text-xs">{getTaskTypeLabel(type)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">
                    {intl.formatMessage({ id: 'modules.projects.createTask.priority' })}
                  </Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['low', 'medium', 'high'].map(priority => (
                        <SelectItem key={priority} value={priority}>
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(priority)}
                            <span className="text-xs">{getPriorityLabel(priority)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    {intl.formatMessage({ id: 'modules.projects.createTask.status' })}*
                  </Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: 'modules.projects.createTask.statusPlaceholder' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {kanbanStages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-xs">{stage.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">
                    {intl.formatMessage({ id: 'modules.projects.createTask.description' })}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateAIDescription}
                    disabled={aiDescriptionLoading || !formData.name.trim()}
                    className="text-xs"
                  >
                    {aiDescriptionLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {intl.formatMessage({ id: 'modules.projects.createTask.generating' })}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        {intl.formatMessage({ id: 'modules.projects.createTask.createWithAI' })}
                      </>
                    )}
                  </Button>
                </div>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder={intl.formatMessage({ id: 'modules.projects.createTask.descriptionPlaceholder' })}
                  minHeight="100px"
                  enableMentions={true}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                />

                {/* AI Description Suggestions */}
                {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'modules.projects.createTask.aiSuggestions' })}</div>
                    {descriptionSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 text-sm bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors border border-border/50"
                        onClick={() => selectDescriptionSuggestion(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}

                {/* Linked Items Display */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.projects.createTask.linkedItems' }, { count: attachments.length })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md border text-sm cursor-pointer",
                            "bg-background hover:bg-muted transition-colors group"
                          )}
                          onClick={() => handleAttachmentClick(attachment)}
                        >
                          <div className={cn(
                            "text-muted-foreground",
                            attachment.type === 'notes' && "text-blue-500",
                            attachment.type === 'events' && "text-green-500",
                            attachment.type === 'files' && "text-orange-500"
                          )}>
                            {getAttachmentIcon(attachment.type)}
                          </div>
                          <span className="font-medium truncate max-w-[200px]" title={attachment.title}>
                            {attachment.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachments(prev => prev.filter(a => a.id !== attachment.id))
                            }}
                            className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title={intl.formatMessage({ id: 'modules.projects.createTask.removeLink' })}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignees">{intl.formatMessage({ id: 'modules.projects.createTask.assignees' })}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {formData.assigneeIds.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {(() => {
                                // Debug: Log what we're working with
                                console.log('🔍 Assignee Display Debug:');
                                console.log('  formData.assigneeIds:', formData.assigneeIds);
                                console.log('  availableAssignees:', availableAssignees.map(m => ({
                                  id: m.id,
                                  user_id: m.user_id,
                                  'user.id': m.user?.id,
                                  'user.name': m.user?.name
                                })));
                                return null;
                              })()}
                              {formData.assigneeIds.slice(0, 3).map(id => {
                                // Find member by user_id or user.id (task.assigned_to contains user IDs)
                                const member = availableAssignees.find(m =>
                                  m.user_id === id || m.user?.id === id || m.id === id
                                )
                                console.log(`  Looking for id "${id}":`, member ? 'FOUND' : 'NOT FOUND');
                                const userName = member?.user?.name || member?.user?.email || intl.formatMessage({ id: 'modules.projects.createTask.labels.unknown' })
                                const userAvatar = member?.user?.avatar_url
                                return (
                                  <Avatar key={id} className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={userAvatar} alt={userName} />
                                    <AvatarFallback className="text-xs">
                                      {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                )
                              })}
                            </div>
                            <span className="text-sm">
                              {intl.formatMessage({ id: 'modules.projects.createTask.selected' }, { count: formData.assigneeIds.length })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{intl.formatMessage({ id: 'modules.projects.createTask.assigneesPlaceholder' })}</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
                      {availableAssignees.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {intl.formatMessage({ id: 'modules.projects.createTask.noProjectMembers' })}
                        </div>
                      ) : (
                        availableAssignees.map(member => {
                          // Use user_id or user.id as the identifier (matches task.assigned_to)
                          const memberId = member.user_id || member.user?.id || member.id
                          const isSelected = formData.assigneeIds.includes(memberId)
                          const userName = member.user?.name || member.user?.email || intl.formatMessage({ id: 'modules.projects.createTask.labels.unknownUser' })
                          const userEmail = member.user?.email || ''
                          const userAvatar = member.user?.avatar_url

                          return (
                            <DropdownMenuItem
                              key={memberId}
                              onSelect={(e) => {
                                e.preventDefault()
                                setFormData(prev => ({
                                  ...prev,
                                  assigneeIds: isSelected
                                    ? prev.assigneeIds.filter(id => id !== memberId)
                                    : [...prev.assigneeIds, memberId]
                                }))
                              }}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/50'}`}>
                                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={userAvatar} alt={userName} />
                                  <AvatarFallback className="text-xs">
                                    {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{userName}</div>
                                  <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          )
                        })
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {formData.assigneeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.assigneeIds.map(id => {
                        // Find member by user_id or user.id (task.assigned_to contains user IDs)
                        const member = availableAssignees.find(m =>
                          m.user_id === id || m.user?.id === id || m.id === id
                        )
                        const userName = member?.user?.name || member?.user?.email || 'Unknown'
                        const userAvatar = member?.user?.avatar_url

                        return member ? (
                          <div key={id} className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md bg-secondary">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={userAvatar} alt={userName} />
                              <AvatarFallback className="text-xs">
                                {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium">{userName}</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                assigneeIds: prev.assigneeIds.filter(aid => aid !== id)
                              }))}
                              className="ml-0.5 hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">{intl.formatMessage({ id: 'modules.projects.createTask.dueDate' })}</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate ? formData.dueDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value ? new Date(e.target.value) : null;
                      setFormData(prev => ({ ...prev, dueDate: dateValue }));
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours">{intl.formatMessage({ id: 'modules.projects.createTask.estimatedHours' })}</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                  placeholder={intl.formatMessage({ id: 'modules.projects.createTask.placeholders.zero' })}
                  min="0"
                />
              </div>

              {/* Parent Task Selector */}
              <div className="space-y-2">
                <Label htmlFor="parentTask">
                  {intl.formatMessage({ id: 'modules.projects.createTask.parentTask' })}
                  <span className="text-xs text-muted-foreground ml-2">{intl.formatMessage({ id: 'modules.projects.createTask.parentTaskOptional' })}</span>
                </Label>
                <Select
                  value={formData.parentTaskId || 'none'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    parentTaskId: value === 'none' ? '' : value,
                    type: value === 'none' ? TaskType.TASK : TaskType.SUBTASK
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={intl.formatMessage({ id: 'modules.projects.createTask.parentTaskPlaceholder' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <Circle className="w-3 h-3" />
                        <span className="text-sm">{intl.formatMessage({ id: 'modules.projects.createTask.noneParentTask' })}</span>
                      </div>
                    </SelectItem>
                    {tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary/20" />
                          <span className="text-sm truncate">{task.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.parentTaskId && formData.parentTaskId !== 'none' && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      {intl.formatMessage({ id: 'modules.projects.createTask.subtaskOf' }, { title: tasks.find(t => t.id === formData.parentTaskId)?.title })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">{intl.formatMessage({ id: 'modules.projects.createTask.tags' })}</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'modules.projects.createTask.tagPlaceholder' })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline" size="sm">
                    <Tag className="w-4 h-4 mr-1" />
                    {intl.formatMessage({ id: 'modules.projects.createTask.add' })}
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-4">
              {/* Header with Add Field button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{intl.formatMessage({ id: 'modules.projects.createTask.customFieldsTitle' })}</h3>
                  <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.projects.createTask.customFieldsDescription' })}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddFieldModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {intl.formatMessage({ id: 'modules.projects.createTask.addField' })}
                </Button>
              </div>

              {/* Empty state */}
              {taskCustomFields.length === 0 && (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <Settings2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.projects.createTask.noCustomFields' })}</p>
                  <p className="text-xs text-muted-foreground mb-4">{intl.formatMessage({ id: 'modules.projects.createTask.noCustomFieldsDescription' })}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddFieldModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {intl.formatMessage({ id: 'modules.projects.createTask.addFirstField' })}
                  </Button>
                </div>
              )}

              {/* Custom fields list */}
              {taskCustomFields.length > 0 && (
                <div className="space-y-4">
                  {taskCustomFields.map((field) => (
                    <div key={field.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          {getFieldTypeIcon(field.fieldType)}
                          {field.name}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveCustomField(field.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {renderTaskCustomFieldInput(field)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Field Modal */}
            <Dialog open={showAddFieldModal} onOpenChange={setShowAddFieldModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{intl.formatMessage({ id: 'modules.projects.createTask.addField' })}</DialogTitle>
                  <DialogDescription>
                    {intl.formatMessage({ id: 'modules.projects.createTask.customFieldsDescription' })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{intl.formatMessage({ id: 'modules.projects.createTask.fieldName' })}</Label>
                    <Input
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'modules.projects.createTask.fieldNamePlaceholder' })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{intl.formatMessage({ id: 'modules.projects.createTask.fieldType' })}</Label>
                    <Select value={newFieldType} onValueChange={(v: CustomFieldType) => setNewFieldType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">
                          <div className="flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.text' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="number">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.number' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="date">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.date' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="select">
                          <div className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.select' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="multi_select">
                          <div className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.multiSelect' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="checkbox">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.checkbox' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="url">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.url' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.email' })}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="phone">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{intl.formatMessage({ id: 'modules.projects.createTask.fieldTypeOptions.phone' })}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Options for select types */}
                  {['select', 'multi_select'].includes(newFieldType) && (
                    <div className="space-y-2">
                      <Label>{intl.formatMessage({ id: 'modules.projects.createTask.options' })}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newOptionInput}
                          onChange={(e) => setNewOptionInput(e.target.value)}
                          placeholder={intl.formatMessage({ id: 'modules.projects.createTask.optionPlaceholder' })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (newOptionInput.trim() && !newFieldOptions.some(o => o.label === newOptionInput.trim())) {
                                setNewFieldOptions([...newFieldOptions, { label: newOptionInput.trim() }])
                                setNewOptionInput('')
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (newOptionInput.trim() && !newFieldOptions.some(o => o.label === newOptionInput.trim())) {
                              setNewFieldOptions([...newFieldOptions, { label: newOptionInput.trim() }])
                              setNewOptionInput('')
                            }
                          }}
                        >
                          {intl.formatMessage({ id: 'modules.projects.createTask.add' })}
                        </Button>
                      </div>
                      {newFieldOptions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newFieldOptions.map((opt, idx) => (
                            <Badge key={idx} variant="secondary">
                              {opt.label}
                              <button
                                onClick={() => setNewFieldOptions(newFieldOptions.filter((_, i) => i !== idx))}
                                className="ml-1 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddFieldModal(false)}>
                    {intl.formatMessage({ id: 'modules.projects.createTask.cancel' })}
                  </Button>
                  <Button
                    onClick={handleCreateCustomField}
                    disabled={!newFieldName.trim()}
                  >
                    {intl.formatMessage({ id: 'modules.projects.createTask.addField' })}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {intl.formatMessage({ id: 'modules.projects.createTask.cancel' })}
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid() || isSubmitting}>
            {isSubmitting
              ? intl.formatMessage({ id: isEditMode ? 'modules.projects.createTask.updating' : 'modules.projects.createTask.creating' })
              : intl.formatMessage({ id: isEditMode ? 'modules.projects.createTask.updateTask' : 'modules.projects.createTask.createTask' })
            }
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        isOpen={filePreviewOpen}
        onClose={() => {
          setFilePreviewOpen(false)
          setFilePreviewData(null)
        }}
        file={filePreviewData}
        isLoading={filePreviewLoading}
      />

      {/* Event Preview Dialog */}
      <EventPreviewDialog
        isOpen={eventPreviewOpen}
        onClose={() => {
          setEventPreviewOpen(false)
          setEventPreviewData(null)
        }}
        event={eventPreviewData}
        isLoading={eventPreviewLoading}
      />
    </Dialog>
  )
}
