// src/lib/api/projects-api.ts
import React from 'react';
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { useProjectsStore } from '@/stores/useProjectsStore';

// Types
export interface KanbanStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Project {
  id: string;
  workspace_id?: string;
  workspaceId?: string;
  name: string;
  description?: string;
  type?: 'kanban' | 'scrum' | 'waterfall' | 'bug_tracking' | 'feature' | 'research';
  status: 'active' | 'completed' | 'archived' | 'on_hold' | 'on-hold';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  owner_id?: string;
  lead_id?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  estimated_hours?: number;
  actual_hours?: number;
  budget?: number;
  is_template?: boolean;
  kanban_stages?: KanbanStage[];
  archived_at?: string;
  archived_by?: string;
  settings?: Record<string, any>;
  collaborative_data?: Record<string, any>;
  teamMembers?: string[];
  tags?: string[];
  color?: string;
  progress?: number;
  taskCount?: number;
  completedTaskCount?: number;
  members?: Array<{ id: string; name: string }>;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'in_progress' | 'review' | 'done' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[];
  assignee?: User; // Populated user object
  assigneeId?: string; // User ID string
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments?: TaskAttachment[];
  subtasks?: Subtask[];
  dependencies?: string[];
  comments?: TaskComment[];
  customFields?: Record<string, any>; // Custom field values (fieldId: value)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface CreateProjectRequest {
  name: string;                    // ✅ Required - Project name
  description?: string;            // Optional - Project description
  type?: 'kanban' | 'scrum' | 'waterfall' | 'bug_tracking' | 'feature' | 'research';  // Optional - Default: 'kanban'
  status?: 'active' | 'on_hold' | 'completed' | 'archived';  // Optional - Default: 'active'
  priority?: 'low' | 'medium' | 'high' | 'critical';  // Optional
  owner_id?: string;               // Optional - Project owner user ID (defaults to current user)
  lead_id?: string;                // Optional - Project lead user ID
  start_date?: string;             // Optional - ISO date string
  end_date?: string;               // Optional - ISO date string
  estimated_hours?: number;        // Optional - Estimated project hours
  budget?: number;                 // Optional - Project budget
  is_template?: boolean;           // Optional - Default: false
  kanban_stages?: Array<{          // Optional - Custom kanban stages
    id: string;
    name: string;
    order: number;
    color: string;  // Hex color code
  }>;
  attachments?: {                  // Optional - Project attachments
    note_attachment?: string[];
    file_attachment?: string[];
    event_attachment?: string[];
  };
  collaborative_data?: Record<string, any>;  // Optional - Collaborative data (default assignees, etc.)
  // Legacy fields for backward compatibility
  teamMembers?: string[];
  tags?: string[];
  color?: string;
}

export interface CreateTaskRequest {
  title: string;                           // ✅ Required - Task title
  description?: string;                    // Optional - Task description
  task_type?: 'task' | 'story' | 'bug' | 'epic' | 'subtask';  // Optional - Default: 'task'
  status?: 'todo' | 'in_progress' | 'review' | 'testing' | 'done';  // Optional - Default: 'todo'
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';  // Optional - Default: 'medium'
  sprint_id?: string;                      // Optional - UUID of sprint
  parent_task_id?: string;                 // Optional - UUID for subtasks
  assigned_to?: string[];                  // Optional - Array of user IDs to assign task to
  assignee_team_member_id?: string;        // Optional - Team member UUID
  reporter_team_member_id?: string;        // Optional - Reporter team member UUID
  due_date?: string;                       // Optional - ISO date string
  estimated_hours?: number;                // Optional - Estimated hours to complete
  story_points?: number;                   // Optional - Story points (for agile)
  labels?: string[];                       // Optional - Array of tag strings
  custom_fields?: Record<string, any>;     // Optional - Custom field values (fieldId: value)
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  actualHours?: number;
  subtasks?: Subtask[];
}

export interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalHoursEstimated: number;
  totalHoursActual: number;
  burndownData: Array<{
    date: string;
    remaining: number;
    ideal: number;
  }>;
  teamPerformance: Array<{
    userId: string;
    completedTasks: number;
    averageCompletionTime: number;
  }>;
}

// ==================== CUSTOM FIELD TYPES ====================

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'person'
  | 'relation';

export interface SelectOption {
  id: string;
  label: string;
  color?: string;
}

export interface FieldSettings {
  numberFormat?: string;
  currencyCode?: string;
  dateFormat?: string;
  includeTime?: boolean;
  minValue?: number;
  maxValue?: number;
  allowNegative?: boolean;
  decimalPlaces?: number;
}

export interface CustomFieldDefinition {
  id: string;
  projectId: string;
  name: string;
  fieldType: CustomFieldType;
  description?: string;
  options?: SelectOption[];
  defaultValue?: any;
  isRequired: boolean;
  isVisible: boolean;
  sortOrder: number;
  settings?: FieldSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldRequest {
  name: string;
  fieldType: CustomFieldType;
  description?: string;
  options?: Array<{ label: string; color?: string }>;
  defaultValue?: any;
  isRequired?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  settings?: FieldSettings;
}

export interface UpdateCustomFieldRequest {
  name?: string;
  description?: string;
  options?: SelectOption[];
  defaultValue?: any;
  isRequired?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  settings?: FieldSettings;
}

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string, filters?: string) => [...projectKeys.lists(), workspaceId, { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  tasks: (projectId: string) => [...projectKeys.detail(projectId), 'tasks'] as const,
  task: (projectId: string, taskId: string) => [...projectKeys.tasks(projectId), taskId] as const,
  analytics: (projectId: string) => [...projectKeys.detail(projectId), 'analytics'] as const,
  customFields: (projectId: string) => [...projectKeys.detail(projectId), 'custom-fields'] as const,
};

// API Functions
export const projectApi = {
  // Projects
  async getProjects(workspaceId: string, filters?: {
    status?: string;
    type?: 'kanban' | 'scrum' | 'waterfall' | 'bug_tracking' | 'feature_development' | 'research';
    tags?: string[];
    teamMember?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Project[], total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tags) params.append('tags', filters.tags.join(','));
    if (filters?.teamMember) params.append('teamMember', filters.teamMember);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    return api.get<{ data: Project[], total: number }>(`/workspaces/${workspaceId}/projects?${params}`);
  },

  async getProject(workspaceId: string, projectId: string): Promise<Project> {
    return api.get<Project>(`/workspaces/${workspaceId}/projects/${projectId}`);
  },

  async createProject(workspaceId: string, data: CreateProjectRequest): Promise<Project> {
    return api.post<Project>(`/workspaces/${workspaceId}/projects`, data);
  },

  async updateProject(workspaceId: string, projectId: string, data: Partial<CreateProjectRequest>): Promise<Project> {
    return api.patch<Project>(`/workspaces/${workspaceId}/projects/${projectId}`, data);
  },

  async deleteProject(workspaceId: string, projectId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
  },

  async archiveProject(projectId: string): Promise<Project> {
    return api.post<Project>(`/projects/${projectId}/archive`, null);
  },

  async getProjectMembers(workspaceId: string, projectId: string): Promise<Array<{
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar_url?: string;
    } | null;
  }>> {
    return api.get(`/workspaces/${workspaceId}/projects/${projectId}/members`);
  },

  // Tasks
  async getTasks(workspaceId: string, projectId: string, filters?: {
    status?: string;
    priority?: string;
    assignee?: string;
    tag?: string;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assignee) params.append('assignee', filters.assignee);
    if (filters?.tag) params.append('tag', filters.tag);

    return api.get<Task[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks?${params}`);
  },

  async getTask(taskId: string): Promise<Task> {
    return api.get<Task>(`/tasks/${taskId}`);
  },

  async createTask(workspaceId: string, projectId: string, data: CreateTaskRequest): Promise<Task> {
    return api.post<Task>(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, data);
  },

  async updateTask(workspaceId: string, taskId: string, data: UpdateTaskRequest): Promise<Task> {
    return api.patch<Task>(`/workspaces/${workspaceId}/projects/tasks/${taskId}`, data);
  },

  async deleteTask(workspaceId: string, taskId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/projects/tasks/${taskId}`);
  },

  async moveTask(taskId: string, newStatus: string, position?: number): Promise<Task> {
    return api.post<Task>(`/tasks/${taskId}/move`, { status: newStatus, position });
  },

  async addTaskAttachment(taskId: string, file: File): Promise<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post<TaskAttachment>(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async removeTaskAttachment(taskId: string, attachmentId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },

  async updateSubtasks(taskId: string, subtasks: Subtask[]): Promise<Task> {
    return api.put<Task>(`/tasks/${taskId}/subtasks`, { subtasks });
  },

  async logTime(taskId: string, hours: number, description?: string): Promise<void> {
    await api.post(`/tasks/${taskId}/time-logs`, { hours, description });
  },

  // Analytics
  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    return api.get<ProjectAnalytics>(`/projects/${projectId}/analytics`);
  },

  // Unified AI Agent - Intelligently routes to project or task operations
  async processAgentCommand(workspaceId: string, prompt: string, projectId?: string): Promise<{
    success: boolean;
    agentUsed: 'project' | 'task' | 'router';
    action: string;
    message: string;
    data?: any;
    error?: string;
  }> {
    return api.post(`/workspaces/${workspaceId}/projects/ai`, { prompt, projectId });
  },

  // Legacy Project Agent - Use processAgentCommand instead
  async processProjectAgentCommand(workspaceId: string, prompt: string): Promise<{
    success: boolean;
    action: 'create' | 'update' | 'delete' | 'batch_create' | 'batch_update' | 'batch_delete' | 'unknown';
    message: string;
    data?: any;
    error?: string;
  }> {
    return api.post(`/workspaces/${workspaceId}/projects/agent`, { prompt });
  },

  // Legacy Task Agent - Use processAgentCommand instead
  async processTaskAgentCommand(workspaceId: string, projectId: string, prompt: string): Promise<{
    success: boolean;
    action: 'create' | 'update' | 'delete' | 'move' | 'batch_create' | 'batch_update' | 'batch_delete' | 'list' | 'unknown';
    message: string;
    data?: any;
    error?: string;
  }> {
    return api.post(`/workspaces/${workspaceId}/projects/${projectId}/agent`, { prompt });
  },

  // Bulk operations
  async bulkUpdateTasks(taskIds: string[], updates: Partial<UpdateTaskRequest>): Promise<Task[]> {
    return api.patch<Task[]>('/tasks/bulk', { taskIds, updates });
  },

  async bulkDeleteTasks(taskIds: string[]): Promise<void> {
    await api.post('/tasks/bulk-delete', { taskIds });
  },

  // ==================== CUSTOM FIELDS ====================

  async getCustomFields(workspaceId: string, projectId: string): Promise<CustomFieldDefinition[]> {
    return api.get<CustomFieldDefinition[]>(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields`);
  },

  async createCustomField(
    workspaceId: string,
    projectId: string,
    data: CreateCustomFieldRequest
  ): Promise<CustomFieldDefinition> {
    return api.post<CustomFieldDefinition>(`/workspaces/${workspaceId}/projects/${projectId}/custom-fields`, data);
  },

  async updateCustomField(
    workspaceId: string,
    fieldId: string,
    data: UpdateCustomFieldRequest
  ): Promise<CustomFieldDefinition> {
    return api.patch<CustomFieldDefinition>(`/workspaces/${workspaceId}/projects/custom-fields/${fieldId}`, data);
  },

  async deleteCustomField(workspaceId: string, fieldId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/projects/custom-fields/${fieldId}`);
  },

  async reorderCustomFields(
    workspaceId: string,
    projectId: string,
    fieldIds: string[]
  ): Promise<CustomFieldDefinition[]> {
    return api.patch<CustomFieldDefinition[]>(
      `/workspaces/${workspaceId}/projects/${projectId}/custom-fields/reorder`,
      { fieldIds }
    );
  },

  async addSelectOption(
    workspaceId: string,
    fieldId: string,
    option: { label: string; color?: string }
  ): Promise<SelectOption> {
    return api.post<SelectOption>(`/workspaces/${workspaceId}/projects/custom-fields/${fieldId}/options`, option);
  },
};

