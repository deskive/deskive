/**
 * Sitemap Service
 * Generates XML sitemaps for search engines
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SitemapUrlDto } from './dto/sitemap-url.dto';
import { SitemapConfigDto } from './dto/sitemap-config.dto';

@Injectable()
export class SitemapService {
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SITE_URL') || 'https://deskive.com';
  }

  /**
   * Generate complete sitemap XML
   */
  async generateSitemap(config?: SitemapConfigDto): Promise<string> {
    const urls: SitemapUrlDto[] = [];

    // Add static pages
    urls.push(...this.getStaticPages());

    // Add product pages
    if (config?.includeProducts !== false) {
      urls.push(...this.getProductPages());
    }

    // Add feature pages
    if (config?.includeFeatures !== false) {
      urls.push(...this.getFeaturePages());
    }

    // Convert URLs to XML
    return this.buildXML(urls);
  }

  /**
   * Get static pages URLs
   */
  private getStaticPages(): SitemapUrlDto[] {
    const now = new Date().toISOString();

    return [
      {
        loc: `${this.baseUrl}/`,
        lastmod: now,
        changefreq: 'daily',
        priority: 1.0,
      },
      {
        loc: `${this.baseUrl}/pricing`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.9,
      },
      {
        loc: `${this.baseUrl}/about`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      },
      {
        loc: `${this.baseUrl}/contact`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.7,
      },
      {
        loc: `${this.baseUrl}/privacy`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: `${this.baseUrl}/terms`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        loc: `${this.baseUrl}/cookies`,
        lastmod: now,
        changefreq: 'monthly',
        priority: 0.5,
      },
    ];
  }

  /**
   * Get product pages URLs
   */
  private getProductPages(): SitemapUrlDto[] {
    const now = new Date().toISOString();
    const products = ['chat', 'projects', 'files', 'calendar', 'notes', 'video-calls'];

    return products.map((product) => ({
      loc: `${this.baseUrl}/products/${product}`,
      lastmod: now,
      changefreq: 'weekly' as const,
      priority: 0.8,
    }));
  }

  /**
   * Get feature pages URLs
   */
  private getFeaturePages(): SitemapUrlDto[] {
    const now = new Date().toISOString();
    const features = [
      'ai-chat',
      'analytics',
      'automation',
      'calendar',
      'integrations',
      'monitoring',
      'notes',
      'projects',
      'teams',
      'video-calls',
    ];

    return features.map((feature) => ({
      loc: `${this.baseUrl}/features/${feature}`,
      lastmod: now,
      changefreq: 'monthly' as const,
      priority: 0.6,
    }));
  }

  /**
   * Build XML sitemap from URLs
   */
  private buildXML(urls: SitemapUrlDto[]): string {
    const urlEntries = urls
      .map((url) => {
        let entry = `  <url>\n    <loc>${this.escapeXML(url.loc)}</loc>\n`;

        if (url.lastmod) {
          entry += `    <lastmod>${url.lastmod}</lastmod>\n`;
        }

        if (url.changefreq) {
          entry += `    <changefreq>${url.changefreq}</changefreq>\n`;
        }

        if (url.priority !== undefined) {
          entry += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
        }

        entry += `  </url>`;
        return entry;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate sitemap index (for multiple sitemaps)
   */
  async generateSitemapIndex(): Promise<string> {
    const sitemaps = [
      {
        loc: `${this.baseUrl}/sitemap-static.xml`,
        lastmod: new Date().toISOString(),
      },
      // Blog sitemap removed - will be added when blog module is implemented
    ];

    const sitemapEntries = sitemaps
      .map(
        (sitemap) => `  <sitemap>
    <loc>${this.escapeXML(sitemap.loc)}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
  }
}
