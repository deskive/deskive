import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentTemplatesService } from './document-templates.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import {
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  DocumentTemplateQueryDto,
  DocumentType,
  DocumentTemplateCategory,
} from './dto';

@ApiTags('document-templates')
@Controller('workspaces/:workspaceId/document-templates')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class DocumentTemplatesController {
  constructor(private readonly documentTemplatesService: DocumentTemplatesService) {}

  // ==================== GET TEMPLATES ====================

  @Get()
  @ApiOperation({ summary: 'Get all document templates' })
  @ApiResponse({
    status: 200,
    description: 'List of document templates with pagination',
  })
  @ApiQuery({
    name: 'documentType',
    required: false,
    enum: DocumentType,
    description: 'Filter by document type',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: DocumentTemplateCategory,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'systemOnly',
    required: false,
    type: Boolean,
    description: 'Show only system templates',
  })
  @ApiQuery({
    name: 'featured',
    required: false,
    type: Boolean,
    description: 'Show only featured templates',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search templates by name',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: DocumentTemplateQueryDto,
  ) {
    const result = await this.documentTemplatesService.findAll(workspaceId, query);
    return { data: result.templates, pagination: result.pagination };
  }

  @Get('types')
  @ApiOperation({ summary: 'Get document types with counts' })
  @ApiResponse({
    status: 200,
    description: 'List of document types with template counts',
  })
  async getDocumentTypes(@Param('workspaceId') workspaceId: string) {
    const types = await this.documentTemplatesService.getDocumentTypes(workspaceId);
    return { data: types };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get template categories with counts' })
  @ApiResponse({
    status: 200,
    description: 'List of categories with template counts',
  })
  async getCategories(@Param('workspaceId') workspaceId: string) {
    const categories = await this.documentTemplatesService.getCategories(workspaceId);
    return { data: categories };
  }

  @Get('type/:documentType')
  @ApiOperation({ summary: 'Get templates by document type' })
  @ApiResponse({
    status: 200,
    description: 'Templates of the specified type',
  })
  @ApiParam({
    name: 'documentType',
    enum: DocumentType,
    description: 'Document type',
  })
  async findByType(
    @Param('workspaceId') workspaceId: string,
    @Param('documentType') documentType: DocumentType,
    @Query() query: DocumentTemplateQueryDto,
  ) {
    query.documentType = documentType;
    const result = await this.documentTemplatesService.findAll(workspaceId, query);
    return { data: result.templates, pagination: result.pagination };
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a document template by ID or slug' })
  @ApiResponse({
    status: 200,
    description: 'Document template details',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async findOne(@Param('workspaceId') workspaceId: string, @Param('idOrSlug') idOrSlug: string) {
    const template = await this.documentTemplatesService.findOne(workspaceId, idOrSlug);
    return { data: template };
  }

  // ==================== CREATE TEMPLATE ====================

  @Post()
  @ApiOperation({ summary: 'Create a custom document template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Template with this slug already exists',
  })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() createDto: CreateDocumentTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    const template = await this.documentTemplatesService.create(workspaceId, createDto, userId);
    return { data: template };
  }

  // ==================== UPDATE TEMPLATE ====================

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update a custom document template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot modify system templates',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @Body() updateDto: UpdateDocumentTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    const template = await this.documentTemplatesService.update(
      workspaceId,
      templateId,
      updateDto,
      userId,
    );
    return { data: template };
  }

  // ==================== DELETE TEMPLATE ====================

  @Delete(':templateId')
  @ApiOperation({ summary: 'Delete a custom document template' })
  @ApiResponse({
    status: 200,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system templates',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async delete(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.documentTemplatesService.delete(workspaceId, templateId, userId);
    return { message: 'Document template deleted successfully' };
  }

  // ==================== SEED SYSTEM TEMPLATES ====================

  @Post('seed')
  @ApiOperation({ summary: 'Seed system document templates (admin operation)' })
  @ApiResponse({
    status: 200,
    description: 'System templates seeded successfully',
  })
  async seedSystemTemplates() {
    await this.documentTemplatesService.seedSystemTemplates();
    return { message: 'System document templates seeded successfully' };
  }
}
