/**
 * Sitemap URL DTO
 * Represents a single URL entry in the sitemap
 */

export class SitemapUrlDto {
  /** Full URL of the page */
  loc: string;

  /** Last modification date (ISO 8601 format) */
  lastmod?: string;

  /** Change frequency hint for search engines */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

  /** Priority of this URL relative to other URLs (0.0 - 1.0) */
  priority?: number;
}
