import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { Plus, BarChart3 } from 'lucide-react'
import { ProjectDashboard } from '@/components/projects/project-dashboard'
import { UnifiedTaskView } from '@/components/projects/unified-task-view'
import { CreateProjectModal } from '@/components/projects/create-project-modal'
import { CreateTaskModal } from '@/components/projects/create-task-modal'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectService } from '@/lib/api/projects-api'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/fetch'

export function ProjectsView() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { user } = useAuth()
  const intl = useIntl()
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<'todo' | 'in_progress' | 'review' | 'completed' | undefined>(undefined)
  const [projectToEdit, setProjectToEdit] = useState<any>(null)
  const [slackContext, setSlackContext] = useState<any>(null)

  // Auto-open create modal when coming from Slack
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const action = searchParams.get('action')
    const token = searchParams.get('token')
    const slackTeamId = searchParams.get('slack_team_id')
    const slackUserId = searchParams.get('slack_user_id')
    const source = searchParams.get('source')
    const projectName = searchParams.get('name')

    if (action === 'create' && source === 'slack') {
      // Store auth token if provided
      if (token) {
        localStorage.setItem('auth_token', token)
      }

      // Save Slack context for notification after project creation
      setSlackContext({
        teamId: slackTeamId,
        userId: slackUserId,
        projectName: projectName || '',
      })

      // Open the create project modal
      setCreateProjectOpen(true)

      // Clean up URL (remove query params)
      const cleanUrl = `${location.pathname}`
      navigate(cleanUrl, { replace: true })
    }
  }, [location.search, location.pathname, navigate])

  // Check project membership when projectId is present
  const { data: projectMembers, isLoading: isMembersLoading, error: membersError } = useQuery({
    queryKey: ['projectMembers', workspaceId, projectId],
    queryFn: () => projectService.getProjectMembers(workspaceId!, projectId!),
    enabled: !!workspaceId && !!projectId,
    retry: false, // Don't retry on 403/404 errors
  })

  // Check if current user is a member of the project
  const isUserMember = projectMembers?.some(member => member.user_id === user?.id)

  // Handle project access errors and check membership
  useEffect(() => {
    if (projectId && !isMembersLoading) {
      if (membersError) {
        console.error('Project members fetch error:', membersError)

        toast({
          title: intl.formatMessage({ id: 'projects.accessDenied' }),
          description: intl.formatMessage({ id: 'projects.accessDeniedDesc' }),
          variant: "destructive",
        })

        // Redirect to projects list
        navigate(`/workspaces/${workspaceId}/projects`, { replace: true })
      } else if (projectMembers && !isUserMember) {
        console.log('User is not a member of this project')

        toast({
          title: intl.formatMessage({ id: 'projects.accessDenied' }),
          description: intl.formatMessage({ id: 'projects.notMember' }),
          variant: "destructive",
        })

        // Redirect to projects list
        navigate(`/workspaces/${workspaceId}/projects`, { replace: true })
      }
    }
  }, [membersError, projectId, workspaceId, navigate, toast, projectMembers, isUserMember, isMembersLoading])

  // Sync selected project with URL
  const selectedProjectId = projectId || null

  // Set activeTab based on whether we have a projectId
  const activeTab = projectId ? 'board' : 'dashboard'

  const handleProjectSelect = (projectId: string) => {
    // Navigate to the project URL
    navigate(`/workspaces/${workspaceId}/projects/${projectId}`)
  }

  const handleProjectCreated = async (project?: any) => {
    console.log('📌 handleProjectCreated called:', { project, slackContext })
    setRefreshKey(prev => prev + 1)

    // Send Slack notification if project was created from Slack
    if (slackContext && project?.id) {
      console.log('📤 Sending Slack notification for project:', project.id)
      try {
        await api.post('/slack/whiteboard/notify/project', {
          projectId: project.id,
          slackTeamId: slackContext.teamId,
          slackUserId: slackContext.userId,
        })

        console.log('✅ Slack notification sent successfully')
        toast({
          title: 'Slack notification sent',
          description: 'Check your Slack DMs for the project link',
        })
      } catch (error: any) {
        console.error('❌ Failed to send Slack notification:', error)
        toast({
          title: 'Failed to send Slack notification',
          description: error?.response?.data?.message || error?.message || 'Unknown error',
          variant: 'destructive',
        })
      }

      // Clear Slack context after use
      setSlackContext(null)
    } else {
      console.log('⚠️ Skipping Slack notification:', { hasSlackContext: !!slackContext, hasProjectId: !!project?.id })
    }
  }

  const handleTaskCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleAddTask = (status?: 'todo' | 'in_progress' | 'review' | 'completed') => {
    setDefaultTaskStatus(status)
    setCreateTaskOpen(true)
  }

  const handleEditProject = (project: any) => {
    setProjectToEdit(project)
    setCreateProjectOpen(true)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header section - only show when no project is selected */}
      {!selectedProjectId && (
        <div className="flex-shrink-0 border-b bg-background px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                size="sm"
                onClick={() => navigate(`/workspaces/${workspaceId}/projects`)}
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                {intl.formatMessage({ id: 'projects.dashboard' })}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setProjectToEdit(null) // Clear any previous edit state
                  setCreateProjectOpen(true)
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                {intl.formatMessage({ id: 'projects.project' })}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content section - flexible height with proper scrolling */}
      <div className="flex-1 min-h-0">
        {!selectedProjectId && (
          <div className="h-full overflow-y-auto">
            <ProjectDashboard
              key={refreshKey}
              workspaceId={workspaceId || ''}
              onProjectSelect={handleProjectSelect}
              onEditProject={handleEditProject}
            />
          </div>
        )}

        {selectedProjectId && workspaceId && (
          <div className="h-full">
            {isMembersLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="mt-4 text-sm text-muted-foreground">{intl.formatMessage({ id: 'projects.checkingAccess' })}</p>
                </div>
              </div>
            ) : membersError || !isUserMember ? (
              // Error handled by useEffect, this is just a fallback
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'common.redirecting' })}</p>
                </div>
              </div>
            ) : (
              <UnifiedTaskView
                key={`${selectedProjectId}-${refreshKey}`}
                projectId={selectedProjectId}
                workspaceId={workspaceId}
                initialView={activeTab}
                onAddTask={handleAddTask}
                onBack={() => {
                  navigate(`/workspaces/${workspaceId}/projects`)
                }}
              />
            )}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={(open) => {
          setCreateProjectOpen(open)
          if (!open) {
            setProjectToEdit(null)
            // Don't clear slackContext here - it will be cleared in handleProjectCreated after notification is sent
          }
        }}
        workspaceId={workspaceId || ''}
        onProjectCreated={handleProjectCreated}
        project={projectToEdit}
        initialName={slackContext?.projectName}
      />

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={(open) => {
          setCreateTaskOpen(open)
          if (!open) setDefaultTaskStatus(undefined)
        }}
        workspaceId={workspaceId || ''}
        projectId={selectedProjectId || undefined}
        defaultStatus={defaultTaskStatus}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}
