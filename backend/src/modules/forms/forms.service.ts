import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormCreateShareLinkDto } from './dto/form-share.dto';
import { FormStatus, FormTemplate, FormShareLink } from './entities/form.types';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { camelCase, snakeCase } from 'change-case';

@Injectable()
export class FormsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate a unique slug for a form
   */
  private async generateSlug(title: string, workspaceId?: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.db
        .table('form_templates')
        .select('id')
        .where('slug', '=', slug)
        .execute();

      if (!existing.data || existing.data.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Transform database row to camelCase
   */
  private transformFormToCamelCase(form: any): FormTemplate {
    return {
      id: form.id,
      workspaceId: form.workspace_id,
      title: form.title,
      description: form.description,
      slug: form.slug,
      fields: form.fields || [],
      pages: form.pages || [],
      settings: form.settings || {},
      branding: form.branding || {},
      status: form.status as FormStatus,
      publishedAt: form.published_at,
      closedAt: form.closed_at,
      viewCount: form.view_count,
      responseCount: form.response_count,
      isDeleted: form.is_deleted,
      deletedAt: form.deleted_at,
      deletedBy: form.deleted_by,
      createdBy: form.created_by,
      createdAt: form.created_at,
      updatedAt: form.updated_at,
    };
  }

  /**
   * Create a new form
   */
  async create(workspaceId: string, userId: string, dto: CreateFormDto): Promise<FormTemplate> {
    const slug = await this.generateSlug(dto.title, workspaceId);

    // Default pages if not provided
    const pages = dto.pages || [
      {
        id: 'page_1',
        title: 'Page 1',
        order: 1,
      },
    ];

    // Default settings if not provided
    const settings = dto.settings || {
      allowMultipleSubmissions: false,
      requireLogin: false,
      showProgressBar: true,
      shuffleQuestions: false,
      confirmationMessage: 'Thank you for your submission!',
      collectEmail: true,
      notifyOnSubmission: false,
    };

    const result = await this.db
      .table('form_templates')
      .insert({
        workspace_id: workspaceId,
        title: dto.title,
        description: dto.description || null,
        slug,
        fields: JSON.stringify(dto.fields),
        pages: JSON.stringify(pages),
        settings: JSON.stringify(settings),
        branding: JSON.stringify(dto.branding || {}),
        status: dto.status || FormStatus.DRAFT,
        created_by: userId,
      })
      .returning('*')
      .execute();

    return this.transformFormToCamelCase(result.data[0]);
  }

  /**
   * Get all forms in a workspace
   */
  async findAll(
    workspaceId: string,
    userId: string,
    status?: FormStatus,
  ): Promise<FormTemplate[]> {
    let query = this.db
      .table('form_templates')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('is_deleted', '=', false);

    if (status) {
      query = query.where('status', '=', status);
    }

    const results = await query
      .orderBy('created_at', 'DESC')
      .execute();

    return (results.data || []).map((form: any) => this.transformFormToCamelCase(form));
  }

  /**
   * Get a single form by ID
   */
  async findOne(formId: string, workspaceId: string, userId: string): Promise<FormTemplate> {
    const result = await this.db
      .table('form_templates')
      .select('*')
      .where('id', '=', formId)
      .where('workspace_id', '=', workspaceId)
      .where('is_deleted', '=', false)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Form not found');
    }

    return this.transformFormToCamelCase(result.data[0]);
  }

  /**
   * Get a form by slug (for public access)
   */
  async findBySlug(slug: string): Promise<FormTemplate> {
    const result = await this.db
      .table('form_templates')
      .select('*')
      .where('slug', '=', slug)
      .where('is_deleted', '=', false)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Form not found');
    }

    const form = this.transformFormToCamelCase(result.data[0]);

    // Check if form is published
    if (form.status !== FormStatus.PUBLISHED) {
      throw new ForbiddenException('Form is not published');
    }

    // Increment view count
    await this.db
      .table('form_templates')
      .update({
        view_count: form.viewCount + 1,
      })
      .where('id', '=', form.id)
      .execute();

    return form;
  }

  /**
   * Update a form
   */
  async update(
    formId: string,
    workspaceId: string,
    userId: string,
    dto: UpdateFormDto,
  ): Promise<FormTemplate> {
    // Check if form exists
    const existing = await this.findOne(formId, workspaceId, userId);

    // Don't allow updating published forms' structure
    if (existing.status === FormStatus.PUBLISHED && dto.fields) {
      throw new BadRequestException(
        'Cannot modify form structure after publishing. Please create a new version.',
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.fields !== undefined) updateData.fields = JSON.stringify(dto.fields);
    if (dto.pages !== undefined) updateData.pages = JSON.stringify(dto.pages);
    if (dto.settings !== undefined) updateData.settings = JSON.stringify(dto.settings);
    if (dto.branding !== undefined) updateData.branding = JSON.stringify(dto.branding);
    if (dto.status !== undefined) updateData.status = dto.status;

    const result = await this.db
      .table('form_templates')
      .update(updateData)
      .where('id', '=', formId)
      .where('workspace_id', '=', workspaceId)
      .returning('*')
      .execute();

    return this.transformFormToCamelCase(result.data[0]);
  }

  /**
   * Publish a form
   */
  async publish(formId: string, workspaceId: string, userId: string): Promise<FormTemplate> {
    const form = await this.findOne(formId, workspaceId, userId);

    if (form.status === FormStatus.PUBLISHED) {
      throw new BadRequestException('Form is already published');
    }

    if (form.fields.length === 0) {
      throw new BadRequestException('Cannot publish form with no fields');
    }

    const result = await this.db
      .table('form_templates')
      .update({
        status: FormStatus.PUBLISHED,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', formId)
      .where('workspace_id', '=', workspaceId)
      .returning('*')
      .execute();

    return this.transformFormToCamelCase(result.data[0]);
  }

  /**
   * Close a form
   */
  async close(formId: string, workspaceId: string, userId: string): Promise<FormTemplate> {
    const form = await this.findOne(formId, workspaceId, userId);

    if (form.status !== FormStatus.PUBLISHED) {
      throw new BadRequestException('Only published forms can be closed');
    }

    const result = await this.db
      .table('form_templates')
      .update({
        status: FormStatus.CLOSED,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', formId)
      .where('workspace_id', '=', workspaceId)
      .returning('*')
      .execute();

    return this.transformFormToCamelCase(result.data[0]);
  }

  /**
   * Delete a form (soft delete)
   */
  async remove(formId: string, workspaceId: string, userId: string): Promise<void> {
    await this.findOne(formId, workspaceId, userId);

    await this.db
      .table('form_templates')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .where('id', '=', formId)
      .where('workspace_id', '=', workspaceId)
      .execute();
  }

  /**
   * Duplicate a form
   */
  async duplicate(formId: string, workspaceId: string, userId: string): Promise<FormTemplate> {
    const original = await this.findOne(formId, workspaceId, userId);

    const slug = await this.generateSlug(`${original.title} (Copy)`, workspaceId);

    const result = await this.db
      .table('form_templates')
      .insert({
        workspace_id: workspaceId,
        title: `${original.title} (Copy)`,
        description: original.description,
        slug,
        fields: JSON.stringify(original.fields),
        pages: JSON.stringify(original.pages),
        settings: JSON.stringify(original.settings),
        branding: JSON.stringify(original.branding),
        status: FormStatus.DRAFT,
        created_by: userId,
      })
      .returning('*')
      .execute();

    return this.transformFormToCamelCase(result.data[0]);
  }

  /**
   * Create a share link
   */
  async createShareLink(
    formId: string,
    workspaceId: string,
    userId: string,
    dto: FormCreateShareLinkDto,
  ): Promise<FormShareLink> {
    // Verify form exists
    await this.findOne(formId, workspaceId, userId);

    const shareToken = randomBytes(32).toString('hex');
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    const result = await this.db
      .table('form_share_links')
      .insert({
        form_id: formId,
        share_token: shareToken,
        access_level: dto.accessLevel,
        require_password: dto.requirePassword || false,
        password_hash: passwordHash,
        expires_at: dto.expiresAt || null,
        max_responses: dto.maxResponses || null,
        created_by: userId,
      })
      .returning('*')
      .execute();

    const link = result.data[0];
    return {
      id: link.id,
      formId: link.form_id,
      shareToken: link.share_token,
      accessLevel: link.access_level,
      requirePassword: link.require_password,
      passwordHash: link.password_hash,
      expiresAt: link.expires_at,
      maxResponses: link.max_responses,
      responseCount: link.response_count,
      isActive: link.is_active,
      createdBy: link.created_by,
      createdAt: link.created_at,
    };
  }

  /**
   * Get all share links for a form
   */
  async getShareLinks(formId: string, workspaceId: string, userId: string): Promise<FormShareLink[]> {
    // Verify form exists
    await this.findOne(formId, workspaceId, userId);

    const results = await this.db
      .table('form_share_links')
      .select('*')
      .where('form_id', '=', formId)
      .where('is_active', '=', true)
      .orderBy('created_at', 'DESC')
      .execute();

    return (results.data || []).map((link: any) => ({
      id: link.id,
      formId: link.form_id,
      shareToken: link.share_token,
      accessLevel: link.access_level,
      requirePassword: link.require_password,
      passwordHash: link.password_hash,
      expiresAt: link.expires_at,
      maxResponses: link.max_responses,
      responseCount: link.response_count,
      isActive: link.is_active,
      createdBy: link.created_by,
      createdAt: link.created_at,
    }));
  }

  /**
   * Delete a share link
   */
  async deleteShareLink(shareId: string, workspaceId: string, userId: string): Promise<void> {
    const result = await this.db
      .table('form_share_links')
      .select('*')
      .where('id', '=', shareId)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    // Verify user owns the form
    const formId = result.data[0].form_id;
    await this.findOne(formId, workspaceId, userId);

    await this.db
      .table('form_share_links')
      .update({ is_active: false })
      .where('id', '=', shareId)
      .execute();
  }

  /**
   * Verify share link password
   */
  async verifySharePassword(shareToken: string, password: string): Promise<boolean> {
    const result = await this.db
      .table('form_share_links')
      .select('*')
      .where('share_token', '=', shareToken)
      .where('is_active', '=', true)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const link = result.data[0];

    if (!link.require_password) {
      return true;
    }

    if (!link.password_hash) {
      throw new BadRequestException('Password not set for this link');
    }

    return await bcrypt.compare(password, link.password_hash);
  }

  /**
   * Get form by share token
   */
  async findByShareToken(shareToken: string): Promise<FormTemplate> {
    const linkResult = await this.db
      .table('form_share_links')
      .select('*')
      .where('share_token', '=', shareToken)
      .where('is_active', '=', true)
      .execute();

    if (!linkResult.data || linkResult.data.length === 0) {
      throw new NotFoundException('Share link not found or expired');
    }

    const link = linkResult.data[0];

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      throw new ForbiddenException('Share link has expired');
    }

    // Check response limit
    if (link.max_responses && link.response_count >= link.max_responses) {
      throw new ForbiddenException('Maximum number of responses reached');
    }

    const formResult = await this.db
      .table('form_templates')
      .select('*')
      .where('id', '=', link.form_id)
      .where('is_deleted', '=', false)
      .execute();

    if (!formResult.data || formResult.data.length === 0) {
      throw new NotFoundException('Form not found');
    }

    const form = this.transformFormToCamelCase(formResult.data[0]);

    if (form.status !== FormStatus.PUBLISHED) {
      throw new ForbiddenException('Form is not published');
    }

    // Increment view count
    await this.db
      .table('form_templates')
      .update({
        view_count: form.viewCount + 1,
      })
      .where('id', '=', form.id)
      .execute();

    return form;
  }
}
