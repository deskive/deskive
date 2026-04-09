/**
 * WebSite Schema with SearchAction
 * Enables Google search box in search results
 */

export interface WebSiteSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    '@type': string;
    target: {
      '@type': string;
      urlTemplate: string;
    };
    'query-input': string;
  };
}

/**
 * Generate WebSite schema with search functionality
 */
export function generateWebsiteSchema(): WebSiteSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://deskive.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Deskive',
    url: siteUrl,
    description: 'All-in-one workspace platform for team collaboration, project management, and productivity.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/blog/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
