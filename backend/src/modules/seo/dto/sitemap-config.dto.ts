/**
 * Sitemap Configuration DTO
 * Configuration options for sitemap generation
 */

export class SitemapConfigDto {
  /** Base URL of the website */
  baseUrl: string;

  /** Whether to include blog posts in sitemap */
  includeBlogPosts?: boolean;

  /** Whether to include product pages in sitemap */
  includeProducts?: boolean;

  /** Whether to include feature pages in sitemap */
  includeFeatures?: boolean;

  /** Maximum number of URLs per sitemap file (default: 50000) */
  maxUrls?: number;
}
