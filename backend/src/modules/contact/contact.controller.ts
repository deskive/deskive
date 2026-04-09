import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ContactFormDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit contact form' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid form data' })
  @ApiResponse({ status: 500, description: 'Failed to send message' })
  async submitContactForm(@Body() dto: ContactFormDto) {
    try {
      return await this.contactService.sendContactEmail(dto);
    } catch (error) {
      throw new BadRequestException('Failed to send your message. Please try again later.');
    }
  }
}
