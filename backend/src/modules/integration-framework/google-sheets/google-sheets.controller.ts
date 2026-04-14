import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsSyncService } from './google-sheets-sync.service';
import {
  GoogleSheetsConnectionDto,
  ConnectGoogleSheetsDto,
  NativeConnectGoogleSheetsDto,
  SpreadsheetDto,
  SpreadsheetDetailDto,
  SheetDto,
  GetRowsDto,
  GetRowsResponseDto,
  AppendRowDto,
  UpdateRowDto,
  AppendOrUpdateRowDto,
  ClearRangeDto,
  CreateSpreadsheetDto,
  CreateSpreadsheetResponseDto,
  RowOperationResponseDto,
  ColumnHeaderDto,
  CreateSyncConfigDto,
  UpdateSyncConfigDto,
  SyncConfigDto,
  SyncResultDto,
} from './dto/google-sheets.dto';

@ApiTags('Google Sheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/google-sheets')
export class GoogleSheetsController {
  constructor(
    private readonly sheetsService: GoogleSheetsService,
    private readonly syncService: GoogleSheetsSyncService,
  ) {}

  // ==================== Connection Endpoints ====================

  @Get('connection')
  @ApiOperation({ summary: 'Get Google Sheets connection status' })
  @ApiResponse({ status: 200, type: GoogleSheetsConnectionDto })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ): Promise<{ data: GoogleSheetsConnectionDto | null }> {
    const userId = req.user.sub || req.user.userId;
    const connection = await this.sheetsService.getConnection(userId, workspaceId);
    return { data: connection };
  }

  @Post('connect')
  @ApiOperation({ summary: 'Get OAuth URL to connect Google Sheets' })
  @ApiResponse({ status: 200 })
  async connect(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ConnectGoogleSheetsDto,
    @Req() req: any,
  ): Promise<{ data: { authorizationUrl: string } }> {
    const userId = req.user.sub || req.user.userId;
    const result = this.sheetsService.getAuthUrl(userId, workspaceId, dto.returnUrl);
    return { data: { authorizationUrl: result.authorizationUrl } };
  }

  @Post('connect-native')
  @ApiOperation({ summary: 'Connect Google Sheets using native mobile sign-in' })
  @ApiResponse({ status: 200, type: GoogleSheetsConnectionDto })
  async connectNative(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: NativeConnectGoogleSheetsDto,
    @Req() req: any,
  ): Promise<{ data: GoogleSheetsConnectionDto }> {
    const userId = req.user.sub || req.user.userId;
    const connection = await this.sheetsService.handleNativeSignIn(
      userId,
      workspaceId,
      dto.serverAuthCode,
      {
        email: dto.email,
        displayName: dto.displayName,
        photoUrl: dto.photoUrl,
      },
    );
    return { data: connection };
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Google Sheets' })
  async disconnect(@Param('workspaceId') workspaceId: string, @Req() req: any): Promise<void> {
    const userId = req.user.sub || req.user.userId;
    await this.sheetsService.disconnect(userId, workspaceId);
  }

  // ==================== Spreadsheet Endpoints ====================

  @Get('spreadsheets')
  @ApiOperation({ summary: 'List all spreadsheets' })
  @ApiResponse({ status: 200, type: [SpreadsheetDto] })
  async listSpreadsheets(
    @Param('workspaceId') workspaceId: string,
    @Query('pageSize') pageSize?: number,
    @Query('pageToken') pageToken?: string,
    @Req() req?: any,
  ): Promise<{ data: { spreadsheets: SpreadsheetDto[]; nextPageToken?: string } }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.listSpreadsheets(userId, workspaceId, {
      pageSize,
      pageToken,
    });
    return { data: result };
  }

  @Get('spreadsheets/:spreadsheetId')
  @ApiOperation({ summary: 'Get spreadsheet details' })
  @ApiResponse({ status: 200, type: SpreadsheetDetailDto })
  async getSpreadsheet(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Req() req: any,
  ): Promise<{ data: SpreadsheetDetailDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.getSpreadsheet(userId, workspaceId, spreadsheetId);
    return { data: result };
  }

  @Get('spreadsheets/:spreadsheetId/sheets')
  @ApiOperation({ summary: 'Get sheets from a spreadsheet' })
  @ApiResponse({ status: 200, type: [SheetDto] })
  async getSheets(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Req() req: any,
  ): Promise<{ data: SheetDto[] }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.getSheets(userId, workspaceId, spreadsheetId);
    return { data: result };
  }

  @Post('spreadsheets')
  @ApiOperation({ summary: 'Create a new spreadsheet' })
  @ApiResponse({ status: 201, type: CreateSpreadsheetResponseDto })
  async createSpreadsheet(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSpreadsheetDto,
    @Req() req: any,
  ): Promise<{ data: CreateSpreadsheetResponseDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.createSpreadsheet(
      userId,
      workspaceId,
      dto.title,
      dto.sheets,
    );
    return { data: result };
  }

  // ==================== Data Operation Endpoints ====================

  @Get('spreadsheets/:spreadsheetId/sheets/:sheetName/rows')
  @ApiOperation({ summary: 'Get rows from a sheet' })
  @ApiResponse({ status: 200, type: GetRowsResponseDto })
  async getRows(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Param('sheetName') sheetName: string,
    @Query('range') range?: string,
    @Query('returnLinkToSheet') returnLinkToSheet?: boolean,
    @Req() req?: any,
  ): Promise<{ data: GetRowsResponseDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.getRows(userId, workspaceId, spreadsheetId, sheetName, {
      range,
      returnLinkToSheet,
    });
    return { data: result };
  }

  @Post('spreadsheets/:spreadsheetId/sheets/:sheetName/rows')
  @ApiOperation({ summary: 'Append rows to a sheet' })
  @ApiResponse({ status: 201, type: RowOperationResponseDto })
  async appendRows(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Param('sheetName') sheetName: string,
    @Body() dto: { values: any[][]; valueInputOption?: 'RAW' | 'USER_ENTERED' },
    @Req() req: any,
  ): Promise<{ data: RowOperationResponseDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.appendRow(
      userId,
      workspaceId,
      spreadsheetId,
      sheetName,
      dto.values,
      dto.valueInputOption,
    );
    return { data: result };
  }

  @Put('spreadsheets/:spreadsheetId/sheets/:sheetName/rows')
  @ApiOperation({ summary: 'Update rows in a sheet' })
  @ApiResponse({ status: 200, type: RowOperationResponseDto })
  async updateRows(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Param('sheetName') sheetName: string,
    @Body() dto: { range: string; values: any[][]; valueInputOption?: 'RAW' | 'USER_ENTERED' },
    @Req() req: any,
  ): Promise<{ data: RowOperationResponseDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.updateRow(
      userId,
      workspaceId,
      spreadsheetId,
      sheetName,
      dto.range,
      dto.values,
      dto.valueInputOption,
    );
    return { data: result };
  }

  @Post('spreadsheets/:spreadsheetId/sheets/:sheetName/upsert')
  @ApiOperation({ summary: 'Append or update a row based on matching column' })
  @ApiResponse({ status: 200, type: RowOperationResponseDto })
  async appendOrUpdateRow(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Param('sheetName') sheetName: string,
    @Body()
    dto: {
      columns: Record<string, any>;
      columnToMatchOn?: string;
      valueToMatch?: string;
      valueInputOption?: 'RAW' | 'USER_ENTERED';
      appendIfNotFound?: boolean;
    },
    @Req() req: any,
  ): Promise<{ data: RowOperationResponseDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.appendOrUpdateRow(
      userId,
      workspaceId,
      spreadsheetId,
      sheetName,
      dto.columns,
      {
        columnToMatchOn: dto.columnToMatchOn,
        valueToMatch: dto.valueToMatch,
        valueInputOption: dto.valueInputOption,
        appendIfNotFound: dto.appendIfNotFound,
      },
    );
    return { data: result };
  }

  @Delete('spreadsheets/:spreadsheetId/sheets/:sheetName/clear')
  @ApiOperation({ summary: 'Clear a range in a sheet' })
  @ApiResponse({ status: 200, type: RowOperationResponseDto })
  async clearRange(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Param('sheetName') sheetName: string,
    @Query('range') range: string,
    @Req() req: any,
  ): Promise<{ data: RowOperationResponseDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.clearRange(
      userId,
      workspaceId,
      spreadsheetId,
      sheetName,
      range,
    );
    return { data: result };
  }

  @Get('spreadsheets/:spreadsheetId/sheets/:sheetName/columns')
  @ApiOperation({ summary: 'Get column headers from a sheet' })
  @ApiResponse({ status: 200, type: [ColumnHeaderDto] })
  async getColumnHeaders(
    @Param('workspaceId') workspaceId: string,
    @Param('spreadsheetId') spreadsheetId: string,
    @Param('sheetName') sheetName: string,
    @Req() req: any,
  ): Promise<{ data: ColumnHeaderDto[] }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.sheetsService.getColumnHeaders(
      userId,
      workspaceId,
      spreadsheetId,
      sheetName,
    );
    return { data: result };
  }

  // ==================== Sync Configuration Endpoints ====================

  @Get('syncs')
  @ApiOperation({ summary: 'Get all sync configurations' })
  @ApiResponse({ status: 200, type: [SyncConfigDto] })
  async getSyncConfigs(
    @Param('workspaceId') workspaceId: string,
    @Req() req: any,
  ): Promise<{ data: SyncConfigDto[] }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.syncService.getSyncConfigs(userId, workspaceId);
    return { data: result };
  }

  @Get('syncs/:syncId')
  @ApiOperation({ summary: 'Get a sync configuration' })
  @ApiResponse({ status: 200, type: SyncConfigDto })
  async getSyncConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('syncId') syncId: string,
    @Req() req: any,
  ): Promise<{ data: SyncConfigDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.syncService.getSyncConfig(userId, workspaceId, syncId);
    return { data: result };
  }

  @Post('syncs')
  @ApiOperation({ summary: 'Create a sync configuration' })
  @ApiResponse({ status: 201, type: SyncConfigDto })
  async createSyncConfig(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSyncConfigDto,
    @Req() req: any,
  ): Promise<{ data: SyncConfigDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.syncService.createSyncConfig(userId, workspaceId, dto);
    return { data: result };
  }

  @Put('syncs/:syncId')
  @ApiOperation({ summary: 'Update a sync configuration' })
  @ApiResponse({ status: 200, type: SyncConfigDto })
  async updateSyncConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('syncId') syncId: string,
    @Body() dto: UpdateSyncConfigDto,
    @Req() req: any,
  ): Promise<{ data: SyncConfigDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.syncService.updateSyncConfig(userId, workspaceId, syncId, dto);
    return { data: result };
  }

  @Delete('syncs/:syncId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a sync configuration' })
  async deleteSyncConfig(
    @Param('workspaceId') workspaceId: string,
    @Param('syncId') syncId: string,
    @Req() req: any,
  ): Promise<void> {
    const userId = req.user.sub || req.user.userId;
    await this.syncService.deleteSyncConfig(userId, workspaceId, syncId);
  }

  @Post('syncs/:syncId/execute')
  @ApiOperation({ summary: 'Execute a sync' })
  @ApiResponse({ status: 200, type: SyncResultDto })
  async executeSync(
    @Param('workspaceId') workspaceId: string,
    @Param('syncId') syncId: string,
    @Req() req: any,
  ): Promise<{ data: SyncResultDto }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.syncService.executeSync(userId, workspaceId, syncId);
    return { data: result };
  }
}
