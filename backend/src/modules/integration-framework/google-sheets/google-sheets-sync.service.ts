import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GoogleSheetsService } from './google-sheets.service';
import {
  SyncConfigDto,
  CreateSyncConfigDto,
  UpdateSyncConfigDto,
  SyncResultDto,
  SyncType,
  SyncFrequency,
} from './dto/google-sheets.dto';

@Injectable()
export class GoogleSheetsSyncService {
  private readonly logger = new Logger(GoogleSheetsSyncService.name);

  constructor(
    private readonly db: DatabaseService,
    private sheetsService: GoogleSheetsService,
  ) {}

  // ==================== Sync Configuration Management ====================

  /**
   * Create a new sync configuration
   */
  async createSyncConfig(
    userId: string,
    workspaceId: string,
    dto: CreateSyncConfigDto
  ): Promise<SyncConfigDto> {
    // Verify user has a Google Sheets connection
    const connection = await this.db.findOne('google_sheets_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Google Sheets not connected. Please connect first.');
    }

    // Check if sync config already exists for this spreadsheet/sheet combo
    const existing = await this.db.findOne('google_sheets_syncs', {
      workspace_id: workspaceId,
      user_id: userId,
      spreadsheet_id: dto.spreadsheetId,
      sheet_name: dto.sheetName,
      is_active: true,
    });

    if (existing) {
      throw new BadRequestException('A sync configuration already exists for this sheet');
    }

    const syncConfig = await this.db.insert('google_sheets_syncs', {
      workspace_id: workspaceId,
      user_id: userId,
      connection_id: connection.id,
      spreadsheet_id: dto.spreadsheetId,
      spreadsheet_name: dto.spreadsheetName,
      sheet_name: dto.sheetName,
      sync_type: dto.syncType,
      deskive_entity: dto.deskiveEntity,
      column_mapping: dto.columnMapping || {},
      sync_frequency: dto.syncFrequency || SyncFrequency.MANUAL,
      is_active: true,
    });

    // Query back the inserted record
    const insertedConfig = await this.db.findOne('google_sheets_syncs', { id: syncConfig.id });

    this.logger.log(`Created sync config ${insertedConfig.id} for spreadsheet ${dto.spreadsheetId}`);

