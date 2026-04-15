import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  DocumentTemplateQueryDto,
  DocumentType,
  DocumentTemplateCategory,
} from './dto';
import { PROPOSAL_TEMPLATES } from './data/document-templates/proposal-templates';
import { CONTRACT_TEMPLATES } from './data/document-templates/contract-templates';
import { INVOICE_TEMPLATES } from './data/document-templates/invoice-templates';
import { SOW_TEMPLATES } from './data/document-templates/sow-templates';
import { ALL_BUSINESS_TEMPLATES } from './data/document-templates/business';
import { ALL_HR_TEMPLATES } from './data/document-templates/hr';
import { ALL_SALES_TEMPLATES } from './data/document-templates/sales';
import { ALL_FINANCE_TEMPLATES } from './data/document-templates/finance';
import { ALL_PM_TEMPLATES } from './data/document-templates/project-management';
import { ALL_LEGAL_TEMPLATES } from './data/document-templates/legal';
import { ALL_REAL_ESTATE_TEMPLATES } from './data/document-templates/real-estate';
import { ALL_HEALTHCARE_TEMPLATES } from './data/document-templates/healthcare';
import { ALL_EDUCATION_TEMPLATES } from './data/document-templates/education';
import { ALL_TECHNICAL_TEMPLATES } from './data/document-templates/technical';
import { ALL_EVENTS_TEMPLATES } from './data/document-templates/events';
import { ALL_NONPROFIT_TEMPLATES } from './data/document-templates/nonprofit';
import { ALL_PERSONAL_TEMPLATES } from './data/document-templates/personal';
import { ALL_MANUFACTURING_TEMPLATES } from './data/document-templates/manufacturing';
import { ALL_COMPLIANCE_TEMPLATES } from './data/document-templates/compliance';
import { ALL_CONSTRUCTION_TEMPLATES } from './data/document-templates/construction';
import { ALL_HOSPITALITY_TEMPLATES } from './data/document-templates/hospitality';
import { ALL_AUTOMOTIVE_TEMPLATES } from './data/document-templates/automotive';
import { ALL_INSURANCE_TEMPLATES } from './data/document-templates/insurance';
import { ALL_CONTRACT_TEMPLATES } from './data/document-templates/contracts';
import { ALL_PROPOSAL_TEMPLATES } from './data/document-templates/proposals';
import { ALL_INVOICE_TEMPLATES } from './data/document-templates/invoices';

// Combine all document templates
const ALL_DOCUMENT_TEMPLATES = [
  ...PROPOSAL_TEMPLATES,
  ...CONTRACT_TEMPLATES,
  ...INVOICE_TEMPLATES,
  ...SOW_TEMPLATES,
  ...ALL_CONTRACT_TEMPLATES,
  ...ALL_PROPOSAL_TEMPLATES,
  ...ALL_INVOICE_TEMPLATES,
  ...ALL_BUSINESS_TEMPLATES,
  ...ALL_HR_TEMPLATES,
  ...ALL_SALES_TEMPLATES,
  ...ALL_FINANCE_TEMPLATES,
  ...ALL_PM_TEMPLATES,
  ...ALL_LEGAL_TEMPLATES,
  ...ALL_REAL_ESTATE_TEMPLATES,
  ...ALL_HEALTHCARE_TEMPLATES,
  ...ALL_EDUCATION_TEMPLATES,
  ...ALL_TECHNICAL_TEMPLATES,
  ...ALL_EVENTS_TEMPLATES,
  ...ALL_NONPROFIT_TEMPLATES,
  ...ALL_PERSONAL_TEMPLATES,
  ...ALL_MANUFACTURING_TEMPLATES,
  ...ALL_COMPLIANCE_TEMPLATES,
  ...ALL_CONSTRUCTION_TEMPLATES,
  ...ALL_HOSPITALITY_TEMPLATES,
  ...ALL_AUTOMOTIVE_TEMPLATES,
  ...ALL_INSURANCE_TEMPLATES,
];

