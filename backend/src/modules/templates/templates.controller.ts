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
import { TemplatesService } from './templates.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateProjectFromTemplateDto,
  TemplateQueryDto,
  TemplateCategory,
} from './dto';

@ApiTags('templates')
@Controller('workspaces/:workspaceId/templates')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // ==================== GET TEMPLATES ====================

  @Get()
  @ApiOperation({ summary: 'Get all available templates' })
  @ApiResponse({
    status: 200,
    description: 'List of templates (system + workspace-specific) with pagination',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: TemplateCategory,
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
    description: 'Page number (1-based, default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  async findAll(@Param('workspaceId') workspaceId: string, @Query() query: TemplateQueryDto) {
    const result = await this.templatesService.findAll(workspaceId, query);
    return { data: result.templates, pagination: result.pagination };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all template categories with counts' })
  @ApiResponse({
    status: 200,
    description: 'List of categories with template counts',
  })
  async getCategories() {
    const categories = await this.templatesService.getCategories();
    return { data: categories };
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get templates by category' })
  @ApiResponse({
    status: 200,
    description: 'Templates in the specified category',
  })
  @ApiParam({
    name: 'category',
    enum: TemplateCategory,
    description: 'Template category',
  })
  async findByCategory(
    @Param('workspaceId') workspaceId: string,
    @Param('category') category: TemplateCategory,
  ) {
    const templates = await this.templatesService.findByCategory(workspaceId, category);
    return { data: templates };
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a template by ID or slug' })
  @ApiResponse({
    status: 200,
    description: 'Template details',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async findOne(@Param('workspaceId') workspaceId: string, @Param('idOrSlug') idOrSlug: string) {
    const template = await this.templatesService.findOne(workspaceId, idOrSlug);
    return { data: template };
  }

  // ==================== CREATE TEMPLATE ====================

  @Post()
  @ApiOperation({ summary: 'Create a custom template' })
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
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    const template = await this.templatesService.create(workspaceId, createTemplateDto, userId);
    return { data: template };
  }

  // ==================== UPDATE TEMPLATE ====================

  @Patch(':templateId')
  @ApiOperation({ summary: 'Update a custom template' })
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
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    const template = await this.templatesService.update(
      workspaceId,
      templateId,
      updateTemplateDto,
      userId,
    );
    return { data: template };
  }

  // ==================== DELETE TEMPLATE ====================

  @Delete(':templateId')
  @ApiOperation({ summary: 'Delete a custom template' })
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
    await this.templatesService.delete(workspaceId, templateId, userId);
    return { message: 'Template deleted successfully' };
  }

  // ==================== CREATE PROJECT FROM TEMPLATE ====================

  @Post(':idOrSlug/create-project')
  @ApiOperation({ summary: 'Create a new project from a template' })
  @ApiResponse({
    status: 201,
    description: 'Project created from template successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async createProjectFromTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('idOrSlug') idOrSlug: string,
    @Body() createProjectDto: CreateProjectFromTemplateDto,
    @CurrentUser('sub') userId: string,
  ) {
    // Override templateId with the URL param
    createProjectDto.templateId = idOrSlug;
    const project = await this.templatesService.createProjectFromTemplate(
      workspaceId,
      createProjectDto,
      userId,
    );
    return { data: project };
  }

  // ==================== SEED SYSTEM TEMPLATES (Admin only) ====================

  @Post('seed')
  @ApiOperation({ summary: 'Seed system templates (admin operation)' })
  @ApiResponse({
    status: 200,
    description: 'System templates seeded successfully',
  })
  async seedSystemTemplates() {
    await this.templatesService.seedSystemTemplates();
    return { message: 'System templates seeded successfully' };
  }
}
