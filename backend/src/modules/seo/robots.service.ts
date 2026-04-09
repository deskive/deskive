/**
 * Robots.txt Service
 * Generates robots.txt file for search engine crawlers
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RobotsService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('SITE_URL') || 'https://deskive.com';
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    const robotsTxt = `# Deskive Robots.txt
# Allow all search engines to crawl public pages

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /workspace/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /auth/

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1

# Google-specific rules
User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /workspace/

# Bing-specific rules
User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /workspace/

# Block AI scrapers (optional)
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /
`;

    return robotsTxt;
  }

  /**
   * Generate robots.txt for development environment
   */
  generateDevRobotsTxt(): string {
    return `# Development Environment - Block all crawlers
User-agent: *
Disallow: /
`;
  }

  /**
   * Get appropriate robots.txt based on environment
   */
  getRobotsTxt(): string {
    const env = this.configService.get<string>('NODE_ENV');

    if (env === 'production') {
      return this.generateRobotsTxt();
    }

    return this.generateDevRobotsTxt();
  }
}
