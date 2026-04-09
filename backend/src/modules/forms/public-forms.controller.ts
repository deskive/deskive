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
import { FormsService } from './forms.service';
import { FormResponsesService } from './form-responses.service';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { FormVerifySharePasswordDto } from './dto/form-share.dto';

@ApiTags('Public Forms')
@Controller('public/forms')
export class PublicFormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly responsesService: FormResponsesService,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get a public form by slug' })
  @ApiParam({ name: 'slug', description: 'Form slug' })
  @ApiResponse({ status: 200, description: 'Form retrieved successfully' })
  async getFormBySlug(@Param('slug') slug: string) {
    const form = await this.formsService.findBySlug(slug);
    return {
      data: form,
      message: 'Form retrieved successfully',
    };
  }

  @Post(':slug/responses')
  @ApiOperation({ summary: 'Submit a response to a public form' })
  @ApiParam({ name: 'slug', description: 'Form slug' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  async submitPublicResponse(
    @Param('slug') slug: string,
    @Body() dto: SubmitResponseDto,
    @Req() req: any,
  ) {
    const form = await this.formsService.findBySlug(slug);
    const response = await this.responsesService.submitResponse(
      form.id,
      dto,
      undefined, // No user ID for public submissions
      req.ip,
      req.get('user-agent'),
      form.workspaceId,
    );
    return {
      data: response,
      message: 'Response submitted successfully',
    };
  }

  @Get('share/:shareToken')
  @ApiOperation({ summary: 'Get a form via share link' })
  @ApiParam({ name: 'shareToken', description: 'Share link token' })
  @ApiResponse({ status: 200, description: 'Form retrieved successfully' })
  async getFormByShareToken(@Param('shareToken') shareToken: string) {
    const form = await this.formsService.findByShareToken(shareToken);
    return {
      data: form,
      message: 'Form retrieved successfully',
    };
  }

  @Post('share/:shareToken/responses')
  @ApiOperation({ summary: 'Submit a response via share link' })
  @ApiParam({ name: 'shareToken', description: 'Share link token' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  async submitShareResponse(
    @Param('shareToken') shareToken: string,
    @Body() dto: SubmitResponseDto,
    @Req() req: any,
  ) {
    const form = await this.formsService.findByShareToken(shareToken);
    const response = await this.responsesService.submitResponse(
      form.id,
      dto,
      undefined,
      req.ip,
      req.get('user-agent'),
      form.workspaceId,
    );

    // Increment share link response count
    // TODO: Update share link response count

    return {
      data: response,
      message: 'Response submitted successfully',
    };
  }

  @Post('share/:shareToken/verify')
  @ApiOperation({ summary: 'Verify password for a protected share link' })
  @ApiParam({ name: 'shareToken', description: 'Share link token' })
  @ApiResponse({ status: 200, description: 'Password verified successfully' })
  @HttpCode(HttpStatus.OK)
  async verifySharePassword(
    @Param('shareToken') shareToken: string,
    @Body() dto: FormVerifySharePasswordDto,
  ) {
    const isValid = await this.formsService.verifySharePassword(shareToken, dto.password);
    return {
      data: { valid: isValid },
      message: isValid ? 'Password verified successfully' : 'Invalid password',
    };
  }
}
