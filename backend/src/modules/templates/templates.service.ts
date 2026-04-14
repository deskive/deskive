import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateProjectFromTemplateDto,
  TemplateQueryDto,
  TemplateCategory,
} from './dto';
import { TaskPriority } from '../projects/dto/create-task.dto';
import { SOFTWARE_DEVELOPMENT_TEMPLATES } from './data/software-development-templates';
import { MARKETING_TEMPLATES } from './data/marketing-templates';
import { HR_TEMPLATES } from './data/hr-templates';
import { DESIGN_TEMPLATES } from './data/design-templates';
import { BUSINESS_TEMPLATES } from './data/business-templates';
import { EVENTS_TEMPLATES } from './data/events-templates';
import { RESEARCH_TEMPLATES } from './data/research-templates';
import { PERSONAL_TEMPLATES } from './data/personal-templates';
import { SALES_TEMPLATES } from './data/sales-templates';
import { FINANCE_TEMPLATES } from './data/finance-templates';
import { IT_SUPPORT_TEMPLATES } from './data/it-support-templates';
import { EDUCATION_TEMPLATES } from './data/education-templates';
import { FREELANCE_TEMPLATES } from './data/freelance-templates';
import { OPERATIONS_TEMPLATES } from './data/operations-templates';
import { HEALTHCARE_TEMPLATES } from './data/healthcare-templates';
import { LEGAL_TEMPLATES } from './data/legal-templates';
import { REAL_ESTATE_TEMPLATES } from './data/real-estate-templates';
import { MANUFACTURING_TEMPLATES } from './data/manufacturing-templates';
import { NONPROFIT_TEMPLATES } from './data/nonprofit-templates';
import { MEDIA_TEMPLATES } from './data/media-templates';

// Combine all templates
const ALL_TEMPLATES = [
  ...SOFTWARE_DEVELOPMENT_TEMPLATES,
  ...MARKETING_TEMPLATES,
  ...HR_TEMPLATES,
  ...DESIGN_TEMPLATES,
  ...BUSINESS_TEMPLATES,
  ...EVENTS_TEMPLATES,
  ...RESEARCH_TEMPLATES,
  ...PERSONAL_TEMPLATES,
  ...SALES_TEMPLATES,
  ...FINANCE_TEMPLATES,
  ...IT_SUPPORT_TEMPLATES,
  ...EDUCATION_TEMPLATES,
  ...FREELANCE_TEMPLATES,
  ...OPERATIONS_TEMPLATES,
  ...HEALTHCARE_TEMPLATES,
  ...LEGAL_TEMPLATES,
  ...REAL_ESTATE_TEMPLATES,
  ...MANUFACTURING_TEMPLATES,
  ...NONPROFIT_TEMPLATES,
  ...MEDIA_TEMPLATES,
];

