import { useState, useMemo, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Loader2,
  LayoutTemplate,
  MoreVertical,
  Bot,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjects, projectService, projectKeys } from '@/lib/api/projects-api';
import { useToast } from '@/components/ui/use-toast';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useAvailableBotsForProject, useAssignBotToProject } from '@/lib/api/bots-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProjectLeftSidebarProps {
  workspaceId: string;
  projectId?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

export function ProjectLeftSidebar({
  workspaceId,
  projectId,
  activeView = 'board',
  onViewChange,
  onProjectSelect
}: ProjectLeftSidebarProps) {
  const intl = useIntl();
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [isAssignBotOpen, setIsAssignBotOpen] = useState(false);
  const [selectedProjectForBot, setSelectedProjectForBot] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast: useToastHook } = useToast();

  // Fetch all bots with assignment status for the selected project
  const { data: availableBots = [] } = useAvailableBotsForProject(
    workspaceId || '',
    selectedProjectForBot || '',
    { enabled: !!selectedProjectForBot }
  );
  const assignBotMutation = useAssignBotToProject();

  // ALWAYS use Zustand store as single source of truth
  const projects = useProjectsStore((state) => state.projects) || [];
  const tasksFromStore = useProjectsStore((state) => state.tasks);
  const lastRefresh = useProjectsStore((state) => state.lastRefresh);

  // Fetch projects - this automatically syncs with Zustand store
  const { isLoading: isLoadingProjects, error: projectsError } = useProjects(workspaceId);

  // Debug logging - now includes lastRefresh to ensure reactivity
  console.log('[LeftSidebar] Projects:', projects.length, 'lastRefresh:', lastRefresh);
  console.log('[LeftSidebar] Project names:', projects.map(p => p.name));

  // Fetch tasks for all projects in parallel
  // Use the same query key as the main task view for cache consistency
  const taskQueries = useQueries({
    queries: projects.map(project => ({
      queryKey: projectKeys.tasks(project.id),
      queryFn: () => projectService.getTasks(workspaceId, project.id),
      enabled: !!workspaceId && !!project.id,
      staleTime: 60 * 1000,
    }))
  });

  // Get all tasks for "My Tasks" section
  const allTasks = useMemo(() => {
    return taskQueries
      .filter(query => query.data)
      .flatMap(query => query.data || [])
      .slice(0, 10); // Limit to 10 tasks
  }, [taskQueries]);

  // Mutation for updating task status
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'todo' | 'in_progress' | 'review' | 'testing' | 'done' }) =>
      projectService.updateTask(workspaceId, taskId, { status }),
    onSuccess: () => {
      // Invalidate all task queries to refresh the UI
      projects.forEach((project: any) => {
        queryClient.invalidateQueries({ queryKey: projectKeys.tasks(project.id) });
      });
      toast.success(
        intl.formatMessage({ id: 'projects.sidebar.taskUpdated' }),
        {
          description: intl.formatMessage({ id: 'projects.sidebar.taskUpdatedSuccess' }),
        }
      );
    },
    onError: (error: any) => {
      toast.error(
        intl.formatMessage({ id: 'projects.sidebar.updateFailed' }),
        {
          description: error.message || intl.formatMessage({ id: 'projects.sidebar.updateFailedDesc' }),
        }
      );
    },
  });

  // Toggle project expansion
  const toggleProject = (id: string) => {
    setExpandedProjects(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  // Handle task checkbox toggle
  const handleTaskToggle = (task: any, taskProject: any, isDone: boolean) => {
    // Get the first stage (to do) and last stage (done) from kanban stages
    const firstStageId = taskProject?.kanban_stages && taskProject.kanban_stages.length > 0
      ? taskProject.kanban_stages.sort((a: any, b: any) => a.order - b.order)[0]?.id
      : 'todo';

    const lastStageId = taskProject?.kanban_stages && taskProject.kanban_stages.length > 0
      ? taskProject.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
      : 'done';

    // Toggle between first stage (incomplete) and last stage (complete)
    const newStatus = (isDone ? firstStageId : lastStageId) as 'todo' | 'in_progress' | 'review' | 'testing' | 'done';

    updateTaskMutation.mutate({ taskId: task.id, status: newStatus });
  };

  // Handle bot assignment
  const handleOpenBotDialog = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectForBot(projectId);
    setIsAssignBotOpen(true);
  };

  const handleAssignBot = async (botId: string) => {
    if (!workspaceId || !selectedProjectForBot) return;

    try {
      await assignBotMutation.mutateAsync({
        workspaceId,
        botId,
        projectId: selectedProjectForBot,
      });
      toast.success('Bot assigned to project successfully');
      setIsAssignBotOpen(false);
      setSelectedProjectForBot(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign bot');
    }
  };

  // Calculate project stats from real task data
  const getProjectStats = (project: any, tasks: any[]) => {
    // Get the last stage (completed stage)
    const lastStageId = project.kanban_stages && project.kanban_stages.length > 0
      ? project.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
      : 'done';

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === lastStageId).length;

    // Calculate average progress across all tasks
    let progressPercentage = 0;
    if (totalTasks > 0) {
      // Get kanban stages sorted by order
      const stages = project.kanban_stages && project.kanban_stages.length > 0
        ? project.kanban_stages.sort((a: any, b: any) => a.order - b.order)
        : [
            { id: 'todo', order: 1 },
            { id: 'in_progress', order: 2 },
            { id: 'done', order: 3 }
          ];

      const totalStages = stages.length;

      // Calculate progress for each task and sum them up
      const totalProgress = tasks.reduce((sum, task) => {
        const currentStage = stages.findIndex((stage: any) => stage.id === task.status);
        if (currentStage === -1) return sum; // Task in unknown stage

        // Progress is based on which stage the task is in
        const taskProgress = ((currentStage + 1) / totalStages) * 100;
        return sum + taskProgress;
      }, 0);

      // Average progress across all tasks
      progressPercentage = Math.round(totalProgress / totalTasks);
    }

    return { totalTasks, completedTasks, progressPercentage };
  };

  // Get project team members from task assignees
  const getTeamMembers = (tasks: any[]) => {
    const assigneesMap = new Map<string, any>();
    tasks.forEach((task: any) => {
      if (task.assignees && Array.isArray(task.assignees)) {
        task.assignees.forEach((assignee: any) => {
          // Handle both object format (with name) and string format (ID)
          if (typeof assignee === 'object' && assignee?.id) {
            assigneesMap.set(assignee.id, assignee);
          } else if (typeof assignee === 'string') {
            // Legacy format: just store the ID
            if (!assigneesMap.has(assignee)) {
              assigneesMap.set(assignee, { id: assignee, name: assignee });
            }
          }
        });
      }
    });
    return Array.from(assigneesMap.values()).slice(0, 5);
  };

  // Get due date from project
  const getDueDate = (project: any) => {
    return project.end_date || project.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
      <div className="bg-background h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">{intl.formatMessage({ id: 'projects.sidebar.title' })}</h2>
            <Link
              to={`/workspaces/${workspaceId}/templates`}
              className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Browse Templates"
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span>Templates</span>
            </Link>
          </div>
        </div>

        {/* Projects List - Scrollable */}
        <div className="overflow-hidden" style={{height: '60%'}}>
          <div className="h-full overflow-y-auto hide-scrollbar">
            {!workspaceId ? (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-red-500 text-center">{intl.formatMessage({ id: 'projects.sidebar.noWorkspaceId' })}</p>
              </div>
            ) : projectsError ? (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-red-500 text-center">{intl.formatMessage({ id: 'projects.errorLoading' })}</p>
              </div>
            ) : isLoadingProjects ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-muted-foreground text-center">{intl.formatMessage({ id: 'projects.sidebar.noProjects' })}</p>
              </div>
            ) : (
              <div className="p-1">
                {projects.map((project: any, index: number) => {
                  const isExpanded = expandedProjects.includes(project.id);
                  const projectTasks = taskQueries[index]?.data || [];
                  const stats = getProjectStats(project, projectTasks);
                  const teamMembers = getTeamMembers(projectTasks);
                  const dueDate = getDueDate(project);
                  const isLoadingTasks = taskQueries[index]?.isLoading;

                  return (
                    <Collapsible
                      key={project.id}
                      open={isExpanded}
                      onOpenChange={() => toggleProject(project.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div
                          className="w-full p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors overflow-hidden"
                          onClick={() => onProjectSelect?.(project.id)}
                        >
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarImage src={project.imageUrl} />
                                <AvatarFallback className="text-xs">
                                  {project.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <h3 className="font-medium text-xs truncate">{project.name}</h3>
                                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                                  <div className="w-24 bg-muted rounded-full h-1 flex-shrink-0">
                                    <div
                                      className="bg-primary h-1 rounded-full transition-all"
                                      style={{ width: `${stats.progressPercentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground flex-shrink-0">{stats.progressPercentage}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button className="p-1 hover:bg-muted rounded transition-colors">
                                    <MoreVertical className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={(e) => handleOpenBotDialog(project.id, e)}>
                                    <Bot className="w-4 h-4 mr-2" />
                                    Assign Bot
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {isExpanded ?
                                <ChevronDown className="w-3 h-3 text-muted-foreground" /> :
                                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              }
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        {isLoadingTasks ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="px-2 pb-2 ml-6 space-y-2 overflow-hidden">
                            {/* Quick Stats Row */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-muted/30 rounded-lg p-2">
                                <div className="flex items-center gap-1">
                                  <Target className="w-3 h-3 text-blue-600" />
                                  <span className="text-xs font-medium">{stats.totalTasks}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'projects.sidebar.tasks' })}</div>
                              </div>
                              <div className="bg-muted/30 rounded-lg p-2">
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-medium">{stats.completedTasks}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'projects.status.done' })}</div>
                              </div>
                            </div>

                            {/* Recent Tasks */}
                            {projectTasks.length > 0 && (
                              <div className="min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.sidebar.recentTasks' })}</span>
                                  <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                  {projectTasks.slice(0, 3).map((task: any) => {
                                    const lastStageId = project.kanban_stages && project.kanban_stages.length > 0
                                      ? project.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
                                      : 'done';
                                    const isDone = task.status === lastStageId;

                                    return (
                                      <div key={task.id} className="flex items-center gap-1.5 p-1 rounded hover:bg-muted/50">
                                        <div className="flex-shrink-0">
                                          {isDone ? (
                                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                                          ) : task.priority === 'high' || task.priority === 'urgent' ? (
                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                          ) : (
                                            <Circle className="w-3 h-3 text-muted-foreground" />
                                          )}
                                        </div>
                                        <span className="text-xs truncate flex-1">{task.title}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Team Members */}
                            {teamMembers.length > 0 && (
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 mb-1">
                                  <Users className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.sidebar.team' }, { count: teamMembers.length })}</span>
                                </div>
                                <div className="flex items-center gap-0.5 overflow-hidden">
                                  {teamMembers.slice(0, 5).map((member: any) => {
                                    // Get member name and initials
                                    const memberName = typeof member === 'object' && member?.name ? member.name :
                                                      typeof member === 'string' ? member : 'Unknown';
                                    const getInitials = (name: string) => {
                                      const safeName = String(name || 'U');
                                      const parts = safeName.split(' ').filter(p => p.length > 0);
                                      if (parts.length >= 2) {
                                        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                                      }
                                      return safeName.substring(0, Math.min(2, safeName.length)).toUpperCase();
                                    };
                                    const initials = getInitials(memberName);
                                    const memberId = typeof member === 'object' ? member.id : member;

                                    return (
                                      <Avatar key={memberId} className="w-4 h-4 flex-shrink-0" title={memberName}>
                                        <AvatarFallback className="text-xs">
                                          {initials}
                                        </AvatarFallback>
                                      </Avatar>
                                    );
                                  })}
                                  {teamMembers.length > 5 && (
                                    <span className="text-xs text-muted-foreground ml-0.5 flex-shrink-0">+{teamMembers.length - 5}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Due Date */}
                            <div className="min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.sidebar.due' })}</span>
                                </div>
                                <div className="text-xs font-medium">
                                  {new Date(dueDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* My Tasks Section - Simple */}
        <div className="border-t bg-muted/20 flex flex-col" style={{height: '40%'}}>
          <div className="p-2 flex-shrink-0 border-b">
            <h3 className="font-semibold text-xs">{intl.formatMessage({ id: 'projects.sidebar.myTasks' })}</h3>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {taskQueries.some(q => q.isLoading) ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : allTasks.length === 0 ? (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs text-muted-foreground text-center">{intl.formatMessage({ id: 'projects.sidebar.noTasks' })}</p>
              </div>
            ) : (
              <div className="p-1">
                {allTasks.map((task: any) => {
                  // Find the project for this task (API returns snake_case)
                  const taskProjectId = task.project_id || task.projectId;
                  const taskProject = projects.find((p: any) => p.id === taskProjectId);

                  const lastStageId = taskProject?.kanban_stages && taskProject.kanban_stages.length > 0
                    ? taskProject.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
                    : 'done';
                  const isDone = task.status === lastStageId;

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleTaskToggle(task, taskProject, isDone);
                        }}
                        disabled={updateTaskMutation.isPending}
                        className="w-3 h-3 rounded border-gray-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className={`text-xs flex-1 truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bot Assignment Dialog */}
      <Dialog open={isAssignBotOpen} onOpenChange={setIsAssignBotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign AI Assistant to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableBots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activated bots found</p>
                <p className="text-xs mt-1">Please activate bots first to assign them to projects</p>
              </div>
            ) : (
              availableBots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{bot.displayName}</p>
                        {bot.isAssigned && (
                          <Badge variant="secondary" className="text-xs">
                            Already Assigned
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{bot.description}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssignBot(bot.id)}
                    disabled={assignBotMutation.isPending || bot.isAssigned}
                    className="ml-2 flex-shrink-0"
                  >
                    {bot.isAssigned ? 'Assigned' : 'Assign'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
