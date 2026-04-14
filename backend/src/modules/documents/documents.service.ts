import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DocumentTemplatesService } from '../templates/document-templates.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddRecipientDto,
  UpdateRecipientDto,
  SignDocumentDto,
  DeclineDocumentDto,
  SendDocumentDto,
  DocumentQueryDto,
  DocumentStatus,
  DocumentType,
  RecipientRole,
  RecipientStatus,
} from './dto';
import { randomBytes } from 'crypto';

export interface Document {
  id: string;
  workspaceId: string;
  templateId: string | null;
  documentNumber: string;
  title: string;
  description: string | null;
  documentType: string;
  content: Record<string, any>;
  contentHtml: string | null;
  placeholderValues: Record<string, any>;
  status: string;
  version: number;
  expiresAt: string | null;
  signedAt: string | null;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecipient {
  id: string;
  documentId: string;
  userId: string | null;
  email: string;
  name: string;
  role: string;
  order: number;
  status: string;
  accessToken: string;
  message: string | null;
  viewedAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface DocumentSignature {
  id: string;
  documentId: string;
  recipientId: string;
  signatureFieldId: string;
  signatureType: string;
  signatureData: string;
  typedName: string | null;
  fontFamily: string | null;
  ipAddress: string | null;
  signedAt: string;
  createdAt: string;
}

export interface DocumentActivityLog {
  id: string;
  documentId: string;
  userId: string | null;
  recipientId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private documentTemplatesService: DocumentTemplatesService,
  ) {}

  /**
   * Ensure the documents and related tables exist
   * Since database doesn't support programmatic table creation via API,
   * we check if the tables exist by querying them.
   */
  async ensureTablesExist(): Promise<boolean> {
    const tables = [
      'documents',
      'document_recipients',
      'document_signatures',
      'document_activity_logs',
    ];
    let allExist = true;

    for (const tableName of tables) {
      try {
        await this.db.table(tableName).select('id').limit(1).execute();
        console.log(`✅ ${tableName} table exists`);
      } catch (error: any) {
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.error(`❌ ${tableName} table does not exist.`);
          allExist = false;
        } else {
          console.error(`Note: Error checking ${tableName} table:`, error.message);
          allExist = false;
        }
      }
    }

    if (!allExist) {
      console.log('Please create the missing tables by running migrations.');
      console.log('The table schemas are defined in: backend/src/database/schema.ts');
    }

    return allExist;
  }

