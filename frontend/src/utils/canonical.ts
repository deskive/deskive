/**
 * Canonical URL Utilities
 * Generates canonical URLs for SEO purposes
 */

/**
 * Get the base URL for the site
 * Uses environment variable or defaults
 */
export function getBaseUrl(): string {
  // In production, use VITE_SITE_URL from environment
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL;
  }

  // In browser, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Fallback for SSR or build time
  return 'https://deskive.com';
}

/**
 * Clean and normalize a pathname
 * - Removes trailing slashes
 * - Removes duplicate slashes
 * - Ensures leading slash
 */
export function normalizePathname(pathname: string): string {
  // Remove trailing slash (except for root "/")
  let normalized = pathname.replace(/\/+$/, '') || '/';

  // Replace multiple slashes with single slash
  normalized = normalized.replace(/\/+/g, '/');

  // Ensure leading slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }

  return normalized;
}

/**
 * Get canonical URL for the current page
 * @param pathname - Optional pathname override (defaults to current location)
 * @param removeQueryParams - Whether to remove query parameters (default: true)
 * @returns Full canonical URL
 */
export function getCanonicalUrl(
  pathname?: string,
  removeQueryParams: boolean = true
): string {
  const baseUrl = getBaseUrl();

  // Get pathname from current location if not provided
  let path: string;
  if (pathname) {
    path = pathname;
  } else if (typeof window !== 'undefined') {
    path = window.location.pathname;
  } else {
    path = '/';
  }

  // Normalize the pathname
  path = normalizePathname(path);

  // Build canonical URL
  let canonicalUrl = `${baseUrl}${path}`;

  // Include query params if requested
  if (
    !removeQueryParams &&
    typeof window !== 'undefined' &&
    window.location.search
  ) {
    canonicalUrl += window.location.search;
  }

  return canonicalUrl;
}

/**
 * Check if a page needs a canonical tag
 * Some pages may not need canonical URLs (e.g., error pages, redirects)
 */
export function needsCanonical(pathname?: string): boolean {
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');

  // List of paths that don't need canonical tags
  const excludedPaths = [
    '/404',
    '/error',
    '/maintenance',
  ];

  // Check if current path is excluded
  return !excludedPaths.some((excluded) => path.startsWith(excluded));
}

/**
 * Check if URL has query parameters that should be preserved
 * Some query params are meaningful and should be in canonical URL
 */
export function hasImportantQueryParams(url?: string): boolean {
  if (!url && typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(
    url ? new URL(url).search : window.location.search
  );

  // List of query params that are meaningful for canonical URLs
  const importantParams = [
    'page',      // Pagination
    'category',  // Category filtering
    'tag',       // Tag filtering
    'sort',      // Sort order
  ];

  // Check if any important params exist
  for (const param of importantParams) {
    if (searchParams.has(param)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate canonical URL with smart query param handling
 * Removes tracking params but keeps important ones
 */
export function getSmartCanonicalUrl(pathname?: string): string {
  const baseUrl = getBaseUrl();
  const path = normalizePathname(
    pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')
  );

  // If no important query params, return clean URL
  if (!hasImportantQueryParams()) {
    return `${baseUrl}${path}`;
  }

  // Build URL with important params only
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const importantParams = new URLSearchParams();

    // Keep only important params
    const keysToKeep = ['page', 'category', 'tag', 'sort'];
    keysToKeep.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        importantParams.set(key, value);
      }
    });

    const queryString = importantParams.toString();
    return queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
  }

  return `${baseUrl}${path}`;
}

/**
 * Common canonical URLs for frequently used pages
 */
export const CANONICAL_URLS = {
  home: () => getCanonicalUrl('/'),
  login: () => getCanonicalUrl('/login'),
  register: () => getCanonicalUrl('/register'),
  pricing: () => getCanonicalUrl('/pricing'),
  about: () => getCanonicalUrl('/about'),
  contact: () => getCanonicalUrl('/contact'),
  blog: () => getCanonicalUrl('/blog'),
  blogPost: (slug: string) => getCanonicalUrl(`/blog/${slug}`),
  product: (slug: string) => getCanonicalUrl(`/products/${slug}`),
  feature: (slug: string) => getCanonicalUrl(`/features/${slug}`),
} as const;