export interface ProjectTemplate {
  id: string;
  workspaceId: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  structure: any;
  projectType: string;
  kanbanStages: any[] | null;
  customFields: any[];
  settings: Record<string, any>;
  isSystem: boolean;
  isFeatured: boolean;
  usageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TemplatesService {
  constructor(
    private readonly db: DatabaseService,
    private projectsService: ProjectsService,
  ) {}

  /**
   * Get all templates (system + workspace-specific) with pagination
   */
  async findAll(
    workspaceId: string,
    query: TemplateQueryDto,
  ): Promise<{
    templates: ProjectTemplate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    // Get all templates first, then filter
    const result = await this.db.table('project_templates').select('*').execute();

    let templates = Array.isArray(result.data) ? result.data : [];

    // Filter: system templates (workspace_id is null) OR workspace-specific templates
    templates = templates.filter((t) => t.workspace_id === null || t.workspace_id === workspaceId);

    if (query.category) {
      templates = templates.filter((t) => t.category === query.category);
    }

    if (query.systemOnly) {
      templates = templates.filter((t) => t.is_system === true);
    }

    if (query.featured) {
      templates = templates.filter((t) => t.is_featured === true);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower)),
      );
    }

    // Sort by usage_count descending
    templates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));

    // Get total count before pagination
    const total = templates.length;

    // Apply pagination
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const totalPages = Math.ceil(total / limit);

    // Slice templates for current page
    const paginatedTemplates = templates.slice(startIndex, endIndex);

    return {
      templates: this.mapTemplates(paginatedTemplates),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Get templates by category
   */
  async findByCategory(
    workspaceId: string,
    category: TemplateCategory,
  ): Promise<ProjectTemplate[]> {
    const result = await this.db
      .table('project_templates')
      .select('*')
      .where('category', '=', category)
      .execute();

    let templates = Array.isArray(result.data) ? result.data : [];

    // Filter: system templates OR workspace-specific templates
    templates = templates.filter((t) => t.workspace_id === null || t.workspace_id === workspaceId);

    // Sort by usage_count descending
    templates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));

    return this.mapTemplates(templates);
  }

  /**
   * Get a single template by ID or slug
   */
  async findOne(workspaceId: string, idOrSlug: string): Promise<ProjectTemplate> {
    // Check if idOrSlug is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let result;
    let templates: any[] = [];

    // Try to find by ID first (only if it's a valid UUID)
    if (isUuid) {
      result = await this.db
        .table('project_templates')
        .select('*')
        .where('id', '=', idOrSlug)
        .execute();

      templates = Array.isArray(result?.data) ? result.data : [];
    }

    // If not found or not a UUID, try by slug
    if (templates.length === 0) {
      result = await this.db
        .table('project_templates')
        .select('*')
        .where('slug', '=', idOrSlug)
        .execute();

      templates = Array.isArray(result?.data) ? result.data : [];
    }

    if (templates.length === 0) {
      throw new NotFoundException(`Template not found: ${idOrSlug}`);
    }

    const template = templates[0];

    // Check if template is accessible (system or belongs to workspace)
    if (template.workspace_id && template.workspace_id !== workspaceId) {
      throw new NotFoundException(`Template not found: ${idOrSlug}`);
    }

    return this.mapTemplate(template);
  }

  /**
   * Create a new custom template
   */
  async create(
    workspaceId: string,
    createTemplateDto: CreateTemplateDto,
    userId: string,
  ): Promise<ProjectTemplate> {
    // Check if slug already exists
    const existingResult = await this.db
      .table('project_templates')
      .select('id')
      .where('slug', '=', createTemplateDto.slug)
      .execute();

    const existing = Array.isArray(existingResult.data) ? existingResult.data : [];

    if (existing.length > 0) {
      throw new ConflictException(`Template with slug "${createTemplateDto.slug}" already exists`);
    }

    const templateData = {
      workspace_id: workspaceId,
      name: createTemplateDto.name,
      slug: createTemplateDto.slug,
      description: createTemplateDto.description || null,
      category: createTemplateDto.category,
      icon: createTemplateDto.icon || null,
      color: createTemplateDto.color || null,
      structure: JSON.stringify(createTemplateDto.structure),
      project_type: createTemplateDto.projectType || 'kanban',
      kanban_stages: createTemplateDto.kanbanStages
        ? JSON.stringify(createTemplateDto.kanbanStages)
        : null,
      custom_fields: JSON.stringify(createTemplateDto.customFields || []),
      settings: JSON.stringify(createTemplateDto.settings || {}),
      is_system: false,
      is_featured: false,
      usage_count: 0,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await this.db.insert('project_templates', templateData);

    return this.mapTemplate(result);
  }

  /**
   * Update a custom template (cannot update system templates)
   */
  async update(
    workspaceId: string,
    templateId: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(workspaceId, templateId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot modify system templates');
    }

    if (template.workspaceId !== workspaceId) {
      throw new BadRequestException('Cannot modify templates from other workspaces');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updateTemplateDto.name) updateData.name = updateTemplateDto.name;
    if (updateTemplateDto.description !== undefined)
      updateData.description = updateTemplateDto.description;
    if (updateTemplateDto.icon !== undefined) updateData.icon = updateTemplateDto.icon;
    if (updateTemplateDto.color !== undefined) updateData.color = updateTemplateDto.color;
    if (updateTemplateDto.structure)
      updateData.structure = JSON.stringify(updateTemplateDto.structure);
    if (updateTemplateDto.kanbanStages)
      updateData.kanban_stages = JSON.stringify(updateTemplateDto.kanbanStages);
    if (updateTemplateDto.settings)
      updateData.settings = JSON.stringify(updateTemplateDto.settings);
    if (updateTemplateDto.isFeatured !== undefined)
      updateData.is_featured = updateTemplateDto.isFeatured;

    const result = await this.db.update('project_templates', templateId, updateData);

    return this.mapTemplate(result);
  }

  /**
   * Delete a custom template (cannot delete system templates)
   */
  async delete(workspaceId: string, templateId: string, userId: string): Promise<void> {
    const template = await this.findOne(workspaceId, templateId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    if (template.workspaceId !== workspaceId) {
      throw new BadRequestException('Cannot delete templates from other workspaces');
    }

    await this.db.delete('project_templates', templateId);
  }

  /**
   * Create a project from a template
   */
  async createProjectFromTemplate(
    workspaceId: string,
    dto: CreateProjectFromTemplateDto,
    userId: string,
  ): Promise<any> {
    // Find the template
    const template = await this.findOne(workspaceId, dto.templateId);

    // Increment usage count
    await this.db
      .table('project_templates')
      .where('id', '=', template.id)
      .update({ usage_count: template.usageCount + 1 })
      .execute();

    // Create the project
    const projectData: any = {
      name: dto.projectName,
      description: dto.description || template.description,
      type: template.projectType,
      status: 'active',
      lead_id: dto.leadId || null,
      start_date: dto.startDate || null,
      end_date: dto.endDate || null,
      kanban_stages: template.kanbanStages || undefined,
      collaborative_data: dto.defaultAssignees
        ? { default_assignee_ids: dto.defaultAssignees }
        : undefined,
    };

    const project = await this.projectsService.create(workspaceId, projectData, userId);

    // Create tasks from template structure
    const structure = template.structure;
    if (structure && structure.sections) {
      const projectStartDate = dto.startDate ? new Date(dto.startDate) : new Date();

      // Get the first kanban stage as default status, or fall back to 'todo'
      const defaultStatus = template.kanbanStages?.[0]?.id || 'todo';

      for (const section of structure.sections) {
        for (const task of section.tasks) {
          const taskDueDate = task.dueOffset
            ? new Date(projectStartDate.getTime() + task.dueOffset * 24 * 60 * 60 * 1000)
            : null;

          // Determine assignees
          let assignees: string[] = [];
          if (task.assigneeRole === 'owner') {
            assignees = [userId];
          } else if (task.assigneeRole === 'lead' && dto.leadId) {
            assignees = [dto.leadId];
          } else if (dto.defaultAssignees && dto.defaultAssignees.length > 0) {
            assignees = dto.defaultAssignees;
          }

          // Map priority string to TaskPriority enum
          const priorityMap: Record<string, TaskPriority> = {
            lowest: TaskPriority.LOWEST,
            low: TaskPriority.LOW,
            medium: TaskPriority.MEDIUM,
            high: TaskPriority.HIGH,
            highest: TaskPriority.HIGHEST,
            urgent: TaskPriority.HIGHEST, // Map urgent to highest
          };

          const taskData = {
            title: task.title,
            description: task.description || null,
            status: defaultStatus,
            priority: priorityMap[task.priority || 'medium'] || TaskPriority.MEDIUM,
            due_date: taskDueDate ? taskDueDate.toISOString().split('T')[0] : null,
            story_points: task.storyPoints || null,
            labels: task.labels || [],
            assigned_to: assignees,
          };

          const createdTask = await this.projectsService.createTask(
            project.id,
            taskData as any,
            userId,
          );

          // Create subtasks if any
          if (task.subtasks && task.subtasks.length > 0) {
            for (const subtask of task.subtasks) {
              await this.projectsService.createTask(
                project.id,
                {
                  title: subtask.title,
                  parent_task_id: createdTask.id,
                  status: defaultStatus,
                  priority: TaskPriority.MEDIUM,
                  assigned_to: assignees,
                } as any,
                userId,
              );
            }
          }
        }
      }
    }

    // Create custom fields if defined in template
    if (template.customFields && template.customFields.length > 0) {
      for (const field of template.customFields) {
        // Format options for select fields
        const formattedOptions = field.options
          ? field.options.map((opt: string, index: number) => ({
              id: `option-${Date.now()}-${index}`,
              label: opt,
            }))
          : [];

        await this.projectsService.createCustomField(
          project.id,
          {
            name: field.name,
            fieldType: field.type,
            description: field.description,
            options: formattedOptions,
            defaultValue: field.defaultValue,
            isRequired: field.isRequired || false,
          },
          userId,
        );
      }
    }

    return project;
  }

  /**
   * Seed system templates (called on module init or manually)
   */
  async seedSystemTemplates(): Promise<void> {
    let created = 0;

    for (const template of ALL_TEMPLATES) {
      // Check if template already exists
      const existingResult = await this.db
        .table('project_templates')
        .select('id')
        .where('slug', '=', template.slug)
        .execute();

      const existing = Array.isArray(existingResult.data) ? existingResult.data : [];

      if (existing.length > 0) {
        continue;
      }

      const templateData = {
        workspace_id: null, // System templates have no workspace
        name: template.name,
        slug: template.slug,
        description: template.description,
        category: template.category,
        icon: template.icon,
        color: template.color,
        structure: JSON.stringify(template.structure),
        project_type: template.projectType,
        kanban_stages: template.kanbanStages ? JSON.stringify(template.kanbanStages) : null,
        custom_fields: JSON.stringify(template.customFields || []),
        settings: JSON.stringify(template.settings || {}),
        is_system: true,
        is_featured: template.isFeatured || false,
        usage_count: 0,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.db.insert('project_templates', templateData);
      created++;
    }

    if (created > 0) {
      console.log(`[TemplatesService] Seeded ${created} new system templates`);
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<{ id: string; name: string; count: number }[]> {
    const categories = Object.values(TemplateCategory);
    const result = [];

    // Get all templates once
    const allResult = await this.db.table('project_templates').select('category').execute();

    const allTemplates = Array.isArray(allResult.data) ? allResult.data : [];

    for (const category of categories) {
      const count = allTemplates.filter((t) => t.category === category).length;

      result.push({
        id: category,
        name: this.formatCategoryName(category),
        count,
      });
    }

    return result;
  }

  // ==================== PRIVATE HELPERS ====================

  private mapTemplate(row: any): ProjectTemplate {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      category: row.category,
      icon: row.icon,
      color: row.color,
      structure: this.parseJson(row.structure),
      projectType: row.project_type,
      kanbanStages: this.parseJson(row.kanban_stages),
      customFields: this.parseJson(row.custom_fields) || [],
      settings: this.parseJson(row.settings) || {},
      isSystem: row.is_system,
      isFeatured: row.is_featured,
      usageCount: row.usage_count,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTemplates(rows: any[]): ProjectTemplate[] {
    if (!rows) return [];
    return rows.map((row) => this.mapTemplate(row));
  }

  private parseJson(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
