import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Project, Task } from '@/lib/api/projects-api';

interface ProjectsState {
  // Data
  projects: Project[];
  tasks: Map<string, Task[]>; // projectId -> tasks[]
  selectedProjectId: string | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  lastRefresh: number;

  // Actions - Projects
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;

  // Actions - Tasks
  setTasks: (projectId: string, tasks: Task[]) => void;
  addTask: (projectId: string, task: Task) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  removeTask: (projectId: string, taskId: string) => void;
  moveTask: (projectId: string, taskId: string, newStatus: string) => void;

  // Actions - Selection
  setSelectedProjectId: (projectId: string | null) => void;

  // Actions - UI State
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  triggerRefresh: () => void;

  // Utilities
  getProjectById: (projectId: string) => Project | undefined;
  getTasksByProjectId: (projectId: string) => Task[];
  getAllTasks: () => Task[];
  getProjectStats: (projectId: string) => {
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  };

  // Reset
  reset: () => void;
}

const initialState = {
  projects: [],
  tasks: new Map<string, Task[]>(),
  selectedProjectId: null,
  isLoading: false,
  error: null,
  lastRefresh: 0, // Start at 0, will update when data is first loaded
};

export const useProjectsStore = create<ProjectsState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Projects Actions
      setProjects: (projects) => {
        console.log('📥 [Zustand] setProjects called with:', {
          count: projects.length,
          projectNames: projects.map(p => p.name)
        });

        // Full replacement - no merging
        // Create/Update/Delete operations use addProject/updateProject/removeProject for optimistic updates
        // setProjects is called on API sync and should reflect server state exactly
        set({
          projects: projects,
          lastRefresh: Date.now()
        }, false, 'setProjects');
      },

      addProject: (project) => {
        console.log('➕ [Zustand] addProject called:', project);
        set(
          (state) => {
            const newProjects = [...state.projects, project];
            console.log('➕ [Zustand] Projects after add:', {
              before: state.projects.length,
              after: newProjects.length,
              newProjectName: project?.name
            });
            return {
              projects: newProjects,
              lastRefresh: Date.now(),
            };
          },
          false,
          'addProject'
        );
      },

      updateProject: (projectId, updates) => {
        console.log('🔄 [Zustand] updateProject called:', { projectId, updates });
        set(
          (state) => {
            // Create completely new array with new object references for ALL projects
            // This ensures React detects the change
            const updatedProjects = state.projects.map((p) =>
              p.id === projectId ? { ...p, ...updates } : { ...p }
            );

            const updatedProject = updatedProjects.find(p => p.id === projectId);
            console.log('🔄 [Zustand] Projects after update:', {
              before: state.projects.length,
              after: updatedProjects.length,
              updatedName: updatedProject?.name,
              updatedDescription: updatedProject?.description
            });

            return {
              projects: updatedProjects,
              lastRefresh: Date.now(),
            };
          },
          false,
          'updateProject'
        );
      },

      removeProject: (projectId) => {
        console.log('🗑️ [Zustand] removeProject called:', projectId);
        set(
          (state) => {
            const newTasks = new Map(state.tasks);
            newTasks.delete(projectId);

            const filteredProjects = state.projects.filter((p) => p.id !== projectId);
            console.log('🗑️ [Zustand] Projects after delete:', {
              before: state.projects.length,
              after: filteredProjects.length,
              deletedId: projectId
            });

            return {
              projects: filteredProjects,
              tasks: newTasks,
              selectedProjectId:
                state.selectedProjectId === projectId
                  ? null
                  : state.selectedProjectId,
              lastRefresh: Date.now(),
            };
          },
          false,
          'removeProject'
        );
      },

      // Tasks Actions
      setTasks: (projectId, tasks) => {
        set(
          (state) => {
            const newTasks = new Map(state.tasks);
            newTasks.set(projectId, tasks);
            return {
              tasks: newTasks,
              lastRefresh: Date.now(),
            };
          },
          false,
          'setTasks'
        );
      },

      addTask: (projectId, task) => {
        set(
          (state) => {
            const newTasks = new Map(state.tasks);
            const projectTasks = newTasks.get(projectId) || [];
            newTasks.set(projectId, [...projectTasks, task]);
            return {
              tasks: newTasks,
              lastRefresh: Date.now(),
            };
          },
          false,
          'addTask'
        );
      },

      updateTask: (projectId, taskId, updates) => {
        set(
          (state) => {
            const newTasks = new Map(state.tasks);
            const projectTasks = newTasks.get(projectId) || [];
            const updatedTasks = projectTasks.map((t) =>
              t.id === taskId ? { ...t, ...updates } : t
            );
            newTasks.set(projectId, updatedTasks);
            return {
              tasks: newTasks,
              lastRefresh: Date.now(),
            };
          },
          false,
          'updateTask'
        );
      },

      removeTask: (projectId, taskId) => {
        set(
          (state) => {
            const newTasks = new Map(state.tasks);
            const projectTasks = newTasks.get(projectId) || [];
            newTasks.set(
              projectId,
              projectTasks.filter((t) => t.id !== taskId)
            );
            return {
              tasks: newTasks,
              lastRefresh: Date.now(),
            };
          },
          false,
          'removeTask'
        );
      },

      moveTask: (projectId, taskId, newStatus) => {
        set(
          (state) => {
            const newTasks = new Map(state.tasks);
            const projectTasks = newTasks.get(projectId) || [];
            const updatedTasks = projectTasks.map((t) =>
              t.id === taskId
                ? { ...t, status: newStatus as Task['status'] }
                : t
            );
            newTasks.set(projectId, updatedTasks);
            return {
              tasks: newTasks,
              lastRefresh: Date.now(),
            };
          },
          false,
          'moveTask'
        );
      },

      // Selection Actions
      setSelectedProjectId: (projectId) => {
        set({ selectedProjectId: projectId }, false, 'setSelectedProjectId');
      },

      // UI State Actions
      setLoading: (loading) => {
        set({ isLoading: loading }, false, 'setLoading');
      },

      setError: (error) => {
        set({ error }, false, 'setError');
      },

      triggerRefresh: () => {
        set({ lastRefresh: Date.now() }, false, 'triggerRefresh');
      },

      // Utilities
      getProjectById: (projectId) => {
        return get().projects.find((p) => p.id === projectId);
      },

      getTasksByProjectId: (projectId) => {
        return get().tasks.get(projectId) || [];
      },

      getAllTasks: () => {
        const allTasks: Task[] = [];
        get().tasks.forEach((tasks) => {
          allTasks.push(...tasks);
        });
        return allTasks;
      },

      getProjectStats: (projectId) => {
        const project = get().getProjectById(projectId);
        const tasks = get().getTasksByProjectId(projectId);

        const totalTasks = tasks.length;

        // Get the last stage (completed) from project's kanban stages
        const lastStageId =
          project?.kanban_stages && project.kanban_stages.length > 0
            ? project.kanban_stages.sort((a, b) => b.order - a.order)[0]?.id
            : 'done';

        const completedTasks = tasks.filter((t) => t.status === lastStageId).length;

        let progressPercentage = 0;
        if (totalTasks > 0) {
          const stages =
            project?.kanban_stages && project.kanban_stages.length > 0
              ? project.kanban_stages.sort((a, b) => a.order - b.order)
              : [
                  { id: 'todo', order: 1 },
                  { id: 'in_progress', order: 2 },
                  { id: 'done', order: 3 },
                ];

          const totalStages = stages.length;

          const totalProgress = tasks.reduce((sum, task) => {
            const currentStage = stages.findIndex((stage) => stage.id === task.status);
            if (currentStage === -1) return sum;

            const taskProgress = ((currentStage + 1) / totalStages) * 100;
            return sum + taskProgress;
          }, 0);

          progressPercentage = Math.round(totalProgress / totalTasks);
        }

        return { totalTasks, completedTasks, progressPercentage };
      },

      // Reset
      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    { name: 'ProjectsStore' }
  )
);
