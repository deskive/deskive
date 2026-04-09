/**
 * Breadcrumb Schema Generator
 * For breadcrumb navigation structured data
 */

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbListSchema {
  '@context': string;
  '@type': string;
  itemListElement: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }>;
}

/**
 * Generate breadcrumb schema from array of items
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): BreadcrumbListSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://deskive.com';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}

/**
 * Generate breadcrumbs from URL path
 */
export function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://deskive.com';
  const parts = pathname.split('/').filter(part => part.length > 0);

  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: siteUrl },
  ];

  let currentPath = '';
  parts.forEach((part, index) => {
    currentPath += `/${part}`;

    // Convert URL slug to readable name
    const name = part
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbs.push({
      name,
      url: `${siteUrl}${currentPath}`,
    });
  });

  return breadcrumbs;
}

/**
 * Generate common breadcrumb paths for specific sections
 */
export const commonBreadcrumbs = {
  blog: (postTitle?: string): BreadcrumbItem[] => {
    const base: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
    ];

    if (postTitle) {
      base.push({ name: postTitle, url: window.location.pathname });
    }

    return base;
  },

  products: (productName?: string): BreadcrumbItem[] => {
    const base: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      { name: 'Products', url: '/products' },
    ];

    if (productName) {
      base.push({ name: productName, url: window.location.pathname });
    }

    return base;
  },

  features: (featureName?: string): BreadcrumbItem[] => {
    const base: BreadcrumbItem[] = [
      { name: 'Home', url: '/' },
      { name: 'Features', url: '/features' },
    ];

    if (featureName) {
      base.push({ name: featureName, url: window.location.pathname });
    }

    return base;
  },

  company: (pageName: string): BreadcrumbItem[] => {
    return [
      { name: 'Home', url: '/' },
      { name: 'Company', url: '/company' },
      { name: pageName, url: window.location.pathname },
    ];
  },
};
