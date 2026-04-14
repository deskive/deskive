/**
 * SEO Module
 * Provides sitemap, robots.txt, metadata, RSS/Atom feeds, and slug utilities
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SeoController } from './seo.controller';
import { MetadataController } from './metadata.controller';
import { SitemapService } from './sitemap.service';
import { RobotsService } from './robots.service';
import { MetadataService } from './metadata.service';
import { FeedService } from './feed.service';
import { SlugService } from './slug.service';

@Module({
  imports: [ConfigModule],
  controllers: [SeoController, MetadataController],
  providers: [SitemapService, RobotsService, MetadataService, FeedService, SlugService],
  exports: [SitemapService, RobotsService, MetadataService, FeedService, SlugService],
})
export class SeoModule {}