// React Query Hooks
export const useProjects = (workspaceId: string, filters?: {
  status?: string;
  tags?: string[];
  teamMember?: string;
}) => {
  const setProjects = useProjectsStore((state) => state.setProjects);

  const query = useQuery({
    queryKey: projectKeys.list(workspaceId, JSON.stringify(filters)),
    queryFn: async () => {
      const result = await projectApi.getProjects(workspaceId, filters);
      return result;
    },
    enabled: !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Sync to Zustand whenever data changes (including after refetch/invalidate)
  React.useEffect(() => {
    console.log('🔄 [useProjects] useEffect triggered:', {
      hasData: !!query.data,
      isSuccess: query.isSuccess,
      dataType: Array.isArray(query.data) ? 'array' : typeof query.data,
      dataKeys: query.data ? Object.keys(query.data) : [],
      dataCount: Array.isArray(query.data) ? query.data.length : query.data?.data?.length,
      isFetching: query.isFetching
    });

    // ALWAYS sync when we have data, regardless of success status
    // This handles both initial load and refetches
    if (query.data) {
      if (query.data?.data && Array.isArray(query.data.data)) {
        setProjects(query.data.data);
      } else if (Array.isArray(query.data)) {
        setProjects(query.data);
      }
    }
  }, [query.data, setProjects]);

  return query;
};

export const useProject = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectApi.getProject(workspaceId, projectId),
    enabled: !!projectId && !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const addProject = useProjectsStore((state) => state.addProject);

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateProjectRequest }) =>
      projectApi.createProject(workspaceId, data),
    onSuccess: (newProject, { workspaceId }) => {
      console.log('✅ [useCreateProject] Adding project to store:', newProject);
      // Immediately update Zustand store for instant UI update
      addProject(newProject);
      console.log('✅ [useCreateProject] Invalidating queries for workspace:', workspaceId);
      // Invalidate queries to refetch from server
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const updateProject = useProjectsStore((state) => state.updateProject);

  return useMutation({
    mutationFn: ({ workspaceId, projectId, data }: { workspaceId: string; projectId: string; data: Partial<CreateProjectRequest> }) =>
      projectApi.updateProject(workspaceId, projectId, data),
    onSuccess: (updatedProject, { projectId }) => {
      // Immediately update Zustand store for instant UI update
      updateProject(projectId, updatedProject);
      // Invalidate queries to refetch from server
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const removeProject = useProjectsStore((state) => state.removeProject);

  return useMutation({
    mutationFn: ({ workspaceId, projectId }: { workspaceId: string; projectId: string }) =>
      projectApi.deleteProject(workspaceId, projectId),
    onSuccess: (_, { projectId }) => {
      // Immediately update Zustand store for instant UI update
      removeProject(projectId);
      // Invalidate queries to refetch from server
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useTasks = (workspaceId: string, projectId: string, filters?: {
  status?: string;
  priority?: string;
  assignee?: string;
  tag?: string;
}) => {
  const setTasks = useProjectsStore((state) => state.setTasks);

  return useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: async () => {
      const tasks = await projectApi.getTasks(workspaceId, projectId, filters);
      // Sync with Zustand store
      setTasks(projectId, tasks);
      return tasks;
    },
    enabled: !!projectId && !!workspaceId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: projectKeys.task('', taskId),
    queryFn: () => projectApi.getTask(taskId),
    enabled: !!taskId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const addTask = useProjectsStore((state) => state.addTask);

  return useMutation({
    mutationFn: ({ workspaceId, projectId, data }: { workspaceId: string; projectId: string; data: CreateTaskRequest }) =>
      projectApi.createTask(workspaceId, projectId, data),
    onSuccess: async (newTask, { projectId }) => {
      // Immediately update Zustand store for instant UI update
      addTask(projectId, newTask);
      // Refetch task queries for immediate sidebar update
      await queryClient.refetchQueries({ queryKey: projectKeys.tasks(projectId) });
      await queryClient.refetchQueries({ queryKey: ['project-tasks', projectId] }); // Sidebar query key
      await queryClient.invalidateQueries({ queryKey: projectKeys.analytics(projectId) });
      // Mark projects list as stale (will refetch on next mount/navigation)
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const updateTaskInStore = useProjectsStore((state) => state.updateTask);

  return useMutation({
    mutationFn: ({ workspaceId, taskId, data }: { workspaceId: string; taskId: string; data: UpdateTaskRequest }) =>
      projectApi.updateTask(workspaceId, taskId, data),
    onSuccess: async (updatedTask) => {
      // Immediately update Zustand store for instant UI update
      updateTaskInStore(updatedTask.projectId, updatedTask.id, updatedTask);
      // Refetch task queries for immediate sidebar update
      await queryClient.refetchQueries({ queryKey: projectKeys.tasks(updatedTask.projectId) });
      await queryClient.refetchQueries({ queryKey: ['project-tasks', updatedTask.projectId] }); // Sidebar query key
      await queryClient.invalidateQueries({ queryKey: projectKeys.analytics(updatedTask.projectId) });
      // Mark projects list as stale (will refetch on next mount/navigation)
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useMoveTask = () => {
  const queryClient = useQueryClient();
  const moveTaskInStore = useProjectsStore((state) => state.moveTask);

  return useMutation({
    mutationFn: ({ taskId, newStatus, position }: {
      taskId: string;
      newStatus: string;
      position?: number;
    }) => projectApi.moveTask(taskId, newStatus, position),
    onMutate: async ({ taskId, newStatus }) => {
      console.log('🎯 Optimistic update starting for task:', taskId, 'new status:', newStatus);

      // Find the task's projectId by searching all task caches
      let projectId: string | null = null;

      queryClient.getQueriesData({ queryKey: projectKeys.all }).forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          const task = (data as Task[]).find(t => t.id === taskId);
          if (task) {
            projectId = task.projectId;
          }
        }
      });

      if (!projectId) {
        console.warn('⚠️ Could not find projectId for task:', taskId);
        return { previousMainTasks: undefined, previousSidebarTasks: undefined, projectId: '' };
      }

      console.log('📋 Found projectId:', projectId);

      // Immediately update Zustand store for instant UI update
      moveTaskInStore(projectId, taskId, newStatus);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.tasks(projectId) });
      await queryClient.cancelQueries({ queryKey: ['project-tasks', projectId] });

      // Snapshot previous values
      const previousMainTasks = queryClient.getQueryData<Task[]>(projectKeys.tasks(projectId));
      const previousSidebarTasks = queryClient.getQueryData<Task[]>(['project-tasks', projectId]);

      // Optimistically update main tasks
      if (previousMainTasks) {
        const updatedMainTasks = previousMainTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        );
        queryClient.setQueryData(projectKeys.tasks(projectId), updatedMainTasks);
        console.log('✅ Updated main tasks cache');
      }

      // Optimistically update sidebar tasks
      if (previousSidebarTasks) {
        const updatedSidebarTasks = previousSidebarTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        );
        queryClient.setQueryData(['project-tasks', projectId], updatedSidebarTasks);
        console.log('✅ Updated sidebar tasks cache');
      }

      return { previousMainTasks, previousSidebarTasks, projectId };
    },
    onError: (err, variables, context) => {
      console.error('❌ Error moving task, rolling back:', err);
      // Rollback on error
      if (context?.projectId) {
        if (context.previousMainTasks) {
          queryClient.setQueryData(projectKeys.tasks(context.projectId), context.previousMainTasks);
        }
        if (context.previousSidebarTasks) {
          queryClient.setQueryData(['project-tasks', context.projectId], context.previousSidebarTasks);
        }
      }
    },
    onSuccess: async (updatedTask) => {
      console.log('✅ Task moved successfully, syncing with server');
      // Refetch to ensure data is in sync with server
      await queryClient.refetchQueries({ queryKey: projectKeys.tasks(updatedTask.projectId) });
      await queryClient.refetchQueries({ queryKey: ['project-tasks', updatedTask.projectId] });
      await queryClient.invalidateQueries({ queryKey: projectKeys.analytics(updatedTask.projectId) });
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const removeTask = useProjectsStore((state) => state.removeTask);

  return useMutation({
    mutationFn: ({ workspaceId, taskId, projectId }: { workspaceId: string; taskId: string; projectId: string }) =>
      projectApi.deleteTask(workspaceId, taskId),
    onSuccess: async (_, { projectId, taskId }) => {
      // Immediately update Zustand store for instant UI update
      removeTask(projectId, taskId);
      // Refetch task queries for immediate sidebar update
      await queryClient.refetchQueries({ queryKey: projectKeys.tasks(projectId) });
      await queryClient.refetchQueries({ queryKey: ['project-tasks', projectId] }); // Sidebar query key
      await queryClient.invalidateQueries({ queryKey: projectKeys.analytics(projectId) });
      // Mark projects list as stale (will refetch on next mount/navigation)
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useProjectAnalytics = (projectId: string) => {
  return useQuery({
    queryKey: projectKeys.analytics(projectId),
    queryFn: () => projectApi.getProjectAnalytics(projectId),
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ taskIds, updates }: { 
      taskIds: string[]; 
      updates: Partial<UpdateTaskRequest>;
    }) => projectApi.bulkUpdateTasks(taskIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
};

export const useLogTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, hours, description }: {
      taskId: string;
      hours: number;
      description?: string;
    }) => projectApi.logTime(taskId, hours, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
};

// ==================== CUSTOM FIELD HOOKS ====================

export const useCustomFields = (workspaceId: string, projectId: string) => {
  return useQuery({
    queryKey: projectKeys.customFields(projectId),
    queryFn: () => projectApi.getCustomFields(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
    staleTime: 60 * 1000,
  });
};

export const useCreateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      projectId,
      data,
    }: {
      workspaceId: string;
      projectId: string;
      data: CreateCustomFieldRequest;
    }) => projectApi.createCustomField(workspaceId, projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.customFields(projectId) });
    },
  });
};

export const useUpdateCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      fieldId,
      projectId,
      data,
    }: {
      workspaceId: string;
      fieldId: string;
      projectId: string;
      data: UpdateCustomFieldRequest;
    }) => projectApi.updateCustomField(workspaceId, fieldId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.customFields(projectId) });
    },
  });
};

export const useDeleteCustomField = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      fieldId,
      projectId,
    }: {
      workspaceId: string;
      fieldId: string;
      projectId: string;
    }) => projectApi.deleteCustomField(workspaceId, fieldId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.customFields(projectId) });
    },
  });
};

export const useAddSelectOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      fieldId,
      projectId,
      option,
    }: {
      workspaceId: string;
      fieldId: string;
      projectId: string;
      option: { label: string; color?: string };
    }) => projectApi.addSelectOption(workspaceId, fieldId, option),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.customFields(projectId) });
    },
  });
};

// Backward compatibility: export as projectService
export const projectService = projectApi;