import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { SignDocumentDto, DeclineDocumentDto } from './dto';
import { Request } from 'express';

/**
 * External controller for document signing
 * These endpoints are public (no auth) and accessed via access token
 */
@ApiTags('Document Signing (External)')
@Controller('d')
export class ExternalDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Get document for signing via access token
   */
  @Get(':accessToken')
  @ApiOperation({ summary: 'View document for signing (external recipient)' })
  @ApiParam({ name: 'accessToken', description: 'Recipient access token' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invalid access token or document not found' })
  async viewDocument(@Param('accessToken') accessToken: string) {
    const result = await this.documentsService.getDocumentByAccessToken(accessToken);

    // Don't expose internal tokens in response
    const { accessToken: _, ...recipientWithoutToken } = result.recipient as any;

    return {
      data: {
        document: result.document,
        recipient: recipientWithoutToken,
      },
      message: 'Document retrieved successfully',
    };
  }

  /**
   * Get HTML preview for external recipient
   */
  @Get(':accessToken/preview')
  @ApiOperation({ summary: 'Get HTML preview for signing (external recipient)' })
  @ApiParam({ name: 'accessToken', description: 'Recipient access token' })
  @ApiResponse({ status: 200, description: 'Preview retrieved successfully' })
  async getPreview(@Param('accessToken') accessToken: string) {
    const { document, recipient } = await this.documentsService.getDocumentByAccessToken(accessToken);

    // Generate preview HTML
    const html = await this.documentsService.getPreview(document.workspaceId, document.id);

    return {
      data: { html },
      message: 'Preview retrieved successfully',
    };
  }

  /**
   * Submit signature
   */
  @Post(':accessToken/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit signature for document' })
  @ApiParam({ name: 'accessToken', description: 'Recipient access token' })
  @ApiResponse({ status: 200, description: 'Signature submitted successfully' })
  @ApiResponse({ status: 400, description: 'Document not available for signing' })
  async signDocument(
    @Param('accessToken') accessToken: string,
    @Body() dto: SignDocumentDto,
    @Req() req: Request,
  ) {
    // Get recipient by access token
    const recipient = await this.documentsService.getRecipientByAccessToken(accessToken);

    // Get IP address
    const ipAddress = this.getClientIp(req);

    const signature = await this.documentsService.submitSignature(
      recipient.id,
      dto,
      ipAddress,
    );

    return {
      data: signature,
      message: 'Document signed successfully',
    };
  }

  /**
   * Decline to sign
   */
  @Post(':accessToken/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline to sign document' })
  @ApiParam({ name: 'accessToken', description: 'Recipient access token' })
  @ApiResponse({ status: 200, description: 'Document declined' })
  async declineDocument(
    @Param('accessToken') accessToken: string,
    @Body() dto: DeclineDocumentDto,
    @Req() req: Request,
  ) {
    // Get recipient by access token
    const recipient = await this.documentsService.getRecipientByAccessToken(accessToken);

    // Get IP address
    const ipAddress = this.getClientIp(req);

    await this.documentsService.declineDocument(recipient.id, dto, ipAddress);

    return {
      message: 'Document declined successfully',
    };
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
      return ips.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