export interface DocumentTemplate {
  id: string;
  workspaceId: string | null;
  name: string;
  slug: string;
  description: string | null;
  documentType: string;
  category: string | null;
  icon: string | null;
  color: string | null;
  content: Record<string, any>;
  contentHtml: string | null;
  placeholders: any[];
  signatureFields: any[];
  settings: Record<string, any>;
  isSystem: boolean;
  isFeatured: boolean;
  usageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Ensure the document_templates table exists
   * Since database doesn't support programmatic table creation via API,
   * we check if the table exists by querying it.
   */
  async ensureTableExists(): Promise<boolean> {
    try {
      // Try to query the table to check if it exists
      await this.db.table('document_templates').select('id').limit(1).execute();
      // Table exists - no need to log every startup
      return true;
    } catch (error: any) {
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.error('❌ document_templates table does not exist.');
        console.log('Please create the table by running migrations.');
        console.log('The table schema is defined in: backend/src/database/schema.ts');
        return false;
      }
      // Some other error - log but continue
      console.error('Note: Error checking document_templates table:', error.message);
      return false;
    }
  }

  /**
   * Get all document templates with pagination and filtering
   * Optimized for performance with 600+ templates
   */
  async findAll(
    workspaceId: string,
    query: DocumentTemplateQueryDto,
  ): Promise<{
    templates: DocumentTemplate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    // Select only necessary fields for listing (exclude large content fields)
    const listingFields = [
      'id',
      'workspace_id',
      'name',
      'slug',
      'description',
      'document_type',
      'category',
      'icon',
      'color',
      'is_system',
      'is_featured',
      'usage_count',
      'created_by',
      'created_at',
      'updated_at',
    ].join(', ');

    // Build optimized queries for system templates and workspace templates
    let systemQuery = this.db
      .table('document_templates')
      .select(listingFields)
      .where('is_deleted', '=', false)
      .where('workspace_id', 'is', null);

    let workspaceQuery = this.db
      .table('document_templates')
      .select(listingFields)
      .where('is_deleted', '=', false)
      .where('workspace_id', '=', workspaceId);

    // Apply server-side filters where possible
    if (query.documentType) {
      systemQuery = systemQuery.where('document_type', '=', query.documentType);
      workspaceQuery = workspaceQuery.where('document_type', '=', query.documentType);
    }

    if (query.category) {
      systemQuery = systemQuery.where('category', '=', query.category);
      workspaceQuery = workspaceQuery.where('category', '=', query.category);
    }

    if (query.systemOnly) {
      systemQuery = systemQuery.where('is_system', '=', true);
      workspaceQuery = workspaceQuery.where('is_system', '=', true);
    }

    if (query.featured) {
      systemQuery = systemQuery.where('is_featured', '=', true);
      workspaceQuery = workspaceQuery.where('is_featured', '=', true);
    }

    // Execute both queries in parallel
    const [systemResult, workspaceResult] = await Promise.all([
      systemQuery.execute(),
      workspaceQuery.execute(),
    ]);

    // Combine results
    let templates = [
      ...(Array.isArray(systemResult.data) ? systemResult.data : []),
      ...(Array.isArray(workspaceResult.data) ? workspaceResult.data : []),
    ];

    // Apply search filter (client-side - needed for partial matching)
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower)),
      );
    }

    // Sort by usage_count descending, then by name
    templates.sort((a, b) => {
      const countDiff = (b.usage_count || 0) - (a.usage_count || 0);
      if (countDiff !== 0) return countDiff;
      return a.name.localeCompare(b.name);
    });

    const total = templates.length;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    const paginatedTemplates = templates.slice(startIndex, startIndex + limit);

    return {
      templates: paginatedTemplates.map((t) => this.mapToListingResponse(t)),
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
   * Get document types with counts
   */
  async getDocumentTypes(workspaceId: string) {
    const result = await this.db
      .table('document_templates')
      .select('*')
      .where('is_deleted', '=', false)
      .execute();

    const templates = Array.isArray(result.data) ? result.data : [];
    const filtered = templates.filter(
      (t) => t.workspace_id === null || t.workspace_id === workspaceId,
    );

    const typeCounts = {
      [DocumentType.PROPOSAL]: 0,
      [DocumentType.CONTRACT]: 0,
      [DocumentType.INVOICE]: 0,
      [DocumentType.SOW]: 0,
      [DocumentType.LETTER]: 0,
      [DocumentType.FORM]: 0,
      [DocumentType.REPORT]: 0,
      [DocumentType.POLICY]: 0,
      [DocumentType.AGREEMENT]: 0,
      [DocumentType.PLAN]: 0,
      [DocumentType.CHECKLIST]: 0,
      [DocumentType.MEMO]: 0,
      [DocumentType.CERTIFICATE]: 0,
      [DocumentType.RECEIPT]: 0,
      [DocumentType.BRIEF]: 0,
      [DocumentType.MANUAL]: 0,
      [DocumentType.GUIDE]: 0,
      [DocumentType.TEMPLATE]: 0,
      [DocumentType.RECORD]: 0,
      [DocumentType.LOG]: 0,
    };

    filtered.forEach((t) => {
      if (typeCounts[t.document_type] !== undefined) {
        typeCounts[t.document_type]++;
      }
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      name: this.getDocumentTypeName(type as DocumentType),
      icon: this.getDocumentTypeIcon(type as DocumentType),
      count,
    }));
  }

  /**
   * Get categories with counts
   */
  async getCategories(workspaceId: string) {
    const result = await this.db
      .table('document_templates')
      .select('*')
      .where('is_deleted', '=', false)
      .execute();

    const templates = Array.isArray(result.data) ? result.data : [];
    const filtered = templates.filter(
      (t) => t.workspace_id === null || t.workspace_id === workspaceId,
    );

    const categoryCounts: Record<string, number> = {};
    filtered.forEach((t) => {
      const category = t.category || 'general';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts).map(([category, count]) => ({
      id: category,
      name: this.getCategoryName(category),
      count,
    }));
  }

  /**
   * Get a single template by ID or slug
   */
  async findOne(workspaceId: string, idOrSlug: string): Promise<DocumentTemplate> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let result;
    if (isUuid) {
      result = await this.db
        .table('document_templates')
        .select('*')
        .where('id', '=', idOrSlug)
        .where('is_deleted', '=', false)
        .execute();
    } else {
      result = await this.db
        .table('document_templates')
        .select('*')
        .where('slug', '=', idOrSlug)
        .where('is_deleted', '=', false)
        .execute();
    }

    const templates = Array.isArray(result.data) ? result.data : [];
    const template = templates.find(
      (t) => t.workspace_id === null || t.workspace_id === workspaceId,
    );

    if (!template) {
      throw new NotFoundException(`Document template not found: ${idOrSlug}`);
    }

    return this.mapToResponse(template);
  }

  /**
   * Create a custom document template
   */
  async create(
    workspaceId: string,
    dto: CreateDocumentTemplateDto,
    userId: string,
  ): Promise<DocumentTemplate> {
    // Check for duplicate slug
    const existingResult = await this.db
      .table('document_templates')
      .select('id')
      .where('slug', '=', dto.slug)
      .where('is_deleted', '=', false)
      .execute();

    if (existingResult.data && existingResult.data.length > 0) {
      throw new ConflictException(`Template with slug "${dto.slug}" already exists`);
    }

    const now = new Date().toISOString();
    const data = {
      workspace_id: workspaceId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description || null,
      document_type: dto.documentType,
      category: dto.category || 'general',
      icon: dto.icon || null,
      color: dto.color || null,
      content: dto.content,
      content_html: dto.contentHtml || null,
      placeholders: dto.placeholders || [],
      signature_fields: dto.signatureFields || [],
      settings: dto.settings || {},
      is_system: false,
      is_featured: false,
      usage_count: 0,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };

    const result = await this.db.insert('document_templates', data);
    // Handle both cases: direct object or wrapped in { data: ... }
    const insertedRecord = result?.data ?? result;
    if (!insertedRecord || !insertedRecord.id) {
      throw new Error('Failed to create template: Invalid response from database');
    }
    return this.mapToResponse(insertedRecord);
  }

  /**
   * Update a custom document template
   */
  async update(
    workspaceId: string,
    templateId: string,
    dto: UpdateDocumentTemplateDto,
    userId: string,
  ): Promise<DocumentTemplate> {
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

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.contentHtml !== undefined) updateData.content_html = dto.contentHtml;
    if (dto.placeholders !== undefined) updateData.placeholders = dto.placeholders;
    if (dto.signatureFields !== undefined) updateData.signature_fields = dto.signatureFields;
    if (dto.isFeatured !== undefined) updateData.is_featured = dto.isFeatured;
    if (dto.settings !== undefined) updateData.settings = dto.settings;

    await this.db.update('document_templates', templateId, updateData);
    return this.findOne(workspaceId, templateId);
  }

  /**
   * Delete a custom document template (soft delete)
   */
  async delete(workspaceId: string, templateId: string, userId: string): Promise<void> {
    const template = await this.findOne(workspaceId, templateId);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system templates');
    }

    if (template.workspaceId !== workspaceId) {
      throw new BadRequestException('Cannot delete templates from other workspaces');
    }

    await this.db.update('document_templates', templateId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    });
  }

  /**
   * Increment usage count when template is used
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    const result = await this.db
      .table('document_templates')
      .select('usage_count')
      .where('id', '=', templateId)
      .execute();

    if (result.data && result.data.length > 0) {
      const currentCount = result.data[0].usage_count || 0;
      await this.db.update('document_templates', templateId, {
        usage_count: currentCount + 1,
      });
    }
  }

  /**
   * Seed system document templates
   */
  async seedSystemTemplates(): Promise<void> {
    for (const template of ALL_DOCUMENT_TEMPLATES) {
      // Check if template already exists
      const existingResult = await this.db
        .table('document_templates')
        .select('id')
        .where('slug', '=', template.slug)
        .execute();

      if (existingResult.data && existingResult.data.length > 0) {
        continue; // Skip existing templates
      }

      const now = new Date().toISOString();
      const data = {
        workspace_id: null, // System template
        name: template.name,
        slug: template.slug,
        description: template.description,
        document_type: template.documentType,
        category: template.category,
        icon: template.icon,
        color: template.color,
        content: template.content,
        content_html: (template as any).contentHtml || null,
        placeholders: template.placeholders || [],
        signature_fields: template.signatureFields || [],
        settings: template.settings || {},
        is_system: true,
        is_featured: template.isFeatured || false,
        usage_count: 0,
        created_by: null,
        created_at: now,
        updated_at: now,
      };

      await this.db.insert('document_templates', data);
    }
  }

  /**
   * Map database record to response format
   */
  private mapToResponse(record: any): DocumentTemplate {
    return {
      id: record.id,
      workspaceId: record.workspace_id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      documentType: record.document_type,
      category: record.category,
      icon: record.icon,
      color: record.color,
      content: record.content,
      contentHtml: record.content_html,
      placeholders: record.placeholders || [],
      signatureFields: record.signature_fields || [],
      settings: record.settings || {},
      isSystem: record.is_system,
      isFeatured: record.is_featured,
      usageCount: record.usage_count || 0,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Map database record to lightweight listing response (excludes large content fields)
   */
  private mapToListingResponse(record: any): DocumentTemplate {
    return {
      id: record.id,
      workspaceId: record.workspace_id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      documentType: record.document_type,
      category: record.category,
      icon: record.icon,
      color: record.color,
      content: {}, // Excluded for listing performance
      contentHtml: null, // Excluded for listing performance
      placeholders: [], // Excluded for listing performance
      signatureFields: [], // Excluded for listing performance
      settings: {}, // Excluded for listing performance
      isSystem: record.is_system,
      isFeatured: record.is_featured,
      usageCount: record.usage_count || 0,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private getDocumentTypeName(type: DocumentType): string {
    const names: Record<DocumentType, string> = {
      [DocumentType.PROPOSAL]: 'Proposals',
      [DocumentType.CONTRACT]: 'Contracts',
      [DocumentType.INVOICE]: 'Invoices',
      [DocumentType.SOW]: 'Statements of Work',
      [DocumentType.LETTER]: 'Letters',
      [DocumentType.FORM]: 'Forms',
      [DocumentType.REPORT]: 'Reports',
      [DocumentType.POLICY]: 'Policies',
      [DocumentType.AGREEMENT]: 'Agreements',
      [DocumentType.PLAN]: 'Plans',
      [DocumentType.CHECKLIST]: 'Checklists',
      [DocumentType.MEMO]: 'Memos',
      [DocumentType.CERTIFICATE]: 'Certificates',
      [DocumentType.RECEIPT]: 'Receipts',
      [DocumentType.BRIEF]: 'Briefs',
      [DocumentType.MANUAL]: 'Manuals',
      [DocumentType.GUIDE]: 'Guides',
      [DocumentType.TEMPLATE]: 'Templates',
      [DocumentType.RECORD]: 'Records',
      [DocumentType.LOG]: 'Logs',
    };
    return names[type] || type;
  }

  private getDocumentTypeIcon(type: DocumentType): string {
    const icons: Record<DocumentType, string> = {
      [DocumentType.PROPOSAL]: 'description',
      [DocumentType.CONTRACT]: 'gavel',
      [DocumentType.INVOICE]: 'receipt',
      [DocumentType.SOW]: 'assignment',
      [DocumentType.LETTER]: 'mail',
      [DocumentType.FORM]: 'dynamic_form',
      [DocumentType.REPORT]: 'assessment',
      [DocumentType.POLICY]: 'policy',
      [DocumentType.AGREEMENT]: 'handshake',
      [DocumentType.PLAN]: 'event_note',
      [DocumentType.CHECKLIST]: 'checklist',
      [DocumentType.MEMO]: 'sticky_note_2',
      [DocumentType.CERTIFICATE]: 'workspace_premium',
      [DocumentType.RECEIPT]: 'receipt_long',
      [DocumentType.BRIEF]: 'summarize',
      [DocumentType.MANUAL]: 'menu_book',
      [DocumentType.GUIDE]: 'auto_stories',
      [DocumentType.TEMPLATE]: 'article',
      [DocumentType.RECORD]: 'folder_open',
      [DocumentType.LOG]: 'history',
    };
    return icons[type] || 'article';
  }

  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      sales: 'Sales',
      legal: 'Legal',
      freelance: 'Freelance',
      consulting: 'Consulting',
      general: 'General',
      business: 'Business',
      hr: 'HR & Employment',
      finance: 'Finance & Accounting',
      project: 'Project Management',
      realestate: 'Real Estate',
      healthcare: 'Healthcare & Medical',
      education: 'Education',
      technical: 'Technical',
      events: 'Event Planning',
      nonprofit: 'Non-Profit & Grants',
      personal: 'Personal',
      manufacturing: 'Manufacturing & Operations',
      compliance: 'Compliance & Governance',
      construction: 'Construction & Engineering',
      hospitality: 'Hospitality & Restaurant',
      automotive: 'Automotive',
      agriculture: 'Agriculture',
      ecommerce: 'E-Commerce',
      media: 'Media & Entertainment',
      insurance: 'Insurance',
      government: 'Government & Public Sector',
      telecom: 'Telecommunications',
      utilities: 'Utilities & Energy',
      sports: 'Sports & Fitness',
      childcare: 'Childcare & Family',
      veterinary: 'Veterinary & Pet Services',
      beauty: 'Beauty & Wellness',
      religious: 'Religious & Faith-Based',
      creative: 'Creative & Design',
    };
    return names[category] || category;
  }
}
