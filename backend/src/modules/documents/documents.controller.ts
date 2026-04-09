import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddRecipientDto,
  UpdateRecipientDto,
  SendDocumentDto,
  DocumentQueryDto,
  EmbedSignatureDto,
  DocumentType,
  DocumentStatus,
} from './dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all documents in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'documentType', enum: DocumentType, required: false })
  @ApiQuery({ name: 'status', enum: DocumentStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: DocumentQueryDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.documentsService.findAll(workspaceId, userId, query);
    return {
      data: result.documents,
      pagination: result.pagination,
      message: 'Documents retrieved successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const stats = await this.documentsService.getStats(workspaceId, userId);
    return {
      data: stats,
      message: 'Statistics retrieved successfully',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateDocumentDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const document = await this.documentsService.create(workspaceId, dto, userId);
    return {
      data: document,
      message: 'Document created successfully',
    };
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.documentsService.findOneWithDetails(workspaceId, documentId, userId);
    return {
      data: result,
      message: 'Document retrieved successfully',
    };
  }

  @Patch(':documentId')
  @ApiOperation({ summary: 'Update a document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const document = await this.documentsService.update(workspaceId, documentId, dto, userId);
    return {
      data: document,
      message: 'Document updated successfully',
    };
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  async delete(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.documentsService.delete(workspaceId, documentId, userId);
  }

  @Get(':documentId/preview')
  @ApiOperation({ summary: 'Get HTML preview of document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Preview retrieved successfully' })
  async getPreview(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const html = await this.documentsService.getPreview(workspaceId, documentId, userId);
    return {
      data: { html },
      message: 'Preview retrieved successfully',
    };
  }

  // ==================== RECIPIENTS ====================

  @Get(':documentId/recipients')
  @ApiOperation({ summary: 'Get recipients for a document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Recipients retrieved successfully' })
  async getRecipients(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
  ) {
    // Verify document belongs to workspace
    await this.documentsService.findOne(workspaceId, documentId);
    const recipients = await this.documentsService.getRecipients(documentId);
    return {
      data: recipients,
      message: 'Recipients retrieved successfully',
    };
  }

  @Post(':documentId/recipients')
  @ApiOperation({ summary: 'Add a recipient to a document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 201, description: 'Recipient added successfully' })
  async addRecipient(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Body() dto: AddRecipientDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const recipient = await this.documentsService.addRecipient(
      workspaceId,
      documentId,
      dto,
      userId,
    );
    return {
      data: recipient,
      message: 'Recipient added successfully',
    };
  }

  @Patch(':documentId/recipients/:recipientId')
  @ApiOperation({ summary: 'Update a recipient' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'recipientId', description: 'Recipient ID' })
  @ApiResponse({ status: 200, description: 'Recipient updated successfully' })
  async updateRecipient(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Param('recipientId') recipientId: string,
    @Body() dto: UpdateRecipientDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const recipient = await this.documentsService.updateRecipient(
      workspaceId,
      documentId,
      recipientId,
      dto,
      userId,
    );
    return {
      data: recipient,
      message: 'Recipient updated successfully',
    };
  }

  @Delete(':documentId/recipients/:recipientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a recipient' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiParam({ name: 'recipientId', description: 'Recipient ID' })
  @ApiResponse({ status: 204, description: 'Recipient removed successfully' })
  async removeRecipient(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Param('recipientId') recipientId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.documentsService.removeRecipient(workspaceId, documentId, recipientId, userId);
  }

  // ==================== SEND FOR SIGNATURE ====================

  @Post(':documentId/send')
  @ApiOperation({ summary: 'Send document for signatures' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document sent successfully' })
  async sendForSignature(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Body() dto: SendDocumentDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const document = await this.documentsService.sendForSignature(
      workspaceId,
      documentId,
      dto,
      userId,
    );
    return {
      data: document,
      message: 'Document sent for signatures successfully',
    };
  }

  // ==================== SIGN DOCUMENT (EMBED SIGNATURE) ====================

  @Post(':documentId/sign')
  @ApiOperation({ summary: 'Sign document by embedding signature at position' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document signed successfully' })
  async signDocument(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
    @Body() dto: EmbedSignatureDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    const document = await this.documentsService.embedSignatureInDocument(
      workspaceId,
      documentId,
      dto.signatureId,
      {
        xPercent: dto.position.xPercent,
        yPercent: dto.position.yPercent,
        scale: dto.position.scale || 1.0,
        topPx: dto.position.topPx,
        documentHeight: dto.position.documentHeight,
      },
      userId,
      ipAddress,
    );

    return {
      data: document,
      message: 'Document signed successfully',
    };
  }

  // ==================== ACTIVITY LOG ====================

  @Get(':documentId/activity')
  @ApiOperation({ summary: 'Get activity log for a document' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Activity log retrieved successfully' })
  async getActivityLog(
    @Param('workspaceId') workspaceId: string,
    @Param('documentId') documentId: string,
  ) {
    const logs = await this.documentsService.getActivityLog(workspaceId, documentId);
    return {
      data: logs,
      message: 'Activity log retrieved successfully',
    };
  }
}