    return this.transformSyncConfig(insertedConfig);
  }

  /**
   * Get all sync configurations for a user in a workspace
   */
  async getSyncConfigs(userId: string, workspaceId: string): Promise<SyncConfigDto[]> {
    const result = await this.db.findMany('google_sheets_syncs', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    const configs = result?.data || result || [];
    return Array.isArray(configs) ? configs.map(config => this.transformSyncConfig(config)) : [];
  }

  /**
   * Get a single sync configuration
   */
  async getSyncConfig(userId: string, workspaceId: string, syncId: string): Promise<SyncConfigDto> {
    const config = await this.db.findOne('google_sheets_syncs', {
      id: syncId,
      workspace_id: workspaceId,
      user_id: userId,
    });

    if (!config) {
      throw new NotFoundException('Sync configuration not found');
    }

    return this.transformSyncConfig(config);
  }

  /**
   * Update a sync configuration
   */
  async updateSyncConfig(
    userId: string,
    workspaceId: string,
    syncId: string,
    dto: UpdateSyncConfigDto
  ): Promise<SyncConfigDto> {
    const config = await this.db.findOne('google_sheets_syncs', {
      id: syncId,
      workspace_id: workspaceId,
      user_id: userId,
    });

    if (!config) {
      throw new NotFoundException('Sync configuration not found');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.columnMapping !== undefined) {
      updateData.column_mapping = dto.columnMapping;
    }
    if (dto.syncFrequency !== undefined) {
      updateData.sync_frequency = dto.syncFrequency;
    }
    if (dto.isActive !== undefined) {
      updateData.is_active = dto.isActive;
    }

    await this.db.update('google_sheets_syncs', syncId, updateData);

    const updatedConfig = await this.db.findOne('google_sheets_syncs', { id: syncId });

    return this.transformSyncConfig(updatedConfig);
  }

  /**
   * Delete a sync configuration
   */
  async deleteSyncConfig(userId: string, workspaceId: string, syncId: string): Promise<void> {
    const config = await this.db.findOne('google_sheets_syncs', {
      id: syncId,
      workspace_id: workspaceId,
      user_id: userId,
    });

    if (!config) {
      throw new NotFoundException('Sync configuration not found');
    }

    // Soft delete
    await this.db.update('google_sheets_syncs', syncId, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Deleted sync config ${syncId}`);
  }

  // ==================== Sync Execution ====================

  /**
   * Execute sync for a specific configuration
   */
  async executeSync(userId: string, workspaceId: string, syncId: string): Promise<SyncResultDto> {
    const config = await this.db.findOne('google_sheets_syncs', {
      id: syncId,
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!config) {
      throw new NotFoundException('Sync configuration not found');
    }

    try {
      let result: SyncResultDto;

      switch (config.sync_type) {
        case SyncType.IMPORT:
          result = await this.executeImportSync(userId, workspaceId, config);
          break;
        case SyncType.EXPORT:
          result = await this.executeExportSync(userId, workspaceId, config);
          break;
        case SyncType.BIDIRECTIONAL:
          result = await this.executeBidirectionalSync(userId, workspaceId, config);
          break;
        default:
          throw new BadRequestException(`Unknown sync type: ${config.sync_type}`);
      }

      // Update last sync info
      await this.db.update('google_sheets_syncs', syncId, {
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
        last_row_count: result.rowsProcessed,
        updated_at: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      // Update sync with error
      await this.db.update('google_sheets_syncs', syncId, {
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'error',
        last_sync_error: error.message,
        updated_at: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Execute import sync - import data from Google Sheets to Deskive
   */
  private async executeImportSync(
    userId: string,
    workspaceId: string,
    config: any
  ): Promise<SyncResultDto> {
    this.logger.log(`Executing import sync for config ${config.id}`);

    // Get data from Google Sheets
    const sheetsData = await this.sheetsService.getRows(
      userId,
      workspaceId,
      config.spreadsheet_id,
      config.sheet_name
    );

    if (!sheetsData.values || sheetsData.values.length < 2) {
      return {
        success: true,
        syncId: config.id,
        rowsProcessed: 0,
        rowsCreated: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
      };
    }

    const headers = sheetsData.values[0] as string[];
    const dataRows = sheetsData.values.slice(1);
    const columnMapping = config.column_mapping || {};

    let rowsCreated = 0;
    let rowsUpdated = 0;
    let rowsSkipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i];
        const rowData: Record<string, any> = {};

        // Map columns
        headers.forEach((header, index) => {
          const mappedField = columnMapping[header] || header;
          rowData[mappedField] = row[index] || null;
        });

        // TODO: Implement entity-specific import logic
        // This would insert/update records in the appropriate Deskive table
        // based on config.deskive_entity (tasks, contacts, etc.)

        rowsCreated++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
        rowsSkipped++;
      }
    }

    return {
      success: errors.length === 0,
      syncId: config.id,
      rowsProcessed: dataRows.length,
      rowsCreated,
      rowsUpdated,
      rowsSkipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Execute export sync - export data from Deskive to Google Sheets
   */
  private async executeExportSync(
    userId: string,
    workspaceId: string,
    config: any
  ): Promise<SyncResultDto> {
    this.logger.log(`Executing export sync for config ${config.id}`);

    // TODO: Implement entity-specific export logic
    // This would fetch records from the appropriate Deskive table
    // based on config.deskive_entity and export to Google Sheets

    const columnMapping = config.column_mapping || {};
    const invertedMapping: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([sheetCol, deskiveField]) => {
      invertedMapping[deskiveField as string] = sheetCol;
    });

    // Placeholder - would be replaced with actual data fetching
    const deskiveData: Record<string, any>[] = [];

    if (deskiveData.length === 0) {
      return {
        success: true,
        syncId: config.id,
        rowsProcessed: 0,
        rowsCreated: 0,
        rowsUpdated: 0,
        rowsSkipped: 0,
      };
    }

    // Get existing sheet data to determine if we need headers
    const existingData = await this.sheetsService.getRows(
      userId,
      workspaceId,
      config.spreadsheet_id,
      config.sheet_name
    );

    const needsHeaders = !existingData.values || existingData.values.length === 0;
    const headers = Object.keys(invertedMapping).length > 0
      ? Object.values(invertedMapping)
      : Object.keys(deskiveData[0]);

    const rows: any[][] = [];

    if (needsHeaders) {
      rows.push(headers);
    }

    // Convert data to rows
    for (const record of deskiveData) {
      const row = headers.map(header => {
        const field = Object.entries(invertedMapping).find(([, col]) => col === header)?.[0] || header;
        return record[field] || '';
      });
      rows.push(row);
    }

    // Append to sheet
    await this.sheetsService.appendRow(
      userId,
      workspaceId,
      config.spreadsheet_id,
      config.sheet_name,
      rows
    );

    return {
      success: true,
      syncId: config.id,
      rowsProcessed: deskiveData.length,
      rowsCreated: deskiveData.length,
      rowsUpdated: 0,
      rowsSkipped: 0,
    };
  }

  /**
   * Execute bidirectional sync
   */
  private async executeBidirectionalSync(
    userId: string,
    workspaceId: string,
    config: any
  ): Promise<SyncResultDto> {
    this.logger.log(`Executing bidirectional sync for config ${config.id}`);

    // Execute import first, then export
    const importResult = await this.executeImportSync(userId, workspaceId, config);
    const exportResult = await this.executeExportSync(userId, workspaceId, config);

    return {
      success: importResult.success && exportResult.success,
      syncId: config.id,
      rowsProcessed: importResult.rowsProcessed + exportResult.rowsProcessed,
      rowsCreated: (importResult.rowsCreated || 0) + (exportResult.rowsCreated || 0),
      rowsUpdated: (importResult.rowsUpdated || 0) + (exportResult.rowsUpdated || 0),
      rowsSkipped: (importResult.rowsSkipped || 0) + (exportResult.rowsSkipped || 0),
      errors: [...(importResult.errors || []), ...(exportResult.errors || [])],
    };
  }

  // ==================== Scheduled Sync ====================

  /**
   * Process all pending scheduled syncs
   * Called by cron job
   */
  async processScheduledSyncs(): Promise<void> {
    this.logger.log('Processing scheduled syncs...');

    // Get all active syncs with frequency other than manual
    const result = await this.db.table('google_sheets_syncs')
      .select('*')
      .where('is_active', '=', true)
      .where('sync_frequency', '!=', SyncFrequency.MANUAL)
      .execute();

    const syncs = result?.data || result || [];
    const syncArray = Array.isArray(syncs) ? syncs : [];

    for (const sync of syncArray) {
      try {
        const shouldSync = this.shouldExecuteScheduledSync(sync);
        if (shouldSync) {
          await this.executeSync(sync.user_id, sync.workspace_id, sync.id);
          this.logger.log(`Completed scheduled sync ${sync.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed scheduled sync ${sync.id}: ${error.message}`);
      }
    }
  }

  /**
   * Check if a sync should be executed based on its schedule
   */
  private shouldExecuteScheduledSync(sync: any): boolean {
    if (!sync.last_sync_at) {
      return true; // Never synced, should run
    }

    const lastSync = new Date(sync.last_sync_at);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    switch (sync.sync_frequency) {
      case SyncFrequency.HOURLY:
        return diffHours >= 1;
      case SyncFrequency.DAILY:
        return diffHours >= 24;
      default:
        return false;
    }
  }

  // ==================== Helper Methods ====================

  private transformSyncConfig(config: any): SyncConfigDto {
    return {
      id: config.id,
      workspaceId: config.workspace_id,
      userId: config.user_id,
      connectionId: config.connection_id,
      spreadsheetId: config.spreadsheet_id,
      spreadsheetName: config.spreadsheet_name,
      sheetName: config.sheet_name,
      syncType: config.sync_type,
      deskiveEntity: config.deskive_entity,
      columnMapping: config.column_mapping || {},
      syncFrequency: config.sync_frequency,
      lastSyncAt: config.last_sync_at,
      lastSyncStatus: config.last_sync_status,
      lastSyncError: config.last_sync_error,
      lastRowCount: config.last_row_count || 0,
      isActive: config.is_active,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    };
  }
}
