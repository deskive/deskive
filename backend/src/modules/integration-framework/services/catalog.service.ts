import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { snakeCase } from 'change-case';
import {
  IntegrationFiltersDto,
  CreateIntegrationDto,
  UpdateIntegrationDto,
  MarketplaceResponseDto,
  IntegrationCatalogResponseDto,
} from '../dto/catalog.dto';
import {
  IntegrationCatalogEntry,
  IntegrationCategory,
  AuthType,
  PricingType,
  WebhookConfig,
} from '../interfaces/integration-config.interface';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);
  private readonly tableName = 'integration_catalog';

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get marketplace integrations with filtering and pagination
   */
  async getMarketplace(filters: IntegrationFiltersDto): Promise<MarketplaceResponseDto> {
    const {
      search,
      category,
      authType,
      provider,
      featured,
      verified,
      pricingType,
      page = 1,
      limit = 20,
      sortBy = 'install_count',
      sortOrder = 'desc',
    } = filters;

    try {
      let query = this.db.table(this.tableName).select('*');

      // Apply filters
      query = query.where('is_active', '=', true);

      if (category) {
        query = query.where('category', '=', category);
      }

      if (authType) {
        query = query.where('auth_type', '=', authType);
      }

      if (provider) {
        query = query.where('provider', 'ILIKE', `%${provider}%`);
      }

      if (featured !== undefined) {
        query = query.where('is_featured', '=', featured);
      }

      if (verified !== undefined) {
        query = query.where('is_verified', '=', verified);
      }

      if (pricingType) {
        query = query.where('pricing_type', '=', pricingType);
      }

      if (search) {
        // Search in name using ILIKE (search in description would require OR which may not be supported)
        query = query.where('name', 'ILIKE', `%${search}%`);
      }

      // Get total count
      const countResult = await this.db
        .table(this.tableName)
        .select('id')
        .where('is_active', '=', true)
        .execute();
      const countArray = Array.isArray(countResult?.data) ? countResult.data : [];
      const total = countArray.length;

      // Apply sorting and pagination
      const sortColumn = this.toSnakeCase(sortBy);
      query = query.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');
      query = query.limit(limit).offset((page - 1) * limit);

      const results = await query.execute();
      const resultsArray = Array.isArray(results?.data) ? results.data : [];

      const integrations = resultsArray.map((row: Record<string, unknown>) =>
        this.transformToResponse(row),
      );

      return {
        integrations,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Failed to get marketplace integrations', error);
      throw error;
    }
  }

  /**
   * Get integration by slug
   */
  async getBySlug(slug: string): Promise<IntegrationCatalogResponseDto> {
    try {
      const result = await this.db
        .table(this.tableName)
        .select('*')
        .where('slug', '=', slug)
        .where('is_active', '=', true)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      if (resultArray.length === 0) {
        throw new NotFoundException(`Integration with slug '${slug}' not found`);
      }

      return this.transformToResponse(resultArray[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get integration by slug: ${slug}`, error);
      throw error;
    }
  }

  /**
   * Get integration by ID
   */
  async getById(id: string): Promise<IntegrationCatalogResponseDto> {
    try {
      const result = await this.db
        .table(this.tableName)
        .select('*')
        .where('id', '=', id)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      if (resultArray.length === 0) {
        throw new NotFoundException(`Integration with id '${id}' not found`);
      }

      return this.transformToResponse(resultArray[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get integration by id: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get full integration config (includes auth_config for internal use)
   */
  async getFullConfig(slug: string): Promise<IntegrationCatalogEntry> {
    try {
      const result = await this.db
        .table(this.tableName)
        .select('*')
        .where('slug', '=', slug)
        .where('is_active', '=', true)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      if (resultArray.length === 0) {
        throw new NotFoundException(`Integration with slug '${slug}' not found`);
      }

      return this.transformToEntity(resultArray[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get full config for: ${slug}`, error);
      throw error;
    }
  }

  /**
   * Create a new integration (admin only)
   */
  async create(dto: CreateIntegrationDto): Promise<IntegrationCatalogResponseDto> {
    try {
      // Check if slug already exists
      const existing = await this.db
        .table(this.tableName)
        .select('id')
        .where('slug', '=', dto.slug)
        .execute();

      const existingArray = Array.isArray(existing?.data) ? existing.data : [];

      if (existingArray.length > 0) {
        throw new ConflictException(`Integration with slug '${dto.slug}' already exists`);
      }

      const now = new Date().toISOString();
      const insertData = {
        slug: dto.slug,
        name: dto.name,
        description: dto.description || null,
        category: dto.category,
        provider: dto.provider || null,
        logo_url: dto.logoUrl || null,
        website: dto.website || null,
        documentation_url: dto.documentationUrl || null,
        auth_type: dto.authType,
        auth_config: dto.authConfig,
        api_base_url: dto.apiBaseUrl || null,
        api_config: dto.apiConfig || {},
        supports_webhooks: dto.supportsWebhooks || false,
        webhook_config: dto.webhookConfig || {},
        capabilities: dto.capabilities || [],
        features: dto.features || [],
        config_schema: dto.configSchema || {},
        screenshots: dto.screenshots || [],
        pricing_type: dto.pricingType || 'free',
        is_verified: dto.isVerified || false,
        is_featured: dto.isFeatured || false,
        is_active: true,
        install_count: 0,
        review_count: 0,
        created_at: now,
        updated_at: now,
      };

      const result = await this.db
        .table(this.tableName)
        .insert(insertData)
        .returning('*')
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [result?.data || result];

      this.logger.log(`Created integration: ${dto.slug}`);
      return this.transformToResponse(resultArray[0]);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`Failed to create integration: ${dto.slug}`, error);
      throw error;
    }
  }

  /**
   * Update an integration (admin only)
   */
  async update(id: string, dto: UpdateIntegrationDto): Promise<IntegrationCatalogResponseDto> {
    try {
      // Check if integration exists
      await this.getById(id);

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.logoUrl !== undefined) updateData.logo_url = dto.logoUrl;
      if (dto.authConfig !== undefined) updateData.auth_config = dto.authConfig;
      if (dto.apiConfig !== undefined) updateData.api_config = dto.apiConfig;
      if (dto.webhookConfig !== undefined) updateData.webhook_config = dto.webhookConfig;
      if (dto.capabilities !== undefined) updateData.capabilities = dto.capabilities;
      if (dto.features !== undefined) updateData.features = dto.features;
      if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
      if (dto.isVerified !== undefined) updateData.is_verified = dto.isVerified;
      if (dto.isFeatured !== undefined) updateData.is_featured = dto.isFeatured;

      const result = await this.db
        .table(this.tableName)
        .where('id', '=', id)
        .update(updateData)
        .returning('*')
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [result?.data || result];

      this.logger.log(`Updated integration: ${id}`);
      return this.transformToResponse(resultArray[0]);
    } catch (error) {
      this.logger.error(`Failed to update integration: ${id}`, error);
      throw error;
    }
  }

  /**
   * Soft delete an integration (admin only)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.getById(id);

      await this.db
        .table(this.tableName)
        .where('id', '=', id)
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .execute();

      this.logger.log(`Deleted integration: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete integration: ${id}`, error);
      throw error;
    }
  }

  /**
   * Increment install count
   */
  async incrementInstallCount(id: string): Promise<void> {
    try {
      const integration = await this.getById(id);
      await this.db
        .table(this.tableName)
        .where('id', '=', id)
        .update({
          install_count: (integration.installCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .execute();
    } catch (error) {
      this.logger.error(`Failed to increment install count: ${id}`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Decrement install count
   */
  async decrementInstallCount(id: string): Promise<void> {
    try {
      const integration = await this.getById(id);
      const newCount = Math.max(0, (integration.installCount || 0) - 1);
      await this.db
        .table(this.tableName)
        .where('id', '=', id)
        .update({
          install_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .execute();
    } catch (error) {
      this.logger.error(`Failed to decrement install count: ${id}`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Seed integrations from JSON file
   */
  async seedFromData(integrations: CreateIntegrationDto[]): Promise<number> {
    let created = 0;

    for (const integration of integrations) {
      try {
        // Check if already exists
        const existing = await this.db
          .table(this.tableName)
          .select('id')
          .where('slug', '=', integration.slug)
          .execute();

        const existingArray = Array.isArray(existing?.data) ? existing.data : [];

        if (existingArray.length === 0) {
          await this.create(integration);
          created++;
        }
      } catch (error) {
        this.logger.error(`Failed to seed integration: ${integration.slug}`, error);
      }
    }

    return created;
  }

  /**
   * Get all categories with counts
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    try {
      const result = await this.db
        .table(this.tableName)
        .select('category')
        .where('is_active', '=', true)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      // Count by category
      const counts: Record<string, number> = {};
      for (const row of resultArray) {
        const cat = row.category as string;
        counts[cat] = (counts[cat] || 0) + 1;
      }

      return Object.entries(counts).map(([category, count]) => ({
        category,
        count,
      }));
    } catch (error) {
      this.logger.error('Failed to get categories', error);
      throw error;
    }
  }

  // Helper methods

  private transformToResponse(row: Record<string, unknown>): IntegrationCatalogResponseDto {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string | undefined,
      category: row.category as IntegrationCategory,
      provider: row.provider as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      website: row.website as string | undefined,
      documentationUrl: row.documentation_url as string | undefined,
      authType: row.auth_type as AuthType,
      apiBaseUrl: row.api_base_url as string | undefined,
      supportsWebhooks: row.supports_webhooks as boolean,
      capabilities: (row.capabilities as string[]) || [],
      features: (row.features as string[]) || [],
      pricingType: (row.pricing_type as PricingType) || 'free',
      isVerified: row.is_verified as boolean,
      isFeatured: row.is_featured as boolean,
      isActive: row.is_active as boolean,
      installCount: (row.install_count as number) || 0,
      rating: row.rating as number | undefined,
      reviewCount: (row.review_count as number) || 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private transformToEntity(row: Record<string, unknown>): IntegrationCatalogEntry {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string | undefined,
      category: row.category as IntegrationCategory,
      provider: row.provider as string | undefined,
      logoUrl: row.logo_url as string | undefined,
      website: row.website as string | undefined,
      documentationUrl: row.documentation_url as string | undefined,
      version: row.version as string | undefined,
      authType: row.auth_type as AuthType,
      authConfig: row.auth_config as Record<string, unknown>,
      apiBaseUrl: row.api_base_url as string | undefined,
      apiConfig: row.api_config as Record<string, unknown> | undefined,
      supportsWebhooks: row.supports_webhooks as boolean,
      webhookConfig: (row.webhook_config as WebhookConfig) || undefined,
      capabilities: (row.capabilities as string[]) || [],
      requiredPermissions: (row.required_permissions as string[]) || [],
      features: (row.features as string[]) || [],
      configSchema: row.config_schema as Record<string, unknown> | undefined,
      screenshots: (row.screenshots as string[]) || [],
      pricingType: row.pricing_type as PricingType,
      pricingDetails: row.pricing_details as Record<string, unknown> | undefined,
      isVerified: row.is_verified as boolean,
      isFeatured: row.is_featured as boolean,
      isActive: row.is_active as boolean,
      installCount: row.install_count as number,
      rating: row.rating as number | undefined,
      reviewCount: row.review_count as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private toSnakeCase(str: string): string {
    return snakeCase(str);
  }
}
