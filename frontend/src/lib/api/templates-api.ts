// src/lib/api/templates-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ==================== TYPES ====================

export type TemplateCategory =
  | 'software_development'
  | 'marketing'
  | 'hr'
  | 'design'
  | 'business'
  | 'events'
  | 'research'
  | 'personal'
  | 'sales'
  | 'finance'
  | 'it_support'
  | 'education'
  | 'freelance'
  | 'operations'
  | 'healthcare'
  | 'legal'
  | 'real_estate'
  | 'manufacturing'
  | 'nonprofit'
  | 'media';

export interface TemplateTask {
  title: string;
  description?: string;
  assigneeRole?: 'owner' | 'lead' | 'member';
  dueOffset?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  storyPoints?: number;
  labels?: string[];
  subtasks?: { title: string }[];
}

export interface TemplateSection {
  name: string;
  description?: string;
  tasks: TemplateTask[];
}

export interface TemplateStructure {
  sections: TemplateSection[];
  customFields?: {
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
    description?: string;
    options?: string[];
    defaultValue?: any;
    isRequired?: boolean;
  }[];
  settings?: {
    defaultView?: 'board' | 'list' | 'timeline';
    statuses?: string[];
  };
}

export interface KanbanStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

export interface ProjectTemplate {
  id: string;
  workspaceId: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: TemplateCategory;
  icon: string | null;
  color: string | null;
  structure: TemplateStructure;
  projectType: 'kanban' | 'scrum' | 'waterfall';
  kanbanStages: KanbanStage[] | null;
  customFields: any[];
  settings: Record<string, any>;
  isSystem: boolean;
  isFeatured: boolean;
  usageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateQueryParams {
  category?: TemplateCategory;
  systemOnly?: boolean;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedTemplatesResponse {
  data: ProjectTemplate[];
  pagination: PaginationMeta;
}

export interface CreateTemplateRequest {
  name: string;
  slug: string;
  description?: string;
  category: TemplateCategory;
  icon?: string;
  color?: string;
  structure: TemplateStructure;
  projectType?: 'kanban' | 'scrum' | 'waterfall';
  kanbanStages?: KanbanStage[];
  customFields?: any[];
  settings?: Record<string, any>;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  structure?: TemplateStructure;
  kanbanStages?: KanbanStage[];
  isFeatured?: boolean;
  settings?: Record<string, any>;
}

export interface CreateProjectFromTemplateRequest {
  templateId: string;
  projectName: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  leadId?: string;
  defaultAssignees?: string[];
  customizations?: Record<string, any>;
}

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

// ==================== QUERY KEYS ====================

export const templateQueryKeys = {
  all: ['templates'] as const,
  lists: () => [...templateQueryKeys.all, 'list'] as const,
  list: (workspaceId: string, params?: TemplateQueryParams) =>
    [...templateQueryKeys.lists(), workspaceId, params] as const,
  categories: () => [...templateQueryKeys.all, 'categories'] as const,
  byCategory: (workspaceId: string, category: TemplateCategory) =>
    [...templateQueryKeys.all, 'category', workspaceId, category] as const,
  details: () => [...templateQueryKeys.all, 'detail'] as const,
  detail: (workspaceId: string, idOrSlug: string) =>
    [...templateQueryKeys.details(), workspaceId, idOrSlug] as const,
};

// ==================== API FUNCTIONS ====================

export const templatesApi = {
  /**
   * Get all templates (system + workspace-specific) with pagination
   */
  async getAll(
    workspaceId: string,
    params?: TemplateQueryParams
  ): Promise<PaginatedTemplatesResponse> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.systemOnly) queryParams.set('systemOnly', 'true');
    if (params?.featured) queryParams.set('featured', 'true');
    if (params?.search) queryParams.set('search', params.search);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/templates${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ data: ProjectTemplate[]; pagination: PaginationMeta }>(url);
    return { data: response.data, pagination: response.pagination };
  },

