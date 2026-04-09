import { useState, useMemo, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Users, Clock, Target, Plus, Video, FolderPlus, AlertTriangle, Upload, X } from 'lucide-react'
import { format, isAfter, isToday, addDays, isBefore } from 'date-fns'
import { CreateProjectModal } from './create-project-modal'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { useProjectsStore } from '@/stores/useProjectsStore'

interface ProjectsRightSidebarProps {
  projects: any[]
  allTasks: any[]
  workspaceId?: string
  selectedProjectId?: string
}

export function ProjectsRightSidebar({ projects, allTasks, workspaceId, selectedProjectId }: ProjectsRightSidebarProps) {
  const intl = useIntl()
  const navigate = useNavigate()
  const { openMemberProfile } = useMemberProfile()

  // ALWAYS use Zustand store as single source of truth
  const displayProjects = useProjectsStore((state) => state.projects) || [];
  const tasksFromStore = useProjectsStore((state) => state.tasks);
  const lastRefresh = useProjectsStore((state) => state.lastRefresh);

  // Use tasks from store if available, otherwise use props
  const displayAllTasks = tasksFromStore && tasksFromStore.size > 0
    ? Array.from(tasksFromStore.values()).flat()
    : allTasks;

  console.log('[RightSidebar] Projects:', displayProjects.length, 'lastRefresh:', lastRefresh);
  console.log('[RightSidebar] Project names:', displayProjects.map(p => p.name));

  // State for modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [isQuickMeetingOpen, setIsQuickMeetingOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [meetingType, setMeetingType] = useState<string>('video')

  // State for new member form
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'member',
    avatar: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  // Fetch workspace members
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Get the selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null
    return displayProjects.find(p => p.id === selectedProjectId)
  }, [selectedProjectId, displayProjects, lastRefresh])

  // Extract team members from collaborative data
  const teamMembers = useMemo(() => {
    if (!selectedProject || !selectedProject.collaborative_data) {
      return []
    }

    const collaborativeData = selectedProject.collaborative_data
    const memberIds: string[] = []

    // Add project lead
    if (collaborativeData.project_lead) {
      memberIds.push(collaborativeData.project_lead)
    }

    // Add default assignees
    if (collaborativeData.default_assignee_ids && Array.isArray(collaborativeData.default_assignee_ids)) {
      memberIds.push(...collaborativeData.default_assignee_ids)
    }

    // Remove duplicates
    const uniqueMemberIds = [...new Set(memberIds)]

    // Map IDs to member objects
    return uniqueMemberIds
      .map(id => workspaceMembers.find(m => m.user_id === id || m.id === id))
      .filter(Boolean)
  }, [selectedProject, workspaceMembers])

  // Calculate overall stats from projects (not tasks)
  const { overallProgress, activeProjects, completedProjects } = useMemo(() => {
    if (displayProjects.length === 0) {
      return { overallProgress: 0, activeProjects: 0, completedProjects: 0 }
    }

    // Calculate average progress of all projects
    const totalProgress = displayProjects.reduce((sum, project) => {
      return sum + (project.progress || 0)
    }, 0)
    const avgProgress = totalProgress / displayProjects.length

    // Projects with 100% progress are considered done
    const done = displayProjects.filter(p => (p.progress || 0) === 100).length
    // Projects with less than 100% are considered active
    const active = displayProjects.filter(p => (p.progress || 0) < 100).length

    return {
      overallProgress: avgProgress,
      activeProjects: active,
      completedProjects: done
    }
  }, [displayProjects, lastRefresh])

  // Get upcoming deadlines from all tasks
  const now = new Date()
  const sevenDaysFromNow = addDays(now, 7)

  const upcomingTasks = useMemo(() => {
    return displayAllTasks
      .filter(t => {
        // Check both dueDate and due_date (camelCase and snake_case)
        const taskDueDate = t.dueDate || t.due_date
        if (!taskDueDate) return false

        // Find the project for this task
        const taskProjectId = t.project_id || t.projectId
        const project = displayProjects.find(p => p.id === taskProjectId)

        if (!project || !project.kanban_stages || project.kanban_stages.length === 0) {
          return t.status !== 'done' && t.status !== 'completed'
        }

        // Check if task is in the last stage (completed)
        const lastStageId = project.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
        return t.status !== lastStageId
      })
      .sort((a, b) => {
        const aDate = a.dueDate || a.due_date
        const bDate = b.dueDate || b.due_date
        return new Date(aDate!).getTime() - new Date(bDate!).getTime()
      })
  }, [displayAllTasks, displayProjects, lastRefresh])

  const overdueTasks = upcomingTasks.filter(t => {
    const taskDueDate = t.dueDate || t.due_date
    return taskDueDate && isAfter(now, new Date(taskDueDate))
  })
  const dueTodayTasks = upcomingTasks.filter(t => {
    const taskDueDate = t.dueDate || t.due_date
    return taskDueDate && isToday(new Date(taskDueDate))
  })
  const dueThisWeekTasks = upcomingTasks.filter(t => {
    const taskDueDate = t.dueDate || t.due_date
    if (!taskDueDate) return false
    const dueDate = new Date(taskDueDate)
    return !isToday(dueDate) &&
      !isAfter(now, dueDate) &&
      isBefore(dueDate, sevenDaysFromNow)
  })

  const displayTasks = upcomingTasks.slice(0, 5)

  // Handle task click - navigate to the project page
  const handleTaskClick = (task: any) => {
    const taskProjectId = task.project_id || task.projectId
    if (workspaceId && taskProjectId) {
      navigate(`/workspaces/${workspaceId}/projects/${taskProjectId}`)
    }
  }

  // Handle avatar file upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      setAvatarFile(file)

      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {/* Project Overview */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          {intl.formatMessage({ id: 'projects.overview' })}
        </h3>

        <div className="space-y-3">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold">{intl.formatMessage({ id: 'projects.averageProgress' })}</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress value={overallProgress} className="h-1.5 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{intl.formatMessage({ id: 'projects.completedCount' }, { count: completedProjects })}</span>
              <span>{intl.formatMessage({ id: 'projects.activeCount' }, { count: activeProjects })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-lg p-2.5 text-center border border-amber-200 dark:border-amber-700">
              <div className="text-base font-bold text-amber-700 dark:text-amber-300">{activeProjects}</div>
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">{intl.formatMessage({ id: 'projects.status.active' })}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-lg p-2.5 text-center border border-emerald-200 dark:border-emerald-700">
              <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">{completedProjects}</div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{intl.formatMessage({ id: 'projects.status.done' })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {intl.formatMessage({ id: 'projects.upcomingDeadlines' })}
          </h3>
          <div className="flex items-center gap-1">
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueTasks.length}
              </Badge>
            )}
            {dueTodayTasks.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                {dueTodayTasks.length}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center border border-red-200 dark:border-red-800">
            <div className="text-sm font-bold text-red-700 dark:text-red-300">{overdueTasks.length}</div>
            <div className="text-xs text-red-600 dark:text-red-400">{intl.formatMessage({ id: 'projects.deadlines.overdue' })}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center border border-amber-200 dark:border-amber-800">
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{dueTodayTasks.length}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">{intl.formatMessage({ id: 'projects.deadlines.today' })}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center border border-blue-200 dark:border-blue-800">
            <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{dueThisWeekTasks.length}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">{intl.formatMessage({ id: 'projects.deadlines.thisWeek' })}</div>
          </div>
        </div>

        <div className="space-y-2">
          {displayTasks.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{intl.formatMessage({ id: 'projects.noDeadlines' })}</p>
            </div>
          ) : (
            displayTasks.map((task: any) => {
              const taskDueDate = task.dueDate || task.due_date
              const dueDate = new Date(taskDueDate!)
              const isOverdue = isAfter(now, dueDate)
              const isDueToday = isToday(dueDate)
              const dueText = isOverdue
                ? intl.formatMessage({ id: 'projects.deadlines.overdue' })
                : isDueToday
                ? intl.formatMessage({ id: 'projects.deadlines.dueToday' })
                : `${intl.formatMessage({ id: 'projects.deadlines.due' })} ${format(dueDate, 'MMM dd')}`

              const taskProjectId = task.project_id || task.projectId
              const project = displayProjects.find(p => p.id === taskProjectId)
              const taskTitle = task.title || task.name
              const taskPriority = (task.priority || 'medium').toUpperCase()

              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className={`rounded-lg p-2.5 border transition-all duration-200 hover:shadow-md cursor-pointer ${
                    isOverdue ? 'bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-200 dark:border-red-700' :
                    isDueToday ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border-amber-200 dark:border-amber-700' :
                    'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    <div className={`w-2 h-2 rounded-full ${
                      isOverdue ? 'bg-red-500' : isDueToday ? 'bg-amber-500' : 'bg-blue-500'
                    }`}></div>
                    <span className={`text-xs font-semibold ${
                      isOverdue ? 'text-red-700 dark:text-red-300' :
                      isDueToday ? 'text-amber-700 dark:text-amber-300' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {taskPriority}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-1 truncate">{taskTitle}</div>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-medium ${
                      isOverdue ? 'text-red-700 dark:text-red-300' :
                      isDueToday ? 'text-amber-700 dark:text-amber-300' :
                      'text-slate-600 dark:text-slate-400'
                    }`}>{dueText}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">{project?.name || 'Unknown'}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            {selectedProjectId ? intl.formatMessage({ id: 'projects.projectTeam' }) : intl.formatMessage({ id: 'projects.workspaceMembers' })}
            {selectedProjectId && teamMembers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{teamMembers.length}</Badge>
            )}
            {!selectedProjectId && workspaceMembers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{workspaceMembers.length}</Badge>
            )}
          </h3>
        </div>

        <div className="space-y-3">
          {!selectedProjectId ? (
            // Show all workspace members when no project is selected
            workspaceMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{intl.formatMessage({ id: 'projects.noWorkspaceMembers' })}</p>
              </div>
            ) : (
              workspaceMembers.map((member: any) => {
                const userName = member.user?.name || member.user?.email || 'Unknown User'
                const userEmail = member.user?.email || ''
                const userAvatar = member.user?.avatar
                const userRole = member.role || 'member'

                return (
                  <div
                    key={member.id}
                    onClick={() => openMemberProfile(member)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-600 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                        {userRole === 'owner' && (
                          <Badge variant="default" className="text-xs">{intl.formatMessage({ id: 'projects.roles.owner' })}</Badge>
                        )}
                        {userRole === 'admin' && (
                          <Badge variant="secondary" className="text-xs">{intl.formatMessage({ id: 'projects.roles.admin' })}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{userRole}</p>
                    </div>
                  </div>
                )
              })
            )
          ) : (
            // Show project-specific team members when a project is selected
            teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{intl.formatMessage({ id: 'projects.noTeamMembers' })}</p>
                <p className="text-xs mt-1">{intl.formatMessage({ id: 'projects.addMembersInSettings' })}</p>
              </div>
            ) : (
              teamMembers.map((member: any) => {
                const isProjectLead = selectedProject?.collaborative_data?.project_lead === (member.user_id || member.id)
                const userName = member.user?.name || member.user?.email || 'Unknown User'
                const userEmail = member.user?.email || ''
                const userAvatar = member.user?.avatar
                const userRole = member.role || 'member'

                return (
                  <div
                    key={member.id}
                    onClick={() => openMemberProfile(member)}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-600 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                        {isProjectLead && (
                          <Badge variant="default" className="text-xs">{intl.formatMessage({ id: 'projects.roles.lead' })}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{userRole}</p>
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">{intl.formatMessage({ id: 'projects.quickActions' })}</h3>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            size="sm"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'projects.createProject' })}
          </Button>

          {/* <Button variant="outline" className="w-full justify-start" size="sm">
            <Video className="h-4 w-4 mr-2" />
            Quick Meeting
          </Button> */}
        </div>
      </div>

      {/* Create Project Modal */}
      {workspaceId && (
        <CreateProjectModal
          open={isCreateProjectOpen}
          onOpenChange={setIsCreateProjectOpen}
          workspaceId={workspaceId}
        />
      )}
    </div>
  )
}
