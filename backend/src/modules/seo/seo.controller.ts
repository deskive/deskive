/**
 * SEO Controller
 * Handles sitemap.xml, robots.txt, and RSS/Atom feed requests
 */

import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SitemapService } from './sitemap.service';
import { RobotsService } from './robots.service';
import { FeedService } from './feed.service';

@Controller()
export class SeoController {
  constructor(
    private readonly sitemapService: SitemapService,
    private readonly robotsService: RobotsService,
    private readonly feedService: FeedService,
  ) {}

  /**
   * GET /sitemap.xml
   * Returns the complete sitemap
   */
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async getSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemap();
    return res.send(sitemap);
  }

  /**
   * GET /sitemap-static.xml
   * Returns sitemap for static pages
   */
  @Get('sitemap-static.xml')
  @Header('Content-Type', 'application/xml')
  async getStaticSitemap(@Res() res: Response) {
    const sitemap = await this.sitemapService.generateSitemap({
      baseUrl: '',
      includeProducts: true,
      includeFeatures: true,
    });
    return res.send(sitemap);
  }

  /**
   * GET /sitemap-index.xml
   * Returns sitemap index (combines multiple sitemaps)
   */
  @Get('sitemap-index.xml')
  @Header('Content-Type', 'application/xml')
  async getSitemapIndex(@Res() res: Response) {
    const sitemapIndex = await this.sitemapService.generateSitemapIndex();
    return res.send(sitemapIndex);
  }

  /**
   * GET /robots.txt
   * Returns robots.txt file
   */
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobotsTxt(@Res() res: Response) {
    const robotsTxt = this.robotsService.getRobotsTxt();
    return res.send(robotsTxt);
  }

  // Blog RSS feeds removed - will be implemented separately

  /**
   * GET /changelog/feed.xml
   * Returns RSS 2.0 feed for changelog/product updates
   */
  @Get('changelog/feed.xml')
  @Header('Content-Type', 'application/rss+xml')
  async getChangelogRSS(@Res() res: Response) {
    const rss = await this.feedService.generateChangelogRSS();
    return res.send(rss);
  }
}