  /**
   * Generate a unique document number
   */
  private async generateDocumentNumber(workspaceId: string, documentType: string): Promise<string> {
    const prefix = this.getDocumentTypePrefix(documentType);
    const year = new Date().getFullYear();

    // Get the highest document number for this workspace/type/year to avoid duplicates
    const pattern = `${prefix}-${year}-%`;

    const result = await this.db
      .table('documents')
      .select('document_number')
      .where('workspace_id', '=', workspaceId)
      .where('document_type', '=', documentType)
      .where('document_number', 'LIKE', pattern)
      .orderBy('document_number', 'DESC')
      .limit(1)
      .execute();

    let nextNumber = 1;

    if (result.data && result.data.length > 0) {
      const lastDocNumber = result.data[0].document_number;
      // Extract number from format: PREFIX-YEAR-####
      const match = lastDocNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const number = String(nextNumber).padStart(4, '0');
    return `${prefix}-${year}-${number}`;
  }

  private getDocumentTypePrefix(type: string): string {
    const prefixes: Record<string, string> = {
      proposal: 'PROP',
      contract: 'CONT',
      invoice: 'INV',
      sow: 'SOW',
    };
    return prefixes[type] || 'DOC';
  }

  /**
   * Get all documents with pagination and filtering
   * Documents are user-specific - users can only see their own documents
   */
  async findAll(
    workspaceId: string,
    userId: string,
    query: DocumentQueryDto,
  ): Promise<{
    documents: Document[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const result = await this.db
      .table('documents')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('created_by', '=', userId)
      .where('is_deleted', '=', false)
      .execute();

    let documents = Array.isArray(result.data) ? result.data : [];

    // Apply filters
    if (query.documentType) {
      documents = documents.filter((d) => d.document_type === query.documentType);
    }

    if (query.status) {
      documents = documents.filter((d) => d.status === query.status);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      documents = documents.filter(
        (d) =>
          d.title.toLowerCase().includes(searchLower) ||
          d.document_number.toLowerCase().includes(searchLower) ||
          (d.description && d.description.toLowerCase().includes(searchLower)),
      );
    }

    // Sort by created_at descending
    documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = documents.length;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    const paginatedDocuments = documents.slice(startIndex, startIndex + limit);

    return {
      documents: paginatedDocuments.map((d) => this.mapDocumentToResponse(d)),
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
   * Get document statistics
   */
  async getStats(
    workspaceId: string,
    userId: string,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const result = await this.db
      .table('documents')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('created_by', '=', userId)
      .where('is_deleted', '=', false)
      .execute();

    const documents = Array.isArray(result.data) ? result.data : [];

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    documents.forEach((d) => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      byType[d.document_type] = (byType[d.document_type] || 0) + 1;
    });

    return {
      total: documents.length,
      byStatus,
      byType,
    };
  }

  /**
   * Get a single document by ID
   */
  async findOne(workspaceId: string, documentId: string, userId?: string): Promise<Document> {
    const query = this.db
      .table('documents')
      .select('*')
      .where('id', '=', documentId)
      .where('workspace_id', '=', workspaceId)
      .where('is_deleted', '=', false);

    // If userId provided, ensure user owns the document or is a recipient
    if (userId) {
      query.where('created_by', '=', userId);
    }

    const result = await query.execute();

    const documents = Array.isArray(result.data) ? result.data : [];
    if (documents.length === 0) {
      // If userId was provided and no doc found, check if user is a recipient
      if (userId) {
        const recipientCheck = await this.db
          .table('documents')
          .select('*')
          .where('id', '=', documentId)
          .where('workspace_id', '=', workspaceId)
          .where('is_deleted', '=', false)
          .execute();

        if (recipientCheck.data && recipientCheck.data.length > 0) {
          const recipients = await this.getRecipients(documentId);
          const isRecipient = recipients.some(
            (r) => r.userId === userId || r.email?.toLowerCase() === userId.toLowerCase(),
          );
          if (isRecipient) {
            return this.mapDocumentToResponse(recipientCheck.data[0]);
          }
        }
      }
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    return this.mapDocumentToResponse(documents[0]);
  }

  /**
   * Get document with all related data
   */
  async findOneWithDetails(
    workspaceId: string,
    documentId: string,
    userId?: string,
  ): Promise<{
    document: Document;
    recipients: DocumentRecipient[];
    signatures: DocumentSignature[];
  }> {
    const document = await this.findOne(workspaceId, documentId, userId);
    const recipients = await this.getRecipients(documentId);
    const signatures = await this.getSignatures(documentId);

    return {
      document,
      recipients,
      signatures,
    };
  }

  /**
   * Create a new document
   */
  async create(workspaceId: string, dto: CreateDocumentDto, userId: string): Promise<Document> {
    let content = dto.content;
    let placeholders: any[] = [];

    // If creating from template, get template content
    if (dto.templateId) {
      const template = await this.documentTemplatesService.findOne(workspaceId, dto.templateId);
      content = content || template.content;
      placeholders = template.placeholders;

      // Increment template usage count
      await this.documentTemplatesService.incrementUsageCount(dto.templateId);
    }

    // Generate unique document number with retry logic
    let documentNumber: string;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      documentNumber = await this.generateDocumentNumber(workspaceId, dto.documentType);

      // Add random suffix if retry (prevents collision)
      if (retries > 0) {
        const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        documentNumber = `${documentNumber}-${randomSuffix}`;
      }

      // Check if this number already exists
      const existing = await this.db
        .table('documents')
        .select('id')
        .where('document_number', '=', documentNumber)
        .limit(1)
        .execute();

      if (!existing.data || existing.data.length === 0) {
        // Number is unique, proceed
        break;
      }

      retries++;
      this.logger.warn(
        `Document number ${documentNumber} already exists, retrying... (${retries}/${maxRetries})`,
      );
    }

    if (retries >= maxRetries) {
      throw new Error('Failed to generate unique document number after multiple retries');
    }

    const now = new Date().toISOString();
    const data = {
      workspace_id: workspaceId,
      template_id: dto.templateId || null,
      document_number: documentNumber,
      title: dto.title,
      description: dto.description || null,
      document_type: dto.documentType,
      content: content,
      content_html: dto.contentHtml || null,
      placeholder_values: dto.placeholderValues || {},
      status: DocumentStatus.DRAFT,
      version: 1,
      expires_at: dto.expiresAt || null,
      signed_at: null,
      settings: dto.settings || {},
      metadata: dto.metadata || {},
      created_by: userId,
      updated_by: null,
      created_at: now,
      updated_at: now,
    };

    const result = await this.db.insert('documents', data);

    // Handle both wrapped and unwrapped response formats
    const insertedDoc = result?.data?.[0] || result?.data || result;

    // Log activity
    await this.logActivity(insertedDoc.id, userId, null, 'created', 'Document created');

    return this.mapDocumentToResponse(insertedDoc);
  }

  /**
   * Update a document
   */
  async update(
    workspaceId: string,
    documentId: string,
    dto: UpdateDocumentDto,
    userId: string,
  ): Promise<Document> {
    // Verify user owns this document
    const document = await this.findOne(workspaceId, documentId, userId);

    // Can only update drafts
    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Can only update documents in draft status');
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.contentHtml !== undefined) updateData.content_html = dto.contentHtml;
    if (dto.placeholderValues !== undefined) updateData.placeholder_values = dto.placeholderValues;
    if (dto.expiresAt !== undefined) updateData.expires_at = dto.expiresAt;
    if (dto.settings !== undefined) updateData.settings = dto.settings;
    if (dto.metadata !== undefined) updateData.metadata = dto.metadata;

    await this.db.update('documents', documentId, updateData);

    // Log activity
    await this.logActivity(documentId, userId, null, 'updated', 'Document updated');

    return this.findOne(workspaceId, documentId);
  }

  /**
   * Delete a document (soft delete)
   */
  async delete(workspaceId: string, documentId: string, userId: string): Promise<void> {
    // Verify user owns this document
    await this.findOne(workspaceId, documentId, userId);

    await this.db.update('documents', documentId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    });

    // Log activity
    await this.logActivity(documentId, userId, null, 'deleted', 'Document deleted');
  }

  /**
   * Get HTML preview of document
   */
  async getPreview(workspaceId: string, documentId: string, userId?: string): Promise<string> {
    const document = await this.findOne(workspaceId, documentId, userId);

    if (document.contentHtml) {
      return this.wrapInHtmlTemplate(document.contentHtml, document.title);
    }

    // Convert Quill Delta to HTML (simplified version)
    const html = this.deltaToHtml(document.content, document.placeholderValues);
    return this.wrapInHtmlTemplate(html, document.title);
  }

  /**
   * Convert Quill Delta to HTML
   */
  private deltaToHtml(
    content: Record<string, any>,
    placeholderValues: Record<string, any>,
  ): string {
    if (!content || !content.ops) return '';

    let html = '';
    const ops = content.ops;

    for (const op of ops) {
      if (typeof op.insert === 'string') {
        let text = op.insert;

        // Replace placeholders
        text = text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return placeholderValues[key] || match;
        });

        // Apply attributes
        if (op.attributes) {
          if (op.attributes.header) {
            const level = op.attributes.header;
            text = `<h${level}>${text.trim()}</h${level}>`;
          } else {
            if (op.attributes.bold) text = `<strong>${text}</strong>`;
            if (op.attributes.italic) text = `<em>${text}</em>`;
            if (op.attributes.underline) text = `<u>${text}</u>`;
          }
        }

        // Convert newlines to paragraphs
        if (text.includes('\n')) {
          text = text
            .split('\n')
            .map((line) => (line ? `<p>${line}</p>` : '<br/>'))
            .join('');
        }

        html += text;
      }
    }