  /**
   * Get templates by category
   */
  async getByCategory(
    workspaceId: string,
    category: TemplateCategory
  ): Promise<ProjectTemplate[]> {
    const response = await api.get<{ data: ProjectTemplate[] }>(
      `/workspaces/${workspaceId}/templates/category/${category}`
    );
    return response.data;
  },

  /**
   * Get all categories with counts
   */
  async getCategories(workspaceId: string): Promise<CategoryInfo[]> {
    const response = await api.get<{ data: CategoryInfo[] }>(
      `/workspaces/${workspaceId}/templates/categories`
    );
    return response.data;
  },

  /**
   * Get a single template by ID or slug
   */
  async getOne(
    workspaceId: string,
    idOrSlug: string
  ): Promise<ProjectTemplate> {
    const response = await api.get<{ data: ProjectTemplate }>(
      `/workspaces/${workspaceId}/templates/${idOrSlug}`
    );
    return response.data;
  },

  /**
   * Create a custom template
   */
  async create(
    workspaceId: string,
    data: CreateTemplateRequest
  ): Promise<ProjectTemplate> {
    const response = await api.post<{ data: ProjectTemplate }>(
      `/workspaces/${workspaceId}/templates`,
      data
    );
    return response.data;
  },

  /**
   * Update a custom template
   */
  async update(
    workspaceId: string,
    templateId: string,
    data: UpdateTemplateRequest
  ): Promise<ProjectTemplate> {
    const response = await api.patch<{ data: ProjectTemplate }>(
      `/workspaces/${workspaceId}/templates/${templateId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a custom template
   */
  async delete(workspaceId: string, templateId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/templates/${templateId}`);
  },

  /**
   * Create a project from a template
   */
  async createProjectFromTemplate(
    workspaceId: string,
    idOrSlug: string,
    data: Omit<CreateProjectFromTemplateRequest, 'templateId'>
  ): Promise<any> {
    const response = await api.post<{ data: any }>(
      `/workspaces/${workspaceId}/templates/${idOrSlug}/create-project`,
      { ...data, templateId: idOrSlug }
    );
    return response.data;
  },

