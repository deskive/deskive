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
import { SignaturesService } from './signatures.service';
import { CreateSignatureDto, UpdateSignatureDto, SignatureQueryDto } from './dto';

@ApiTags('Signatures')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/signatures')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all signatures for the current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Signatures retrieved successfully' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query() query: SignatureQueryDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const signatures = await this.signaturesService.findAll(
      workspaceId,
      userId,
      query.includeDeleted,
    );
    return {
      data: signatures,
      message: 'Signatures retrieved successfully',
    };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default signature for the current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Default signature retrieved' })
  async findDefault(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.userId;
    const signature = await this.signaturesService.findDefault(workspaceId, userId);
    return {
      data: signature,
      message: signature ? 'Default signature retrieved' : 'No default signature set',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new signature' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Signature created successfully' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSignatureDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const signature = await this.signaturesService.create(workspaceId, dto, userId);
    return {
      data: signature,
      message: 'Signature created successfully',
    };
  }

  @Get(':signatureId')
  @ApiOperation({ summary: 'Get a signature by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'signatureId', description: 'Signature ID' })
  @ApiResponse({ status: 200, description: 'Signature retrieved successfully' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('signatureId') signatureId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const signature = await this.signaturesService.findOne(workspaceId, signatureId, userId);
    return {
      data: signature,
      message: 'Signature retrieved successfully',
    };
  }

  @Patch(':signatureId')
  @ApiOperation({ summary: 'Update a signature' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'signatureId', description: 'Signature ID' })
  @ApiResponse({ status: 200, description: 'Signature updated successfully' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('signatureId') signatureId: string,
    @Body() dto: UpdateSignatureDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const signature = await this.signaturesService.update(workspaceId, signatureId, dto, userId);
    return {
      data: signature,
      message: 'Signature updated successfully',
    };
  }

  @Post(':signatureId/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a signature as default' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'signatureId', description: 'Signature ID' })
  @ApiResponse({ status: 200, description: 'Default signature set successfully' })
  async setDefault(
    @Param('workspaceId') workspaceId: string,
    @Param('signatureId') signatureId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const signature = await this.signaturesService.setDefault(workspaceId, signatureId, userId);
    return {
      data: signature,
      message: 'Default signature set successfully',
    };
  }

  @Delete(':signatureId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a signature' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'signatureId', description: 'Signature ID' })
  @ApiResponse({ status: 204, description: 'Signature deleted successfully' })
  async delete(
    @Param('workspaceId') workspaceId: string,
    @Param('signatureId') signatureId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.signaturesService.delete(workspaceId, signatureId, userId);
  }
}