    return html;
  }

  /**
   * Wrap content in HTML template
   */
  private wrapInHtmlTemplate(content: string, title: string): string {
    // Check if content already has position: relative wrapper (from signature embedding)
    const hasPositionedContent = content.includes('position: relative');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      min-height: 1200px;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      position: relative;
    }
    .document-content {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; margin-bottom: 20px; }
    h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
    p { margin-bottom: 12px; }
    .signature-field {
      border-bottom: 2px solid #333;
      min-width: 200px;
      display: inline-block;
      margin: 20px 0;
    }
    .embedded-signature {
      position: absolute;
      z-index: 1000;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  ${hasPositionedContent ? content : `<div class="document-content">${content}</div>`}
</body>
</html>
    `.trim();
  }

  // ==================== RECIPIENTS ====================

  /**
   * Get recipients for a document
   */
  async getRecipients(documentId: string): Promise<DocumentRecipient[]> {
    const result = await this.db
      .table('document_recipients')
      .select('*')
      .where('document_id', '=', documentId)
      .execute();

    const recipients = Array.isArray(result.data) ? result.data : [];
    return recipients.sort((a, b) => a.order - b.order).map((r) => this.mapRecipientToResponse(r));
  }

  /**
   * Add a recipient to a document
   */
  async addRecipient(
    workspaceId: string,
    documentId: string,
    dto: AddRecipientDto,
    userId: string,
  ): Promise<DocumentRecipient> {
    const document = await this.findOne(workspaceId, documentId);

    // Can only add recipients to drafts
    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Can only add recipients to documents in draft status');
    }

    // Check for duplicate email
    const existingRecipients = await this.getRecipients(documentId);
    const exists = existingRecipients.find(
      (r) => r.email.toLowerCase() === dto.email.toLowerCase(),
    );
    if (exists) {
      throw new BadRequestException(`Recipient with email ${dto.email} already exists`);
    }

    // Generate access token
    const accessToken = randomBytes(32).toString('hex');

    const now = new Date().toISOString();
    const data = {
      document_id: documentId,
      user_id: null, // Can be linked later if user exists
      email: dto.email,
      name: dto.name,
      role: dto.role || RecipientRole.SIGNER,
      signing_order: dto.order || existingRecipients.length,
      status: RecipientStatus.PENDING,
      access_token: accessToken,
      message: dto.message || null,
      access_code: dto.accessCode || null,
      viewed_at: null,
      signed_at: null,
      declined_at: null,
      decline_reason: null,
      ip_address: null,
      created_at: now,
    };

    const result = await this.db.insert('document_recipients', data);

    // Log activity
    await this.logActivity(
      documentId,
      userId,
      null,
      'recipient_added',
      `Recipient added: ${dto.name} (${dto.email})`,
    );

    return this.mapRecipientToResponse(result.data);
  }

  /**
   * Update a recipient
   */
  async updateRecipient(
    workspaceId: string,
    documentId: string,
    recipientId: string,
    dto: UpdateRecipientDto,
    userId: string,
  ): Promise<DocumentRecipient> {
    const document = await this.findOne(workspaceId, documentId);

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Can only update recipients for documents in draft status');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.order !== undefined) updateData.signing_order = dto.order;
    if (dto.message !== undefined) updateData.message = dto.message;

    await this.db.update('document_recipients', recipientId, updateData);

    const result = await this.db
      .table('document_recipients')
      .select('*')
      .where('id', '=', recipientId)
      .execute();

    return this.mapRecipientToResponse(result.data[0]);
  }

  /**
   * Remove a recipient
   */
  async removeRecipient(
    workspaceId: string,
    documentId: string,
    recipientId: string,
    userId: string,
  ): Promise<void> {
    const document = await this.findOne(workspaceId, documentId);

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Can only remove recipients from documents in draft status');
    }

    await this.db.delete('document_recipients', recipientId);

    // Log activity
    await this.logActivity(documentId, userId, null, 'recipient_removed', 'Recipient removed');
  }

  // ==================== SIGNATURES ====================

  /**
   * Get signatures for a document
   */
  async getSignatures(documentId: string): Promise<DocumentSignature[]> {
    const result = await this.db
      .table('document_signatures')
      .select('*')
      .where('document_id', '=', documentId)
      .execute();

    const signatures = Array.isArray(result.data) ? result.data : [];
    return signatures.map((s) => this.mapSignatureToResponse(s));
  }

  /**
   * Submit a signature (used by recipients via external endpoint)
   */
  async submitSignature(
    recipientId: string,
    dto: SignDocumentDto,
    ipAddress?: string,
  ): Promise<DocumentSignature> {
    // Get recipient
    const recipientResult = await this.db
      .table('document_recipients')
      .select('*')
      .where('id', '=', recipientId)
      .execute();

    if (!recipientResult.data || recipientResult.data.length === 0) {
      throw new NotFoundException('Recipient not found');
    }

    const recipient = recipientResult.data[0];
    const documentId = recipient.document_id;

    // Check document status
    const docResult = await this.db
      .table('documents')
      .select('*')
      .where('id', '=', documentId)
      .execute();

    if (!docResult.data || docResult.data.length === 0) {
      throw new NotFoundException('Document not found');
    }

    const document = docResult.data[0];
    if (
      document.status !== DocumentStatus.PENDING_SIGNATURE &&
      document.status !== DocumentStatus.PARTIALLY_SIGNED
    ) {
      throw new BadRequestException('Document is not available for signing');
    }

    // Check if recipient can sign
    if (recipient.status === RecipientStatus.SIGNED) {
      throw new BadRequestException('You have already signed this document');
    }

    if (recipient.status === RecipientStatus.DECLINED) {
      throw new BadRequestException('You have declined this document');
    }

    // Create signature
    const now = new Date().toISOString();
    const signatureData = {
      document_id: documentId,
      recipient_id: recipientId,
      signature_field_id: dto.signatureFieldId,
      signature_type: dto.signatureType,
      signature_data: dto.signatureData,
      typed_name: dto.typedName || null,
      font_family: dto.fontFamily || null,
      ip_address: ipAddress || null,
      signed_at: now,
      created_at: now,
    };

    const signatureResult = await this.db.insert('document_signatures', signatureData);

    // Update recipient status
    await this.db.update('document_recipients', recipientId, {
      status: RecipientStatus.SIGNED,
      signed_at: now,
      ip_address: ipAddress,
    });

    // Check if all signers have signed
    await this.updateDocumentSignatureStatus(documentId);

    // Log activity
    await this.logActivity(
      documentId,
      null,
      recipientId,
      'signed',
      `Document signed by ${recipient.name}`,
      ipAddress,
    );

    return this.mapSignatureToResponse(signatureResult.data);
  }

  /**
   * Decline to sign a document
   */
  async declineDocument(
    recipientId: string,
    dto: DeclineDocumentDto,
    ipAddress?: string,
  ): Promise<void> {
    // Get recipient
    const recipientResult = await this.db
      .table('document_recipients')
      .select('*')
      .where('id', '=', recipientId)
      .execute();

    if (!recipientResult.data || recipientResult.data.length === 0) {
      throw new NotFoundException('Recipient not found');
    }

    const recipient = recipientResult.data[0];
    const documentId = recipient.document_id;

    const now = new Date().toISOString();

    // Update recipient
    await this.db.update('document_recipients', recipientId, {
      status: RecipientStatus.DECLINED,
      declined_at: now,
      decline_reason: dto.reason,
      ip_address: ipAddress,
    });

    // Update document status
    await this.db.update('documents', documentId, {
      status: DocumentStatus.DECLINED,
      updated_at: now,
    });

    // Log activity
    await this.logActivity(
      documentId,
      null,
      recipientId,
      'declined',
      `Document declined by ${recipient.name}: ${dto.reason}`,
      ipAddress,
    );
  }

  /**
   * Update document status based on signatures
   */
  private async updateDocumentSignatureStatus(documentId: string): Promise<void> {
    const recipients = await this.getRecipients(documentId);
    const signers = recipients.filter((r) => r.role === RecipientRole.SIGNER);
    const signedCount = signers.filter((r) => r.status === RecipientStatus.SIGNED).length;

    let newStatus: string;
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (signedCount === 0) {
      newStatus = DocumentStatus.PENDING_SIGNATURE;
    } else if (signedCount < signers.length) {
      newStatus = DocumentStatus.PARTIALLY_SIGNED;
    } else {
      newStatus = DocumentStatus.SIGNED;
      updateData.signed_at = new Date().toISOString();
    }

    updateData.status = newStatus;
    await this.db.update('documents', documentId, updateData);
  }

  // ==================== EMBED SIGNATURE ====================

  /**
   * Embed signature into document at specified position
   * This is the simplified approach - embeds signature directly into contentHtml
   */
  async embedSignatureInDocument(
    workspaceId: string,
    documentId: string,
    signatureId: string,
    position: {
      xPercent: number;
      yPercent: number;
      scale: number;
      topPx?: number;
      documentHeight?: number;
    },
    userId: string,
    ipAddress?: string,
  ): Promise<Document> {
    // Get the document
    const document = await this.findOne(workspaceId, documentId, userId);

    // Get the user's signature
    const signatureResult = await this.db
      .table('user_signatures')
      .select('*')
      .where('id', '=', signatureId)
      .where('user_id', '=', userId)
      .where('is_deleted', '=', false)
      .execute();

    const signatures = (signatureResult?.data || signatureResult || []) as any[];
    if (signatures.length === 0) {
      throw new NotFoundException('Signature not found');
    }

    const signature = signatures[0];

    // Get the current HTML content
    let contentHtml = document.contentHtml || '';

    // If no HTML content, generate from content
    if (!contentHtml && document.content) {
      contentHtml = this.deltaToHtml(document.content, document.placeholderValues);
    }

    // Calculate position styles
    // Use the actual document height if provided, otherwise use a default reference
    const documentHeight = position.documentHeight || 1200;
    const leftPercent = Math.round(position.xPercent * 100);
    // Use topPx if provided directly, otherwise calculate from percentage
    const topPx = position.topPx ?? Math.round(position.yPercent * documentHeight);
    const scale = position.scale || 1;

    // Build signature HTML based on type
    // Use pixel positioning for top (more reliable than percentage)
    let signatureHtml: string;
    const signedAt = new Date();
    const signedAtFormatted = signedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (signature.signature_type === 'typed') {
      // Typed signature
      signatureHtml = `
        <div class="embedded-signature" style="
          position: absolute;
          left: ${leftPercent}%;
          top: ${topPx}px;
          transform: scale(${scale});
          transform-origin: top left;
          z-index: 1000;
          background: rgba(255,255,255,0.9);
          padding: 8px 12px;
          border-radius: 4px;
        ">
          <div style="font-family: ${signature.font_family || 'cursive'}; font-size: 28px; color: #1a1a1a;">
            ${signature.typed_name || signature.name}
          </div>
          <div style="font-size: 10px; color: #666; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 4px;">
            Digitally signed by ${signature.name}<br/>
            ${signedAtFormatted}
          </div>
        </div>
      `;
    } else {
      // Drawn or uploaded signature (image)
      signatureHtml = `
        <div class="embedded-signature" style="
          position: absolute;
          left: ${leftPercent}%;
          top: ${topPx}px;
          transform: scale(${scale});
          transform-origin: top left;
          z-index: 1000;
          background: rgba(255,255,255,0.9);
          padding: 8px 12px;
          border-radius: 4px;
        ">
          <img src="${signature.signature_data}" alt="Signature" style="max-height: 60px; max-width: 200px;" />
          <div style="font-size: 10px; color: #666; margin-top: 4px; border-top: 1px solid #ddd; padding-top: 4px;">
            Digitally signed by ${signature.name}<br/>
            ${signedAtFormatted}
          </div>
        </div>
      `;
    }

    // Embed signature into HTML
    // Simply append the signature HTML to the content
    // The wrapInHtmlTemplate will handle positioning context
    let updatedHtml = contentHtml;

    // Check if there's already a signature embedded (prevent duplicates)
    if (updatedHtml.includes('class="embedded-signature"')) {
      // Remove old signature before adding new one
      updatedHtml = updatedHtml.replace(
        /<div class="embedded-signature"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g,
        '',
      );
    }

    // Append signature at the end - it will be absolutely positioned
    updatedHtml = `${updatedHtml}${signatureHtml}`;

    // Update document metadata with signing info
    const updatedMetadata = {
      ...document.metadata,
      signatureInfo: {
        signedBy: userId,
        signedAt: signedAt.toISOString(),
        signatureName: signature.name,
        signatureType: signature.signature_type,
        position: position,
        ipAddress: ipAddress || null,
      },
    };

    // Update the document
    const now = new Date().toISOString();
    await this.db.update('documents', documentId, {
      content_html: updatedHtml,
      metadata: updatedMetadata,
      signed_at: now,
      status: DocumentStatus.SIGNED,
      updated_at: now,
      updated_by: userId,
    });

    // Log activity
    await this.logActivity(
      documentId,
      userId,
      null,
      'signed',
      `Document signed by ${signature.name}`,
      ipAddress,
      { signatureId, position },
    );

    return this.findOne(workspaceId, documentId);
  }

  // ==================== SEND DOCUMENT ====================

  /**
   * Send document for signatures
   */
  async sendForSignature(
    workspaceId: string,
    documentId: string,
    dto: SendDocumentDto,
    userId: string,
  ): Promise<Document> {
    const document = await this.findOne(workspaceId, documentId);

    if (document.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Can only send documents in draft status');
    }

    const recipients = await this.getRecipients(documentId);
    const signers = recipients.filter((r) => r.role === RecipientRole.SIGNER);

    if (signers.length === 0) {
      throw new BadRequestException('Add at least one signer before sending');
    }

    // Update document status
    await this.db.update('documents', documentId, {
      status: DocumentStatus.PENDING_SIGNATURE,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });

    // TODO: Send email notifications to recipients
    // This would integrate with the email service

    // Log activity
    await this.logActivity(documentId, userId, null, 'sent', 'Document sent for signatures');

    return this.findOne(workspaceId, documentId);
  }

  // ==================== ACTIVITY LOG ====================

  /**
   * Log activity for a document
   */
  private async logActivity(
    documentId: string,
    userId: string | null,
    recipientId: string | null,
    action: string,
    details?: string,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.db.insert('document_activity_logs', {
      document_id: documentId,
      user_id: userId,
      recipient_id: recipientId,
      action,
      details: details || null,
      ip_address: ipAddress || null,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get activity log for a document
   */
  async getActivityLog(workspaceId: string, documentId: string): Promise<DocumentActivityLog[]> {
    // Verify document belongs to workspace
    await this.findOne(workspaceId, documentId);

    const result = await this.db
      .table('document_activity_logs')
      .select('*')
      .where('document_id', '=', documentId)
      .execute();

    const logs = Array.isArray(result.data) ? result.data : [];
    return logs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((log) => this.mapActivityLogToResponse(log));
  }

  // ==================== EXTERNAL ACCESS ====================

  /**
   * Get document by access token (for external recipients)
   */
  async getDocumentByAccessToken(accessToken: string): Promise<{
    document: Document;
    recipient: DocumentRecipient;
  }> {
    const recipientResult = await this.db
      .table('document_recipients')
      .select('*')
      .where('access_token', '=', accessToken)
      .execute();

    if (!recipientResult.data || recipientResult.data.length === 0) {
      throw new NotFoundException('Invalid access token');
    }

    const recipient = recipientResult.data[0];
    const documentId = recipient.document_id;

    const docResult = await this.db
      .table('documents')
      .select('*')
      .where('id', '=', documentId)
      .where('is_deleted', '=', false)
      .execute();

    if (!docResult.data || docResult.data.length === 0) {
      throw new NotFoundException('Document not found');
    }

    const document = docResult.data[0];

    // Check expiration
    if (document.expires_at && new Date(document.expires_at) < new Date()) {
      throw new BadRequestException('This document has expired');
    }

    // Mark as viewed if not already
    if (!recipient.viewed_at) {
      await this.db.update('document_recipients', recipient.id, {
        status: RecipientStatus.VIEWED,
        viewed_at: new Date().toISOString(),
      });

      await this.logActivity(
        documentId,
        null,
        recipient.id,
        'viewed',
        `Document viewed by ${recipient.name}`,
      );
    }

    return {
      document: this.mapDocumentToResponse(document),
      recipient: this.mapRecipientToResponse({
        ...recipient,
        viewed_at: recipient.viewed_at || new Date().toISOString(),
        status: recipient.viewed_at ? recipient.status : RecipientStatus.VIEWED,
      }),
    };
  }

  /**
   * Get recipient by access token
   */
  async getRecipientByAccessToken(accessToken: string): Promise<DocumentRecipient> {
    const result = await this.db
      .table('document_recipients')
      .select('*')
      .where('access_token', '=', accessToken)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new NotFoundException('Invalid access token');
    }

    return this.mapRecipientToResponse(result.data[0]);
  }

  // ==================== MAPPERS ====================

  private mapDocumentToResponse(record: any): Document {
    return {
      id: record.id,
      workspaceId: record.workspace_id,
      templateId: record.template_id,
      documentNumber: record.document_number,
      title: record.title,
      description: record.description,
      documentType: record.document_type,
      content: record.content,
      contentHtml: record.content_html,
      placeholderValues: record.placeholder_values || {},
      status: record.status,
      version: record.version,
      expiresAt: record.expires_at,
      signedAt: record.signed_at,
      settings: record.settings || {},
      metadata: record.metadata || {},
      createdBy: record.created_by,
      updatedBy: record.updated_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private mapRecipientToResponse(record: any): DocumentRecipient {
    return {
      id: record.id,
      documentId: record.document_id,
      userId: record.user_id,
      email: record.email,
      name: record.name,
      role: record.role,
      order: record.signing_order ?? record.order ?? 0,
      status: record.status,
      accessToken: record.access_token,
      message: record.message,
      viewedAt: record.viewed_at,
      signedAt: record.signed_at,
      declinedAt: record.declined_at,
      declineReason: record.decline_reason,
      ipAddress: record.ip_address,
      createdAt: record.created_at,
    };
  }

  private mapSignatureToResponse(record: any): DocumentSignature {
    return {
      id: record.id,
      documentId: record.document_id,
      recipientId: record.recipient_id,
      signatureFieldId: record.signature_field_id,
      signatureType: record.signature_type,
      signatureData: record.signature_data,
      typedName: record.typed_name,
      fontFamily: record.font_family,
      ipAddress: record.ip_address,
      signedAt: record.signed_at,
      createdAt: record.created_at,
    };
  }

  private mapActivityLogToResponse(record: any): DocumentActivityLog {
    return {
      id: record.id,
      documentId: record.document_id,
      userId: record.user_id,
      recipientId: record.recipient_id,
      action: record.action,
      details: record.details,
      ipAddress: record.ip_address,
      metadata: record.metadata || {},
      createdAt: record.created_at,
    };
  }
}
