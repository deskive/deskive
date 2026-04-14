import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CatalogService } from './catalog.service';
import { GenericOAuthService } from './generic-oauth.service';
import {
  IntegrationConnection,
  ConnectionStatus,
  OAuthTokens,
  ExternalUserInfo,
} from '../interfaces/integration-config.interface';
import {
  ConnectionResponseDto,
  ConnectionListResponseDto,
  UpdateConnectionConfigDto,
} from '../dto/connection.dto';

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);
  private readonly tableName = 'integration_connections';

  constructor(
    private readonly db: DatabaseService,
    private readonly catalogService: CatalogService,
    private readonly oauthService: GenericOAuthService,
  ) {}

  /**
   * Create a new connection after successful OAuth
   */
  async createConnection(
    workspaceId: string,
    userId: string,
    integrationId: string,
    tokens: OAuthTokens,
    userInfo: ExternalUserInfo,
  ): Promise<ConnectionResponseDto> {
    try {
      const integration = await this.catalogService.getById(integrationId);

      // Check if connection already exists
      const existing = await this.findExistingConnection(workspaceId, userId, integrationId);

      const now = new Date().toISOString();
      const connectionData = {
        workspace_id: workspaceId,
        user_id: userId,
        integration_id: integrationId,
        auth_type: integration.authType,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || null,
        token_type: tokens.tokenType || 'Bearer',
        scope: tokens.scope || null,
        expires_at: tokens.expiresAt?.toISOString() || null,
        external_id: userInfo.id,
        external_email: userInfo.email || null,
        external_name: userInfo.name || null,
        external_avatar: userInfo.avatar || null,
        external_metadata: userInfo.metadata || {},
        status: 'active' as ConnectionStatus,
        error_message: null,
        last_error_at: null,
        config: {},
        settings: {},
        is_active: true,
        updated_at: now,
      };

      let result;
      if (existing) {
        // Update existing connection
        result = await this.db
          .table(this.tableName)
          .where('id', '=', existing.id)
          .update(connectionData)
          .returning('*')
          .execute();

        this.logger.log(`Updated connection for ${integration.slug} in workspace ${workspaceId}`);
      } else {
        // Create new connection
        result = await this.db
          .table(this.tableName)
          .insert({
            ...connectionData,
            created_at: now,
          })
          .returning('*')
          .execute();

        // Increment install count
        await this.catalogService.incrementInstallCount(integrationId);

        this.logger.log(`Created connection for ${integration.slug} in workspace ${workspaceId}`);
      }

      const resultArray = Array.isArray(result?.data) ? result.data : [result?.data || result];
      return this.transformToResponse(resultArray[0], integration);
    } catch (error) {
      this.logger.error('Failed to create connection', error);
      throw error;
    }
  }

  /**
   * Create connection with API key
   */
  async createApiKeyConnection(
    workspaceId: string,
    userId: string,
    integrationSlug: string,
    apiKey: string,
    config?: Record<string, unknown>,
  ): Promise<ConnectionResponseDto> {
    try {
      const integration = await this.catalogService.getBySlug(integrationSlug);

      if (integration.authType !== 'api_key') {
        throw new ConflictException(
          `Integration '${integrationSlug}' does not support API key authentication`,
        );
      }

      // Check if connection already exists
      const existing = await this.findExistingConnection(workspaceId, userId, integration.id);

      if (existing) {
        throw new ConflictException(`Connection already exists for '${integrationSlug}'`);
      }

      const now = new Date().toISOString();
      const connectionData = {
        workspace_id: workspaceId,
        user_id: userId,
        integration_id: integration.id,
        auth_type: 'api_key',
        api_key: apiKey,
        status: 'active' as ConnectionStatus,
        config: config || {},
        settings: {},
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      const result = await this.db
        .table(this.tableName)
        .insert(connectionData)
        .returning('*')
        .execute();

      // Increment install count
      await this.catalogService.incrementInstallCount(integration.id);

      this.logger.log(
        `Created API key connection for ${integrationSlug} in workspace ${workspaceId}`,
      );

      const resultArray = Array.isArray(result?.data) ? result.data : [result?.data || result];
      return this.transformToResponse(resultArray[0], integration);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Failed to create API key connection', error);
      throw error;
    }
  }

  /**
   * Get all connections for a user in a workspace
   */
  async getUserConnections(
    workspaceId: string,
    userId: string,
  ): Promise<ConnectionListResponseDto> {
    try {
      const results = await this.db
        .table(this.tableName)
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .orderBy('created_at', 'DESC')
        .execute();

      const resultsArray = Array.isArray(results?.data) ? results.data : [];
      const connections = await Promise.all(
        resultsArray.map(async (row: Record<string, unknown>) => {
          const integration = await this.catalogService.getById(row.integration_id as string);
          return this.transformToResponse(row, integration);
        }),
      );

      return {
        connections,
        total: connections.length,
      };
    } catch (error) {
      this.logger.error('Failed to get user connections', error);
      throw error;
    }
  }

  /**
   * Get a specific connection
   */
  async getConnection(connectionId: string, userId: string): Promise<ConnectionResponseDto> {
    try {
      const result = await this.db
        .table(this.tableName)
        .select('*')
        .where('id', '=', connectionId)
        .where('is_active', '=', true)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      if (resultArray.length === 0) {
        throw new NotFoundException(`Connection not found`);
      }

      const connection = resultArray[0];

      // Verify ownership
      if (connection.user_id !== userId) {
        throw new ForbiddenException('Not authorized to access this connection');
      }

      const integration = await this.catalogService.getById(connection.integration_id as string);

      return this.transformToResponse(connection, integration);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to get connection: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Get connection by integration slug
   */
  async getConnectionBySlug(
    workspaceId: string,
    userId: string,
    integrationSlug: string,
  ): Promise<ConnectionResponseDto | null> {
    try {
      const integration = await this.catalogService.getBySlug(integrationSlug);

      const result = await this.db
        .table(this.tableName)
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('integration_id', '=', integration.id)
        .where('is_active', '=', true)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      if (resultArray.length === 0) {
        return null;
      }

      return this.transformToResponse(resultArray[0], integration);
    } catch (error) {
      this.logger.error(`Failed to get connection by slug: ${integrationSlug}`, error);
      return null;
    }
  }

  /**
   * Update connection configuration
   */
  async updateConnection(
    connectionId: string,
    userId: string,
    dto: UpdateConnectionConfigDto,
  ): Promise<ConnectionResponseDto> {
    try {
      // Verify ownership
      await this.getConnection(connectionId, userId);

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.config !== undefined) {
        updateData.config = dto.config;
      }
      if (dto.settings !== undefined) {
        updateData.settings = dto.settings;
      }

      const result = await this.db
        .table(this.tableName)
        .where('id', '=', connectionId)
        .update(updateData)
        .returning('*')
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [result?.data || result];
      const integration = await this.catalogService.getById(
        resultArray[0].integration_id as string,
      );

      this.logger.log(`Updated connection: ${connectionId}`);
      return this.transformToResponse(resultArray[0], integration);
    } catch (error) {
      this.logger.error(`Failed to update connection: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Disconnect (soft delete) a connection
   */
  async disconnect(connectionId: string, userId: string): Promise<void> {
    try {
      const connection = await this.getConnection(connectionId, userId);

      // Revoke OAuth token if possible
      if (connection.authType === 'oauth2' && connection.integration) {
        try {
          const integration = await this.catalogService.getFullConfig(connection.integration.slug);

          // Get the access token from the raw connection data
          const rawConnection = await this.db
            .table(this.tableName)
            .select('access_token')
            .where('id', '=', connectionId)
            .execute();

          const rawArray = Array.isArray(rawConnection?.data) ? rawConnection.data : [];
          if (rawArray?.[0]?.access_token) {
            await this.oauthService.revokeToken(integration, rawArray[0].access_token as string);
          }
        } catch (error) {
          this.logger.warn(`Failed to revoke token for connection: ${connectionId}`, error);
          // Continue with disconnect even if revocation fails
        }
      }

      // Soft delete
      await this.db
        .table(this.tableName)
        .where('id', '=', connectionId)
        .update({
          is_active: false,
          status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .execute();

      // Decrement install count
      if (connection.integrationId) {
        await this.catalogService.decrementInstallCount(connection.integrationId);
      }

      this.logger.log(`Disconnected connection: ${connectionId}`);
    } catch (error) {
      this.logger.error(`Failed to disconnect: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(connectionId: string): Promise<string> {
    try {
      const result = await this.db
        .table(this.tableName)
        .select('*')
        .where('id', '=', connectionId)
        .where('is_active', '=', true)
        .execute();

      const resultArray = Array.isArray(result?.data) ? result.data : [];

      if (resultArray.length === 0) {
        throw new NotFoundException('Connection not found');
      }

      const connection = resultArray[0];

      // Check if token is expired
      const expiresAt = connection.expires_at ? new Date(connection.expires_at as string) : null;
      const isExpired = expiresAt && expiresAt < new Date();

      if (isExpired && connection.refresh_token) {
        // Refresh the token
        const integration = await this.catalogService.getById(connection.integration_id as string);
        const fullConfig = await this.catalogService.getFullConfig(integration.slug);

        const newTokens = await this.oauthService.refreshAccessToken(
          fullConfig,
          connection.refresh_token as string,
        );

        // Update the connection with new tokens
        await this.db
          .table(this.tableName)
          .where('id', '=', connectionId)
          .update({
            access_token: newTokens.accessToken,
            refresh_token: newTokens.refreshToken || connection.refresh_token,
            expires_at: newTokens.expiresAt?.toISOString() || null,
            status: 'active',
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .execute();

        this.logger.debug(`Refreshed token for connection: ${connectionId}`);
        return newTokens.accessToken;
      }

      if (isExpired && !connection.refresh_token) {
        // Token expired and no refresh token - mark as expired
        await this.db
          .table(this.tableName)
          .where('id', '=', connectionId)
          .update({
            status: 'expired',
            error_message: 'Token expired and no refresh token available',
            last_error_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();

        throw new Error('Token expired and no refresh token available');
      }

      return connection.access_token as string;
    } catch (error) {
      this.logger.error(`Failed to get valid access token for connection: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Update connection status after an error
   */
  async markConnectionError(connectionId: string, errorMessage: string): Promise<void> {
    try {
      await this.db
        .table(this.tableName)
        .where('id', '=', connectionId)
        .update({
          status: 'error',
          error_message: errorMessage,
          last_error_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();
    } catch (error) {
      this.logger.error(`Failed to mark connection error: ${connectionId}`, error);
    }
  }

  /**
   * Update last synced timestamp
   */
  async updateLastSynced(connectionId: string, syncCursor?: string): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (syncCursor !== undefined) {
        updateData.sync_cursor = syncCursor;
      }

      await this.db
        .table(this.tableName)
        .where('id', '=', connectionId)
        .update(updateData)
        .execute();
    } catch (error) {
      this.logger.error(`Failed to update last synced: ${connectionId}`, error);
    }
  }

  // Helper methods

  private async findExistingConnection(
    workspaceId: string,
    userId: string,
    integrationId: string,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.db
      .table(this.tableName)
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('integration_id', '=', integrationId)
      .execute();

    const resultArray = Array.isArray(result?.data) ? result.data : [];
    return resultArray.length > 0 ? resultArray[0] : null;
  }

  private transformToResponse(
    row: Record<string, unknown>,
    integration?: {
      slug: string;
      name: string;
      category: string;
      provider?: string;
      logoUrl?: string;
    },
  ): ConnectionResponseDto {
    return {
      id: row.id as string,
      workspaceId: row.workspace_id as string,
      userId: row.user_id as string,
      integrationId: row.integration_id as string,
      authType: row.auth_type as string,
      externalId: row.external_id as string | undefined,
      externalEmail: row.external_email as string | undefined,
      externalName: row.external_name as string | undefined,
      externalAvatar: row.external_avatar as string | undefined,
      status: row.status as ConnectionStatus,
      errorMessage: row.error_message as string | undefined,
      lastErrorAt: row.last_error_at as string | undefined,
      config: row.config as Record<string, unknown> | undefined,
      settings: row.settings as Record<string, unknown> | undefined,
      lastSyncedAt: row.last_synced_at as string | undefined,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      integration: integration
        ? {
            slug: integration.slug,
            name: integration.name,
            category: integration.category,
            provider: integration.provider,
            logoUrl: integration.logoUrl,
          }
        : undefined,
    };
  }
}
