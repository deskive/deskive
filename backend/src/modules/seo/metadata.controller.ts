/**
 * Metadata Controller
 * Provides SEO metadata endpoints for dynamic content
 */

import { Controller } from '@nestjs/common';
import { MetadataService } from './metadata.service';

@Controller('seo/metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  // Blog-related endpoints removed - will be implemented separately
}