  /**
   * Seed system templates (admin operation)
   */
  async seedSystemTemplates(workspaceId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/templates/seed`, {});
  },
};

// ==================== REACT QUERY HOOKS ====================

/**
 * Hook to fetch all templates with pagination
 */
export function useTemplates(
  workspaceId: string,
  params?: TemplateQueryParams
) {
  return useQuery({
    queryKey: templateQueryKeys.list(workspaceId, params),
    queryFn: () => templatesApi.getAll(workspaceId, params),
    enabled: !!workspaceId,
    select: (response) => response.data, // For backward compatibility
  });
}

/**
 * Hook to fetch templates with full pagination metadata
 */
export function useTemplatesPaginated(
  workspaceId: string,
  params?: TemplateQueryParams
) {
  return useQuery({
    queryKey: templateQueryKeys.list(workspaceId, params),
    queryFn: () => templatesApi.getAll(workspaceId, params),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to fetch templates by category
 */
export function useTemplatesByCategory(
  workspaceId: string,
  category: TemplateCategory
) {
  return useQuery({
    queryKey: templateQueryKeys.byCategory(workspaceId, category),
    queryFn: () => templatesApi.getByCategory(workspaceId, category),
    enabled: !!workspaceId && !!category,
  });
}

/**
 * Hook to fetch template categories
 */
export function useTemplateCategories(workspaceId: string) {
  return useQuery({
    queryKey: templateQueryKeys.categories(),
    queryFn: () => templatesApi.getCategories(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to fetch a single template
 */
export function useTemplate(workspaceId: string, idOrSlug: string) {
  return useQuery({
    queryKey: templateQueryKeys.detail(workspaceId, idOrSlug),
    queryFn: () => templatesApi.getOne(workspaceId, idOrSlug),
    enabled: !!workspaceId && !!idOrSlug,
  });
}

/**
 * Hook to create a custom template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: CreateTemplateRequest;
    }) => templatesApi.create(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook to update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      templateId,
      data,
    }: {
      workspaceId: string;
      templateId: string;
      data: UpdateTemplateRequest;
    }) => templatesApi.update(workspaceId, templateId, data),
    onSuccess: (_, { workspaceId, templateId }) => {
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.detail(workspaceId, templateId),
      });
    },
  });
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      templateId,
    }: {
      workspaceId: string;
      templateId: string;
    }) => templatesApi.delete(workspaceId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook to create a project from a template
 */
export function useCreateProjectFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      idOrSlug,
      data,
    }: {
      workspaceId: string;
      idOrSlug: string;
      data: Omit<CreateProjectFromTemplateRequest, 'templateId'>;
    }) => templatesApi.createProjectFromTemplate(workspaceId, idOrSlug, data),
    onSuccess: () => {
      // Invalidate projects list to show the new project
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Invalidate templates to update usage count
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook to seed system templates
 */
export function useSeedTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId }: { workspaceId: string }) =>
      templatesApi.seedSystemTemplates(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lists(),
      });
    },
  });
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: TemplateCategory): string {
  const names: Record<TemplateCategory, string> = {
    software_development: 'Software Development',
    marketing: 'Marketing',
    hr: 'HR & People',
    design: 'Design & Creative',
    business: 'Business & Operations',
    events: 'Events & Webinars',
    research: 'Research & Analysis',
    personal: 'Personal & Productivity',
    sales: 'Sales',
    finance: 'Finance',
    it_support: 'IT Support',
    education: 'Education',
    freelance: 'Freelance',
    operations: 'Operations',
    healthcare: 'Healthcare',
    legal: 'Legal',
    real_estate: 'Real Estate',
    manufacturing: 'Manufacturing',
    nonprofit: 'Non-Profit',
    media: 'Media & Entertainment',
  };
  return names[category] || category;
}

/**
 * Get category icon name (Lucide icon names)
 */
export function getCategoryIcon(category: TemplateCategory): string {
  const icons: Record<TemplateCategory, string> = {
    software_development: 'Code',
    marketing: 'Megaphone',
    hr: 'Users',
    design: 'Palette',
    business: 'Briefcase',
    events: 'Calendar',
    research: 'Search',
    personal: 'User',
    sales: 'TrendingUp',
    finance: 'DollarSign',
    it_support: 'Headphones',
    education: 'GraduationCap',
    freelance: 'Laptop',
    operations: 'Settings',
    healthcare: 'Heart',
    legal: 'Scale',
    real_estate: 'Home',
    manufacturing: 'Factory',
    nonprofit: 'HandHeart',
    media: 'Film',
  };
  return icons[category] || 'FileText';
}

/**
 * Get category color (hex)
 */
export function getCategoryColor(category: TemplateCategory): string {
  const colors: Record<TemplateCategory, string> = {
    software_development: '#9333EA',
    marketing: '#EC4899',
    hr: '#14B8A6',
    design: '#6366F1',
    business: '#3B82F6',
    events: '#F97316',
    research: '#06B6D4',
    personal: '#22C55E',
    sales: '#10B981',
    finance: '#059669',
    it_support: '#2563EB',
    education: '#EAB308',
    freelance: '#A855F7',
    operations: '#6B7280',
    healthcare: '#EF4444',
    legal: '#78716C',
    real_estate: '#0EA5E9',
    manufacturing: '#64748B',
    nonprofit: '#F472B6',
    media: '#A855F7',
  };
  return colors[category] || '#6B7280';
}

/**
 * Calculate total tasks in a template
 */
export function getTemplateTotalTasks(template: ProjectTemplate): number {
  if (!template.structure?.sections) return 0;

  let total = 0;
  for (const section of template.structure.sections) {
    total += section.tasks.length;
    for (const task of section.tasks) {
      if (task.subtasks) {
        total += task.subtasks.length;
      }
    }
  }
  return total;
}

/**
 * Get template complexity level based on task count
 */
export function getTemplateComplexity(
  template: ProjectTemplate
): 'Simple' | 'Medium' | 'Complex' {
  const taskCount = getTemplateTotalTasks(template);
  if (taskCount <= 10) return 'Simple';
  if (taskCount <= 25) return 'Medium';
  return 'Complex';
}
