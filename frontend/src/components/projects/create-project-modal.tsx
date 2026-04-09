import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectsStore } from '@/stores/useProjectsStore'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ProjectType } from '@/types/projects'
// import { mockUsers } from '@/lib/mock-data' // Removed - use real API data
import { useToast } from '@/components/ui/use-toast'
import {
  Check,

  Target,
  GitBranch,
  Bug,
  Zap,
  Microscope,

  Plus,
  X,
  GripVertical,
  Sparkles,
  Loader2,
  FileText,
  Calendar,
  FolderOpen
} from 'lucide-react'
import { projectService, projectKeys } from '@/lib/api/projects-api'
import { fileApi } from '@/lib/api/files-api'
import { calendarApi } from '@/lib/api/calendar-api'
import { useGenerateDescriptionSuggestions } from '@/lib/api/ai-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { FilePreviewDialog } from '@/components/files/FileOperationDialogs'
import { EventPreviewDialog } from '@/components/calendar/EventPreviewDialog'
import type { CalendarEventAPI } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onProjectCreated?: (project?: any) => void
  project?: any // Project to edit (optional)
  initialName?: string // Initial project name from Slack (optional)
}

export function CreateProjectModal({ open, onOpenChange, workspaceId, onProjectCreated, project, initialName }: CreateProjectModalProps) {
  const intl = useIntl()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: '',
    type: '' as ProjectType | '',
    leadId: '',
    defaultAssigneeIds: [] as string[],
    statusColumns: [
      { id: '1', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.toDo', defaultMessage: 'To Do' }), color: 'bg-blue-500' },
      { id: '2', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.inProgress', defaultMessage: 'In Progress' }), color: 'bg-yellow-500' },
      { id: '3', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.done', defaultMessage: 'Done' }), color: 'bg-green-500' }
    ]
  })
  const [attachments, setAttachments] = useState<RichTextAttachment[]>([])
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)
  const isEditMode = !!project

  // State for attachment preview dialogs
  const [filePreviewOpen, setFilePreviewOpen] = useState(false)
  const [filePreviewData, setFilePreviewData] = useState<any>(null)
  const [filePreviewLoading, setFilePreviewLoading] = useState(false)
  const [eventPreviewOpen, setEventPreviewOpen] = useState(false)
  const [eventPreviewData, setEventPreviewData] = useState<CalendarEventAPI | null>(null)
  const [eventPreviewLoading, setEventPreviewLoading] = useState(false)

  const navigate = useNavigate()

  // Fetch workspace members
  const { data: workspaceMembers = [], isLoading: membersLoading } = useWorkspaceMembers(workspaceId)

  // Debug: Log attachments whenever they change
  useEffect(() => {
    console.log('📌 Attachments state changed:', attachments)
  }, [attachments])

  const queryClient = useQueryClient()
  const { toast } = useToast()
  const descriptionMutation = useGenerateDescriptionSuggestions()

  // Helper function to get icon for attachment type
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'notes':
        return <FileText className="h-4 w-4" />
      case 'events':
        return <Calendar className="h-4 w-4" />
      case 'files':
        return <FolderOpen className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Handle click on linked attachment
  const handleAttachmentClick = async (attachment: RichTextAttachment) => {
    if (!workspaceId) return

    if (attachment.type === 'notes') {
      // Navigate to the note
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
          title: intl.formatMessage({ id: 'modules.projects.createProject.toast.error', defaultMessage: 'Error' }),
          description: intl.formatMessage({ id: 'modules.projects.createProject.toast.failedToLoadFile', defaultMessage: 'Failed to load file' }),
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
          title: intl.formatMessage({ id: 'modules.projects.createProject.toast.error', defaultMessage: 'Error' }),
          description: intl.formatMessage({ id: 'modules.projects.createProject.toast.failedToLoadEvent', defaultMessage: 'Failed to load event' }),
          variant: 'destructive'
        })
        setEventPreviewData(null)
      } finally {
        setEventPreviewLoading(false)
      }
    } else if (attachment.type === 'drive') {
      // Open Google Drive file in new tab
      if (attachment.driveFileUrl) {
        window.open(attachment.driveFileUrl, '_blank', 'noopener,noreferrer')
      } else {
        toast({
          title: intl.formatMessage({ id: 'modules.projects.createProject.toast.error', defaultMessage: 'Error' }),
          description: intl.formatMessage({ id: 'modules.projects.createProject.toast.driveUrlNotAvailable', defaultMessage: 'Drive file URL not available' }),
          variant: 'destructive'
        })
      }
    }
  }

  // Pre-fill project name from Slack
  useEffect(() => {
    if (open && initialName && !project) {
      setFormData(prev => ({
        ...prev,
        name: initialName,
      }))
    }
  }, [open, initialName, project])

  // Prefill form data when editing
  useEffect(() => {
    console.log('🚀 useEffect triggered:', { project: !!project, projectData: project, open, workspaceId, isEditMode })

    const loadProjectData = () => {
      if (!project || !open) {
        console.log('⚠️ Early return - no project or not open')
        return
      }

      console.log('🔄 Loading project data:', JSON.stringify(project, null, 2))
      // Convert hex colors to Tailwind classes
      const hexToTailwind: Record<string, string> = {
        '#3B82F6': 'bg-blue-500',
        '#EAB308': 'bg-yellow-500',
        '#22C55E': 'bg-green-500',
        '#EF4444': 'bg-red-500',
        '#A855F7': 'bg-purple-500',
        '#F97316': 'bg-orange-500',
        '#EC4899': 'bg-pink-500',
        '#6366F1': 'bg-indigo-500',
        '#14B8A6': 'bg-teal-500',
        '#06B6D4': 'bg-cyan-500'
      }

      // Map API project type to UI enum
      // Backend returns: kanban, scrum, bug_tracking, feature, research
      const typeMap: Record<string, ProjectType> = {
        'kanban': 'KANBAN' as ProjectType,
        'scrum': 'SCRUM' as ProjectType,
        'bug_tracking': 'BUG_TRACKING' as ProjectType,
        'feature': 'FEATURE_DEVELOPMENT' as ProjectType,
        'research': 'RESEARCH' as ProjectType
      }

      // Convert kanban_stages to status columns
      const statusColumns = project.kanban_stages?.length > 0
        ? project.kanban_stages.map((stage: any) => ({
            id: stage.id,
            name: stage.name,
            color: hexToTailwind[stage.color] || 'bg-blue-500'
          }))
        : [
            { id: '1', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.toDo', defaultMessage: 'To Do' }), color: 'bg-blue-500' },
            { id: '2', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.inProgress', defaultMessage: 'In Progress' }), color: 'bg-yellow-500' },
            { id: '3', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.done', defaultMessage: 'Done' }), color: 'bg-green-500' }
          ]

      // Convert API attachments to UI format
      // Attachments are now enriched with full details from the backend
      const parseAttachments = () => {
        console.log('📦 Project attachments:', project.attachments)
        const projectAttachments: Array<{ id: string; title: string; type: 'notes' | 'events' | 'files' }> = []

        if (project.attachments) {
          console.log('✅ Has attachments, processing enriched data...')

          // Process note attachments (already enriched with id, title, icon)
          if (project.attachments.note_attachment && project.attachments.note_attachment.length > 0) {
            for (const note of project.attachments.note_attachment) {
              // Handle both enriched object format and legacy string ID format
              if (typeof note === 'object' && note.id) {
                projectAttachments.push({
                  id: note.id,
                  title: note.title || 'Untitled Note',
                  type: 'notes'
                })
              } else if (typeof note === 'string') {
                // Fallback for legacy format (just ID string)
                projectAttachments.push({
                  id: note,
                  title: `Note ${note.slice(0, 8)}`,
                  type: 'notes'
                })
              }
            }
          }

          // Process file attachments (already enriched with id, name, type, size, url)
          if (project.attachments.file_attachment && project.attachments.file_attachment.length > 0) {
            for (const file of project.attachments.file_attachment) {
              // Handle both enriched object format and legacy string ID format
              if (typeof file === 'object' && file.id) {
                projectAttachments.push({
                  id: file.id,
                  title: file.name || 'Untitled File',
                  type: 'files'
                })
              } else if (typeof file === 'string') {
                // Fallback for legacy format (just ID string)
                projectAttachments.push({
                  id: file,
                  title: `File ${file.slice(0, 8)}`,
                  type: 'files'
                })
              }
            }
          }

          // Process event attachments (already enriched with id, title, start_time, end_time)
          if (project.attachments.event_attachment && project.attachments.event_attachment.length > 0) {
            for (const event of project.attachments.event_attachment) {
              // Handle both enriched object format and legacy string ID format
              if (typeof event === 'object' && event.id) {
                projectAttachments.push({
                  id: event.id,
                  title: event.title || 'Untitled Event',
                  type: 'events'
                })
              } else if (typeof event === 'string') {
                // Fallback for legacy format (just ID string)
                projectAttachments.push({
                  id: event,
                  title: `Event ${event.slice(0, 8)}`,
                  type: 'events'
                })
              }
            }
          }
        }

        console.log('💾 Setting attachments:', projectAttachments)
        setAttachments(projectAttachments)
      }

      // Parse attachments (no async needed since data is already enriched)
      parseAttachments()

      const newFormData = {
        name: project.name || '',
        description: project.description || '',
        key: project.key || generateProjectKey(project.name || ''),
        type: typeMap[project.type] || '' as ProjectType | '',
        leadId: project.collaborative_data?.project_lead || project.lead_id || '',
        defaultAssigneeIds: project.collaborative_data?.default_assignee_ids || [],
        statusColumns
      }
      console.log('📝 Setting form data:', newFormData)
      setFormData(newFormData)
    }

    if (project && open) {
      console.log('✅ Calling loadProjectData')
      loadProjectData()
    } else if (!open) {
      // Reset form when modal closes
      console.log('🔄 Resetting form (modal closed)')
      resetForm()
      setAttachments([])
    }
  }, [project, open, workspaceId])

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert color from Tailwind class to hex color
      const colorMap: Record<string, string> = {
        'bg-blue-500': '#3B82F6',
        'bg-yellow-500': '#EAB308',
        'bg-green-500': '#22C55E',
        'bg-red-500': '#EF4444',
        'bg-purple-500': '#A855F7',
        'bg-orange-500': '#F97316',
        'bg-pink-500': '#EC4899',
        'bg-indigo-500': '#6366F1',
        'bg-teal-500': '#14B8A6',
        'bg-cyan-500': '#06B6D4'
      }

      // Map project type from UI enum to API format (snake_case)
      // Backend accepts: kanban, scrum, bug_tracking, feature, research
      const typeMap: Record<string, 'kanban' | 'scrum' | 'bug_tracking' | 'feature' | 'research'> = {
        'KANBAN': 'kanban',
        'SCRUM': 'scrum',
        'BUG_TRACKING': 'bug_tracking',
        'FEATURE_DEVELOPMENT': 'feature',
        'RESEARCH': 'research'
      }

      // Prepare kanban stages from status columns
      const kanban_stages = data.statusColumns?.map((col: any, index: number) => ({
        id: col.id,
        name: col.name,
        order: index,
        color: colorMap[col.color] || '#3B82F6'
      }))

      // Prepare attachments in API format
      const apiAttachments = {
        note_attachment: attachments.filter(att => att.type === 'notes').map(att => att.id),
        file_attachment: attachments.filter(att => att.type === 'files').map(att => att.id),
        event_attachment: attachments.filter(att => att.type === 'events').map(att => att.id)
      }

      // Prepare collaborative data (without attachments - they go at top level)
      const collaborativeData = {
        project_lead: data.leadId || null,
        default_assignee_ids: data.defaultAssigneeIds || []
      }

      console.log('🔍 [Project Create] Submitting project data:', {
        name: data.name,
        leadId: data.leadId,
        defaultAssigneeIds: data.defaultAssigneeIds,
        hasLeadId: !!data.leadId,
        collaborativeData
      });

      if (isEditMode && project) {
        // Update existing project
        const updatePayload = {
          name: data.name,
          description: data.description,
          type: data.type ? typeMap[data.type] : 'kanban',
          status: project.status || 'active',
          priority: (project.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
          lead_id: data.leadId,
          kanban_stages: kanban_stages,
          collaborative_data: collaborativeData,
          attachments: apiAttachments
        };
        console.log('📤 [Project Update] Payload:', updatePayload);
        return await projectService.updateProject(workspaceId, project.id, updatePayload);
      } else {
        // Create new project
        const createPayload = {
          name: data.name,
          description: data.description,
          type: data.type ? typeMap[data.type] : 'kanban',
          status: 'active' as const,
          priority: 'medium' as const,
          lead_id: data.leadId,
          kanban_stages: kanban_stages,
          collaborative_data: collaborativeData,
          attachments: apiAttachments
        };
        console.log('📤 [Project Create] Payload:', createPayload);
        return await projectService.createProject(workspaceId, createPayload);
      }
    },
    onSuccess: (result) => {
      console.log('✅ [Project Modal] Mutation success, result:', result);
      console.log('✅ [Project Modal] Mode check:', { isEditMode, hasProject: !!project, projectId: project?.id });

      // Extract the actual project from the response
      // API returns { data: Project[], count: number } or just Project
      const resultAny = result as any;
      const actualProject = Array.isArray(resultAny?.data) ? resultAny.data[0] : result;
      console.log('✅ [Project Modal] Extracted project:', actualProject);

      // Update Zustand store immediately for instant UI update
      // Double-check: only update if we have a valid project.id to update
      if (isEditMode && project?.id) {
        useProjectsStore.getState().updateProject(project.id, actualProject);
        console.log('✅ [Project Modal] Updated project in Zustand store, ID:', project.id);
      } else {
        useProjectsStore.getState().addProject(actualProject);
        console.log('✅ [Project Modal] Added project to Zustand store, ID:', actualProject?.id);
      }

      // Invalidate to sync with server (setProjects will be called when refetch completes)
      // Use projectKeys.lists() to match the actual query key structure
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast({
        title: intl.formatMessage({ id: isEditMode ? 'modules.projects.createProject.toast.projectUpdated' : 'modules.projects.createProject.toast.projectCreated' }),
        description: intl.formatMessage(
          { id: isEditMode ? 'modules.projects.createProject.toast.projectUpdatedDescription' : 'modules.projects.createProject.toast.projectCreatedDescription' },
          { name: formData.name }
        ),
      })
      console.log('🎯 Calling onProjectCreated with project:', actualProject)
      onProjectCreated?.(actualProject)
      onOpenChange(false)
      resetForm()
    },
    onError: (error: any) => {
      toast({
        title: intl.formatMessage({ id: isEditMode ? 'modules.projects.createProject.toast.failedToUpdate' : 'modules.projects.createProject.toast.failedToCreate' }),
        description: error.message || intl.formatMessage({ id: 'modules.projects.createProject.toast.somethingWrong' }),
        variant: "destructive",
      })
    }
  })

  const projectTypeOptions = [
    {
      type: 'KANBAN' as ProjectType,
      title: intl.formatMessage({ id: 'modules.projects.createProject.projectType.kanban.title', defaultMessage: 'Kanban Board' }),
      description: intl.formatMessage({ id: 'modules.projects.createProject.projectType.kanban.description', defaultMessage: 'Continuous flow workflow for ongoing projects' }),
      icon: <GitBranch className="w-6 h-6" />,
      features: [
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.kanban.features.continuousFlow', defaultMessage: 'Continuous flow' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.kanban.features.wipLimits', defaultMessage: 'WIP limits' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.kanban.features.leadTime', defaultMessage: 'Lead time tracking' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.kanban.features.cumulativeFlow', defaultMessage: 'Cumulative flow' })
      ],
      color: 'bg-green-200/30 dark:bg-green-900/30 border-green-500/30'
    },
    {
      type: 'SCRUM' as ProjectType,
      title: intl.formatMessage({ id: 'modules.projects.createProject.projectType.scrum.title', defaultMessage: 'Scrum Board' }),
      description: intl.formatMessage({ id: 'modules.projects.createProject.projectType.scrum.description', defaultMessage: 'Sprint-based agile workflow with backlog management' }),
      icon: <Target className="w-6 h-6" />,
      features: [
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.scrum.features.sprintPlanning', defaultMessage: 'Sprint planning' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.scrum.features.backlog', defaultMessage: 'Backlog management' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.scrum.features.burndown', defaultMessage: 'Burndown charts' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.scrum.features.velocity', defaultMessage: 'Velocity tracking' })
      ],
      color: 'bg-blue-200/30 dark:bg-blue-900/30 border-blue-500/30'
    },
    {
      type: 'BUG_TRACKING' as ProjectType,
      title: intl.formatMessage({ id: 'modules.projects.createProject.projectType.bugTracking.title', defaultMessage: 'Bug Tracking' }),
      description: intl.formatMessage({ id: 'modules.projects.createProject.projectType.bugTracking.description', defaultMessage: 'Issue tracking and resolution workflow' }),
      icon: <Bug className="w-6 h-6" />,
      features: [
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.bugTracking.features.issueTracking', defaultMessage: 'Issue tracking' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.bugTracking.features.severity', defaultMessage: 'Severity levels' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.bugTracking.features.resolution', defaultMessage: 'Resolution workflow' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.bugTracking.features.reports', defaultMessage: 'Bug reports' })
      ],
      color: 'bg-red-200/30 dark:bg-red-900/30 border-red-500/30'
    },
    {
      type: 'FEATURE_DEVELOPMENT' as ProjectType,
      title: intl.formatMessage({ id: 'modules.projects.createProject.projectType.featureDevelopment.title', defaultMessage: 'Feature Development' }),
      description: intl.formatMessage({ id: 'modules.projects.createProject.projectType.featureDevelopment.description', defaultMessage: 'Feature request to completion workflow' }),
      icon: <Zap className="w-6 h-6" />,
      features: [
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.featureDevelopment.features.requests', defaultMessage: 'Feature requests' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.featureDevelopment.features.development', defaultMessage: 'Development workflow' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.featureDevelopment.features.release', defaultMessage: 'Release planning' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.featureDevelopment.features.feedback', defaultMessage: 'User feedback' })
      ],
      color: 'bg-orange-200/30 dark:bg-orange-900/30 border-orange-500/30'
    },
    {
      type: 'RESEARCH' as ProjectType,
      title: intl.formatMessage({ id: 'modules.projects.createProject.projectType.research.title', defaultMessage: 'Research Project' }),
      description: intl.formatMessage({ id: 'modules.projects.createProject.projectType.research.description', defaultMessage: 'Research and documentation workflow' }),
      icon: <Microscope className="w-6 h-6" />,
      features: [
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.research.features.researchTasks', defaultMessage: 'Research tasks' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.research.features.documentation', defaultMessage: 'Documentation' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.research.features.knowledgeBase', defaultMessage: 'Knowledge base' }),
        intl.formatMessage({ id: 'modules.projects.createProject.projectType.research.features.collaborative', defaultMessage: 'Collaborative notes' })
      ],
      color: 'bg-purple-200/30 dark:bg-purple-900/30 border-purple-500/30'
    }
  ]

  const generateProjectKey = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 5)
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      key: prev.key || generateProjectKey(name)
    }))
  }

  const statusColors = [
    'bg-blue-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-cyan-500'
  ]

  const addStatusColumn = () => {
    const newColumn = {
      id: Date.now().toString(),
      name: '',
      color: statusColors[formData.statusColumns.length % statusColors.length]
    }
    setFormData(prev => ({
      ...prev,
      statusColumns: [...prev.statusColumns, newColumn]
    }))
  }

  const removeStatusColumn = (id: string) => {
    if (formData.statusColumns.length > 2) {
      setFormData(prev => ({
        ...prev,
        statusColumns: prev.statusColumns.filter(col => col.id !== id)
      }))
    }
  }

  const updateStatusColumn = (id: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      statusColumns: prev.statusColumns.map(col =>
        col.id === id ? { ...col, name } : col
      )
    }))
  }

  const updateStatusColumnColor = (id: string, color: string) => {
    setFormData(prev => ({
      ...prev,
      statusColumns: prev.statusColumns.map(col =>
        col.id === id ? { ...col, color } : col
      )
    }))
  }

  const generateAIDescription = async () => {
    // Validate that project name is filled
    if (!formData.name.trim()) {
      toast({
        title: intl.formatMessage({ id: 'modules.projects.createProject.toast.nameRequired', defaultMessage: 'Project name required' }),
        description: intl.formatMessage({ id: 'modules.projects.createProject.toast.nameRequiredDescription', defaultMessage: 'Please fill in the project name first before generating AI description' }),
        variant: "destructive"
      })
      return
    }

    setAiDescriptionLoading(true)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)

    try {
      const projectName = formData.name.trim()
      const projectType = formData.type

      // Build context based on project type
      let context = ''
      if (projectType) {
        const typeDescriptions: Record<ProjectType, string> = {
          [ProjectType.KANBAN]: 'Kanban workflow focusing on visual task management',
          [ProjectType.SCRUM]: 'Scrum methodology with sprints and iterative development',
          [ProjectType.BUG_TRACKING]: 'Bug tracking and issue resolution',
          [ProjectType.FEATURE_DEVELOPMENT]: 'Feature development and product enhancements',
          [ProjectType.RESEARCH]: 'Research, investigation, and knowledge discovery'
        }
        context = typeDescriptions[projectType] || ''
      }

      // Call the unified description suggestions API
      const response = await descriptionMutation.mutateAsync({
        type: 'project',
        title: projectName,
        context: context || undefined,
        count: 3,
        tone: 'professional',
        length: 'medium',
      })

      // Backend returns already parsed suggestions
      setDescriptionSuggestions(response.suggestions)
      setShowDescriptionSuggestions(true)

      toast({
        title: intl.formatMessage({ id: 'modules.projects.createProject.ai.descriptionsGenerated', defaultMessage: 'Descriptions generated' }),
        description: intl.formatMessage({ id: 'modules.projects.createProject.ai.selectDescription', defaultMessage: 'Select one of the AI-generated descriptions below' }),
      })
    } catch (error) {
      console.error('AI description generation failed:', error)
      toast({
        title: intl.formatMessage({ id: 'modules.projects.createProject.toast.generationFailed', defaultMessage: 'Generation failed' }),
        description: intl.formatMessage({ id: 'modules.projects.createProject.toast.generationFailedDescription', defaultMessage: 'Failed to generate descriptions. Please try again or write one manually.' }),
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

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    console.log('🚀 [Project Create] handleSubmit called with formData:', {
      name: formData.name,
      leadId: formData.leadId,
      defaultAssigneeIds: formData.defaultAssigneeIds,
      hasLeadId: !!formData.leadId,
      leadIdLength: formData.leadId?.length,
      formData
    });
    createProjectMutation.mutate(formData)
  }

  const resetForm = () => {
    setStep(1)
    setAiDescriptionLoading(false)
    setAttachments([])
    setFormData({
      name: '',
      description: '',
      key: '',
      type: '' as ProjectType | '',
      leadId: '',
      defaultAssigneeIds: [],
      statusColumns: [
        { id: '1', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.toDo', defaultMessage: 'To Do' }), color: 'bg-blue-500' },
        { id: '2', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.inProgress', defaultMessage: 'In Progress' }), color: 'bg-yellow-500' },
        { id: '3', name: intl.formatMessage({ id: 'modules.projects.createProject.status.defaults.done', defaultMessage: 'Done' }), color: 'bg-green-500' }
      ]
    })
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name.trim() && formData.key.trim()
      case 2:
        return formData.statusColumns.length >= 2 && formData.statusColumns.every(col => col.name.trim())
      case 3:
        return formData.type
      case 4:
        return !!formData.leadId
      default:
        return false
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({
              id: isEditMode ? 'modules.projects.createProject.editTitle' : 'modules.projects.createProject.title'
            })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({
              id: isEditMode ? 'modules.projects.createProject.editDescription' : 'modules.projects.createProject.description'
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {[1, 2, 3, 4].map(num => (
            <div key={num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= num
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step > num ? <Check className="w-4 h-4" /> : num}
              </div>
              {num < 4 && (
                <div className={`w-12 h-px ${
                  step > num ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {intl.formatMessage({ id: 'modules.projects.createProject.projectDetails' })}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {intl.formatMessage({ id: 'modules.projects.createProject.projectName' })}*
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'modules.projects.createProject.projectNamePlaceholder' })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key">
                      {intl.formatMessage({ id: 'modules.projects.createProject.projectKey' })}*
                    </Label>
                    <Input
                      id="key"
                      value={formData.key}
                      onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                      placeholder="PROJECT"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      {intl.formatMessage(
                        { id: 'modules.projects.createProject.keyHelper', defaultMessage: 'This will be used as a prefix for task keys (e.g., {key}-1)' },
                        { key: formData.key || 'KEY' }
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">
                      {intl.formatMessage({ id: 'modules.projects.createProject.labels.description', defaultMessage: 'Description' })}
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAIDescription}
                      disabled={
                        aiDescriptionLoading ||
                        !formData.name.trim()
                      }
                      className="text-xs"
                    >
                      {aiDescriptionLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          {intl.formatMessage({ id: 'modules.projects.createProject.ai.generating', defaultMessage: 'Generating...' })}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {formData.description.trim()
                            ? intl.formatMessage({ id: 'modules.projects.createProject.ai.fixWithAI', defaultMessage: 'Fix with AI' })
                            : intl.formatMessage({ id: 'modules.projects.createProject.ai.createWithAI', defaultMessage: 'Create with AI' })}
                        </>
                      )}
                    </Button>
                  </div>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    placeholder={intl.formatMessage({ id: 'modules.projects.createProject.placeholders.description', defaultMessage: 'Describe your project or type / to insert content from notes, files, or events...' })}
                    minHeight="100px"
                    enableMentions={true}
                    attachments={attachments}
                    onAttachmentsChange={setAttachments}
                  />

                  {/* AI Description Suggestions */}
                  {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.projects.createProject.ai.suggestions', defaultMessage: 'AI Suggestions (click to select):' })}
                      </div>
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
                        {intl.formatMessage(
                          { id: 'modules.projects.createProject.linkedItems', defaultMessage: 'Linked Items ({count})' },
                          { count: attachments.length }
                        )}
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
                              title={intl.formatMessage({ id: 'modules.projects.createProject.removeLink', defaultMessage: 'Remove link' })}
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
            </div>
          )}

          {/* Step 2: Status Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {intl.formatMessage({ id: 'modules.projects.createProject.status.title', defaultMessage: 'Configure Status Columns' })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {intl.formatMessage({ id: 'modules.projects.createProject.status.description', defaultMessage: 'Define the workflow stages for your project. These will become the columns in your board view.' })}
                </p>
              </div>

              <div className="space-y-3">
                {formData.statusColumns.map((column, index) => (
                  <div key={column.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{index + 1}.</span>
                    </div>

                    <div className="flex-1">
                      <Input
                        value={column.name}
                        onChange={(e) => updateStatusColumn(column.id, e.target.value)}
                        placeholder={intl.formatMessage({ id: 'modules.projects.createProject.status.placeholder', defaultMessage: 'Status name (e.g., To Do, In Progress, Done)' })}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {statusColors.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => updateStatusColumnColor(column.id, color)}
                            className={`w-6 h-6 rounded-full border-2 ${color} ${
                              column.color === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                          />
                        ))}
                      </div>

                      {formData.statusColumns.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStatusColumn(column.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addStatusColumn}
                  className="w-full"
                  disabled={formData.statusColumns.length >= 8}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.projects.createProject.status.addColumn', defaultMessage: 'Add Status Column' })}
                </Button>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">
                    {intl.formatMessage({ id: 'modules.projects.createProject.status.preview', defaultMessage: 'Preview Board Layout:' })}
                  </h4>
                  <div className="flex gap-2 overflow-x-auto">
                    {formData.statusColumns.map((column, index) => (
                      <div
                        key={column.id}
                        className="flex-shrink-0 w-32 p-2 bg-background border rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${column.color}`} />
                          <span className="text-xs font-medium truncate">
                            {column.name || `Column ${index + 1}`}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-8 bg-muted rounded text-xs flex items-center justify-center">
                            {intl.formatMessage({ id: 'modules.projects.createProject.status.taskLabel', defaultMessage: 'Task' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Project Type */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {intl.formatMessage({ id: 'modules.projects.createProject.projectType.title', defaultMessage: 'Choose Project Type' })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {intl.formatMessage({ id: 'modules.projects.createProject.projectType.description', defaultMessage: 'Select the workflow that best fits your project needs' })}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {projectTypeOptions.map(option => (
                  <Card
                    key={option.type}
                    className={`cursor-pointer transition-all ${
                      formData.type === option.type
                        ? 'ring-2 ring-primary ' + option.color
                        : 'hover:shadow-md ' + option.color
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, type: option.type }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-background">
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{option.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {option.features.map(feature => (
                              <Badge key={feature} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {formData.type === option.type && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Team Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.title', defaultMessage: 'Team Setup' })}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lead">
                      {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.projectLead', defaultMessage: 'Project Lead' })}*
                    </Label>
                    <Select
                      value={formData.leadId}
                      onValueChange={(value) => {
                        console.log('👤 [Project Lead] Selected:', value);
                        setFormData(prev => ({
                          ...prev,
                          leadId: value,
                          // Remove the new lead from project members if they were selected
                          defaultAssigneeIds: prev.defaultAssigneeIds.filter(id => id !== value)
                        }))
                      }}
                      disabled={membersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={membersLoading
                          ? intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.loadingMembers', defaultMessage: 'Loading members...' })
                          : intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.selectProjectLead', defaultMessage: 'Select project lead' })
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaceMembers.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                                {member.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                              </div>
                              <span>{member.user?.name || member.name || member.user?.email || member.email || 'Unknown'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.leadId && (
                      <p className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.selected', defaultMessage: 'Selected' })}: {workspaceMembers.find(m => m.user_id === formData.leadId)?.user?.name || formData.leadId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.projectMembers', defaultMessage: 'Project Members' })}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.projectMembersDescription', defaultMessage: 'Select team members who will work on this project (optional)' })}
                    </p>
                    <div className="border rounded-md p-2 space-y-2 max-h-48 overflow-y-auto">
                      {membersLoading ? (
                        <p className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.loadingMembers', defaultMessage: 'Loading members...' })}
                        </p>
                      ) : workspaceMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.projects.createProject.teamSetup.noWorkspaceMembers', defaultMessage: 'No workspace members found' })}
                        </p>
                      ) : (
                        workspaceMembers
                          .filter(member => member.user_id !== formData.leadId)
                          .map(member => (
                            <label
                              key={member.user_id}
                              className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.defaultAssigneeIds.includes(member.user_id)}
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    defaultAssigneeIds: e.target.checked
                                      ? [...prev.defaultAssigneeIds, member.user_id]
                                      : prev.defaultAssigneeIds.filter(id => id !== member.user_id)
                                  }))
                                }}
                                className="rounded"
                              />
                              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                                {member.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || member.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                              </div>
                              <span className="text-sm">{member.user?.name || member.name || member.user?.email || member.email || 'Unknown'}</span>
                            </label>
                          ))
                      )}
                    </div>
                    {formData.defaultAssigneeIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {intl.formatMessage(
                          { id: 'modules.projects.createProject.teamSetup.membersSelected', defaultMessage: '{count} member(s) selected' },
                          { count: formData.defaultAssigneeIds.length }
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h4 className="font-medium">
                    {intl.formatMessage({ id: 'modules.projects.createProject.summary.title', defaultMessage: 'Project Summary' })}
                  </h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.projects.createProject.summary.name', defaultMessage: 'Name:' })}
                      </span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.projects.createProject.summary.key', defaultMessage: 'Key:' })}
                      </span>
                      <span className="font-mono">{formData.key}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.projects.createProject.summary.type', defaultMessage: 'Type:' })}
                      </span>
                      <span>{formData.type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.projects.createProject.summary.lead', defaultMessage: 'Lead:' })}
                      </span>
                      <span>
                        {workspaceMembers.find(m => m.user_id === formData.leadId)?.user?.name ||
                         workspaceMembers.find(m => m.user_id === formData.leadId)?.name ||
                         workspaceMembers.find(m => m.user_id === formData.leadId)?.user?.email ||
                         workspaceMembers.find(m => m.user_id === formData.leadId)?.email ||
                         intl.formatMessage({ id: 'modules.projects.createProject.summary.notSelected', defaultMessage: 'Not selected' })}
                      </span>
                    </div>
                    {formData.defaultAssigneeIds.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.projects.createProject.summary.projectMembers', defaultMessage: 'Project Members:' })}
                        </span>
                        <span>
                          {intl.formatMessage(
                            { id: 'modules.projects.createProject.summary.membersCount', defaultMessage: '{count} member(s)' },
                            { count: formData.defaultAssigneeIds.length }
                          )}
                        </span>
                      </div>
                    )}
                    {formData.description && (
                      <div>
                        <span className="text-sm text-muted-foreground">
                          {intl.formatMessage({ id: 'modules.projects.createProject.summary.description', defaultMessage: 'Description:' })}
                        </span>
                        <div
                          className="text-sm mt-1 prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: formData.description }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleBack} disabled={step === 1}>
              {intl.formatMessage({ id: 'modules.projects.createProject.back' })}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {intl.formatMessage({ id: 'modules.projects.createProject.cancel' })}
              </Button>
              {step < 4 ? (
                <Button onClick={handleNext} disabled={!isStepValid()}>
                  {intl.formatMessage({ id: 'modules.projects.createProject.next' })}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!isStepValid() || createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {intl.formatMessage({ id: isEditMode ? 'modules.projects.createProject.updating' : 'modules.projects.createProject.creating' })}
                    </>
                  ) : (
                    intl.formatMessage({ id: isEditMode ? 'modules.projects.createProject.updateProject' : 'modules.projects.createProject.createProject' })
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
    </>
  )
}
