import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSignatureDto, UpdateSignatureDto, SignatureType } from './dto';

export interface UserSignature {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  signatureType: string;
  signatureData: string;
  typedName: string | null;
  fontFamily: string | null;
  isDefault: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SignaturesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new signature
   */
  async create(
    workspaceId: string,
    dto: CreateSignatureDto,
    userId: string,
  ): Promise<UserSignature> {
    const now = new Date().toISOString();

    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.unsetDefaultSignatures(workspaceId, userId);
    }

    const data = {
      workspace_id: workspaceId,
      user_id: userId,
      name: dto.name,
      signature_type: dto.signatureType,
      signature_data: dto.signatureData,
      typed_name: dto.typedName || null,
      font_family: dto.fontFamily || null,
      is_default: dto.isDefault || false,
      is_deleted: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };

    const result = await this.db.insert('user_signatures', data);
    const insertedSignature = result?.data?.[0] || result?.data || result;

    return this.mapToResponse(insertedSignature);
  }

  /**
   * Get all signatures for a user
   */
  async findAll(
    workspaceId: string,
    userId: string,
    includeDeleted = false,
  ): Promise<UserSignature[]> {
    let query = this.db
      .table('user_signatures')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId);

    if (!includeDeleted) {
      query = query.where('is_deleted', '=', false);
    }

    query = query.orderBy('is_default', 'DESC').orderBy('created_at', 'DESC');

    const result = await query.execute();
    const signatures = (result?.data || result || []) as any[];

    return signatures.map((s: any) => this.mapToResponse(s));
  }

  /**
   * Get a signature by ID
   */
  async findOne(workspaceId: string, signatureId: string, userId: string): Promise<UserSignature> {
    const result = await this.db
      .table('user_signatures')
      .select('*')
      .where('id', '=', signatureId)
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_deleted', '=', false)
      .execute();

    const signatures = (result?.data || result || []) as any[];
    if (signatures.length === 0) {
      throw new NotFoundException('Signature not found');
    }

    return this.mapToResponse(signatures[0]);
  }

  /**
   * Get default signature for a user
   */
  async findDefault(workspaceId: string, userId: string): Promise<UserSignature | null> {
    const result = await this.db
      .table('user_signatures')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_default', '=', true)
      .where('is_deleted', '=', false)
      .execute();

    const signatures = (result?.data || result || []) as any[];
    if (signatures.length === 0) {
      return null;
    }

    return this.mapToResponse(signatures[0]);
  }

  /**
   * Update a signature
   */
  async update(
    workspaceId: string,
    signatureId: string,
    dto: UpdateSignatureDto,
    userId: string,
  ): Promise<UserSignature> {
    // Verify ownership
    await this.findOne(workspaceId, signatureId, userId);

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.isDefault !== undefined) {
      if (dto.isDefault) {
        // Unset other defaults first
        await this.unsetDefaultSignatures(workspaceId, userId);
      }
      updateData.is_default = dto.isDefault;
    }

    await this.db.update('user_signatures', signatureId, updateData);

    return this.findOne(workspaceId, signatureId, userId);
  }

  /**
   * Set a signature as default
   */
  async setDefault(
    workspaceId: string,
    signatureId: string,
    userId: string,
  ): Promise<UserSignature> {
    // Verify ownership
    await this.findOne(workspaceId, signatureId, userId);

    // Unset other defaults
    await this.unsetDefaultSignatures(workspaceId, userId);

    // Set this as default
    await this.db.update('user_signatures', signatureId, {
      is_default: true,
      updated_at: new Date().toISOString(),
    });

    return this.findOne(workspaceId, signatureId, userId);
  }

  /**
   * Delete a signature (soft delete)
   */
  async delete(workspaceId: string, signatureId: string, userId: string): Promise<void> {
    // Verify ownership
    const signature = await this.findOne(workspaceId, signatureId, userId);

    await this.db.update('user_signatures', signatureId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      is_default: false, // Remove default status when deleting
    });
  }

  /**
   * Unset all default signatures for a user
   */
  private async unsetDefaultSignatures(workspaceId: string, userId: string): Promise<void> {
    const result = await this.db
      .table('user_signatures')
      .select('id')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_default', '=', true)
      .execute();

    const signatures = (result?.data || result || []) as any[];

    for (const sig of signatures) {
      await this.db.update('user_signatures', sig.id, {
        is_default: false,
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Map database row to response format
   */
  private mapToResponse(row: any): UserSignature {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      name: row.name,
      signatureType: row.signature_type,
      signatureData: row.signature_data,
      typedName: row.typed_name,
      fontFamily: row.font_family,
      isDefault: row.is_default,
      isDeleted: row.is_deleted,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
