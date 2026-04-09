import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart3,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Clock,
  User,
  Loader2,
  GitBranch,
  Target,
  Bug,
  Zap,
  Microscope,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive,
  Copy,
  Star,
  XCircle,
  FolderKanban
} from 'lucide-react'
import { projectService, type Project, projectKeys, useDeleteProject, useProjects } from '@/lib/api/projects-api'
import { ProjectType } from '@/types/projects'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'
import { useAuth } from '@/contexts/AuthContext'
import { useProjectsStore } from '@/stores/useProjectsStore'

interface ProjectDashboardProps {
  workspaceId: string
  onProjectSelect?: (projectId: string) => void
  onEditProject?: (project: any) => void
}

export function ProjectDashboard({ workspaceId, onProjectSelect, onEditProject }: ProjectDashboardProps) {
  const intl = useIntl()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<ProjectType | 'ALL'>('ALL')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Use the delete mutation hook that updates Zustand store
  const deleteProjectMutation = useDeleteProject()

  // ALWAYS use Zustand store as single source of truth
  const allProjects = useProjectsStore((state) => state.projects) || []
  const lastRefresh = useProjectsStore((state) => state.lastRefresh)

  // Map UI project type to API type format (snake_case)
  const getApiTypeFilter = (uiType: ProjectType | 'ALL') => {
    if (uiType === 'ALL') return undefined

    const typeMap: Record<ProjectType, 'kanban' | 'scrum' | 'waterfall' | 'bug_tracking' | 'feature_development' | 'research'> = {
      [ProjectType.KANBAN]: 'kanban',
      [ProjectType.SCRUM]: 'scrum',
      [ProjectType.BUG_TRACKING]: 'bug_tracking',
      [ProjectType.FEATURE_DEVELOPMENT]: 'feature_development',
      [ProjectType.RESEARCH]: 'research'
    }

    return typeMap[uiType]
  }

  // Fetch projects - this automatically syncs with Zustand store
  const { isLoading, error, refetch } = useProjects(workspaceId)

  console.log('[Dashboard] Projects:', allProjects.length, 'Filter:', selectedType, 'lastRefresh:', lastRefresh)
  console.log('[Dashboard] Project names:', allProjects.map(p => p.name))

  // Apply client-side filtering if a type is selected
  const projects = selectedType !== 'ALL'
    ? allProjects.filter(p => {
        const apiTypeFilter = getApiTypeFilter(selectedType)
        return apiTypeFilter ? p.type === apiTypeFilter : true
      })
    : allProjects

  // Fetch tasks for all projects
  // Use the same query key as sidebar and task view for cache consistency
  const taskQueries = useQueries({
    queries: projects.map(project => ({
      queryKey: projectKeys.tasks(project.id),
      queryFn: () => projectService.getTasks(workspaceId, project.id),
      enabled: !!workspaceId && !!project.id,
      staleTime: 60 * 1000,
    }))
  })

  // Calculate project metrics based on actual tasks
  const projectsWithMetrics = useMemo(() => {
    return projects.map((project, index) => {
      const tasks = taskQueries[index]?.data || []

      // Get the last stage (completed stage) from kanban_stages
      const lastStageId = project.kanban_stages && project.kanban_stages.length > 0
        ? project.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
        : 'completed' // fallback to 'completed' if no stages defined

      // Calculate metrics
      const totalTasks = tasks.length
      const doneTasks = tasks.filter((task: any) => task.status === lastStageId).length
      const pendingTasks = totalTasks - doneTasks

      // Calculate average progress
      let averageProgress = 0
      if (totalTasks > 0 && project.kanban_stages && project.kanban_stages.length > 0) {
        const sortedStages = project.kanban_stages.sort((a: any, b: any) => a.order - b.order)
        const totalStages = sortedStages.length

        const totalProgress = tasks.reduce((sum: number, task: any) => {
          const stageIndex = sortedStages.findIndex((stage: any) => stage.id === task.status)
          if (stageIndex === -1) return sum
          const taskProgress = ((stageIndex + 1) / totalStages) * 100
          return sum + taskProgress
        }, 0)

        averageProgress = Math.round(totalProgress / totalTasks)
      }

      return {
        ...project,
        taskCount: totalTasks,
        completedTaskCount: doneTasks,
        pendingTaskCount: pendingTasks,
        averageProgress
      }
    })
  }, [projects, taskQueries])

  // Filter by search term only (type filtering is done by API)
  const filteredProjects = projectsWithMetrics.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getProjectProgress = (project: any) => {
    return project.averageProgress || 0
  }

  const getOverallStats = () => {
    const totalProjects = projectsWithMetrics.length
    const totalTasks = projectsWithMetrics.reduce((sum, p) => sum + (p.taskCount || 0), 0)
    const completedTasks = projectsWithMetrics.reduce((sum, p) => sum + (p.completedTaskCount || 0), 0)

    // A project is completed when its progress is 100%
    const completedProjects = projectsWithMetrics.filter(p => (p as any).averageProgress === 100).length
    const inProgressProjects = projectsWithMetrics.filter(p => (p as any).averageProgress > 0 && (p as any).averageProgress < 100).length

    // Calculate average progress of all projects
    const totalProgress = projectsWithMetrics.reduce((sum, p) => sum + ((p as any).averageProgress || 0), 0)
    const averageCompletionRate = totalProjects > 0 ? totalProgress / totalProjects : 0

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      inProgressProjects,
      completedProjects,
      completionRate: averageCompletionRate
    }
  }

  const stats = getOverallStats()

  // Check if current user is the project owner
  const isProjectOwner = (project: Project) => {
    return project.owner_id === user?.id
  }

  // Project action handlers
  const handleViewProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onProjectSelect?.(projectId)
  }

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEditProject) {
      onEditProject(project)
    }
  }

  const handleDuplicateProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toast({
      title: "Duplicate Project",
      description: "Project duplication coming soon",
    })
  }

  const handleArchiveProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await projectService.archiveProject(projectId)
      toast({
        title: "Project Archived",
        description: "Project has been archived successfully",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete({ id: project.id, name: project.name })
    setDeleteModalOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    try {
      // Use the mutation hook that automatically updates Zustand store
      await deleteProjectMutation.mutateAsync({
        workspaceId,
        projectId: projectToDelete.id
      })

      toast({
        title: intl.formatMessage({ id: 'projects.projectDeleted' }),
        description: intl.formatMessage({ id: 'projects.deletedSuccessfully' }, { name: projectToDelete.name }),
      })
      setDeleteModalOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'projects.loadingProjects' })}</p>
        </div>
      </div>
    )
  }

  // Don't show error if we have mock data
  if (error && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'projects.errorLoading' })}</h3>
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : intl.formatMessage({ id: 'projects.failedToLoad' })}</p>
          <Button onClick={() => refetch()}>
            {intl.formatMessage({ id: 'common.tryAgain' })}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.totalProjects' })}</p>
                <p className="text-xl font-bold">{stats.totalProjects}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.totalTasks' })}</p>
                <p className="text-xl font-bold">{stats.totalTasks}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.inProgress' })}</p>
                <p className="text-xl font-bold">{stats.inProgressProjects}</p>
              </div>
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.completed' })}</p>
                <p className="text-xl font-bold">{stats.completedProjects}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {intl.formatMessage({ id: 'projects.overallCompletionRate' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{intl.formatMessage({ id: 'projects.progress' })}</span>
              <span>{stats.completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{intl.formatMessage({ id: 'projects.completedTasks' }, { count: stats.completedTasks })}</span>
              <span>{intl.formatMessage({ id: 'projects.totalCount' }, { count: stats.totalTasks })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'projects.searchProjects' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedType === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('ALL')}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            {intl.formatMessage({ id: 'projects.types.all' })}
          </Button>
          <Button
            variant={selectedType === ProjectType.KANBAN ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(ProjectType.KANBAN)}
            className="gap-2"
          >
            <GitBranch className="w-4 h-4" />
            {intl.formatMessage({ id: 'projects.types.kanban' })}
          </Button>
          <Button
            variant={selectedType === ProjectType.SCRUM ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(ProjectType.SCRUM)}
            className="gap-2"
          >
            <Target className="w-4 h-4" />
            {intl.formatMessage({ id: 'projects.types.scrum' })}
          </Button>
          <Button
            variant={selectedType === ProjectType.BUG_TRACKING ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(ProjectType.BUG_TRACKING)}
            className="gap-2"
          >
            <Bug className="w-4 h-4" />
            {intl.formatMessage({ id: 'projects.types.bugTracking' })}
          </Button>
          <Button
            variant={selectedType === ProjectType.FEATURE_DEVELOPMENT ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(ProjectType.FEATURE_DEVELOPMENT)}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {intl.formatMessage({ id: 'projects.types.feature' })}
          </Button>
          <Button
            variant={selectedType === ProjectType.RESEARCH ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(ProjectType.RESEARCH)}
            className="gap-2"
          >
            <Microscope className="w-4 h-4" />
            {intl.formatMessage({ id: 'projects.types.research' })}
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => {
          const progress = getProjectProgress(project)

          return (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => onProjectSelect?.(project.id)}
            >
              <CardHeader className="pb-3">
                {/* Action Menu - Top Right Corner */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => handleViewProject(project.id, e)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'projects.viewProject' })}
                      </DropdownMenuItem>
                      {isProjectOwner(project) && (
                        <>
                          <DropdownMenuItem onClick={(e) => handleEditProject(project, e)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {intl.formatMessage({ id: 'common.edit' })}
                          </DropdownMenuItem>
                          {/* <DropdownMenuItem onClick={(e) => handleDuplicateProject(project.id, e)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem> */}
                          {/* <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => handleArchiveProject(project.id, e)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteProject(project, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {intl.formatMessage({ id: 'common.delete' })}
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isProjectOwner(project) && (
                        <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                          {intl.formatMessage({ id: 'projects.onlyOwnerCanEdit' })}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between gap-2 pr-8">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-3 h-3 rounded-full"
                         style={{ backgroundColor: project.color || '#3B82F6' }} />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="whitespace-nowrap flex-shrink-0">
                    {(project.priority || 'medium').toUpperCase()}
                  </Badge>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                    {project.description.replace(/<[^>]*>/g, '')}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-blue-600">{project.taskCount || 0}</p>
                    <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'tasks.total' })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-green-600">{project.completedTaskCount || 0}</p>
                    <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'tasks.done' })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-orange-600">
                      {(project as any).pendingTaskCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'tasks.pending' })}</p>
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {intl.formatMessage({ id: 'projects.members' }, { count: project.members?.length || 0 })}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {project.status === 'active' ? intl.formatMessage({ id: 'projects.status.active' }) : intl.formatMessage({ id: 'projects.status.completed' })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'projects.noProjectsFound' })}</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? intl.formatMessage({ id: 'projects.tryAdjustingSearch' }) : intl.formatMessage({ id: 'projects.getStartedCreate' })}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDeleteProject}
        title={intl.formatMessage({ id: 'projects.deleteProject' })}
        itemName={projectToDelete?.name}
        description={intl.formatMessage({ id: 'projects.deleteConfirmation' }, { name: projectToDelete?.name })}
        isLoading={isDeleting}
      />
    </div>
  )
}
