/**
 * Product Schema (SoftwareApplication)
 * For product pages and feature pages
 */

export interface ProductData {
  name: string;
  description: string;
  category: string;
  image?: string;
  url: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  features?: string[];
}

export interface SoftwareApplicationSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  applicationCategory: string;
  operatingSystem?: string;
  image?: string;
  url: string;
  offers?: {
    '@type': string;
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  featureList?: string | string[];
  softwareVersion?: string;
  applicationSubCategory?: string;
}

/**
 * Generate SoftwareApplication schema for Deskive products
 */
export function generateProductSchema(product: ProductData): SoftwareApplicationSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://deskive.com';

  const schema: SoftwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.name,
    description: product.description,
    applicationCategory: product.category || 'BusinessApplication',
    operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
    image: product.image || `${siteUrl}/og-default.png`,
    url: product.url,
  };

  // Add pricing information if available
  if (product.offers) {
    schema.offers = {
      '@type': 'Offer',
      ...product.offers,
      availability: product.offers.availability || 'https://schema.org/InStock',
    };
  }

  // Add aggregate rating if available
  if (product.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.aggregateRating.ratingValue,
      reviewCount: product.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Add feature list if available
  if (product.features && product.features.length > 0) {
    schema.featureList = product.features;
  }

  return schema;
}

/**
 * Generate schema for main Deskive platform
 */
export function generateDeskiveProductSchema(): SoftwareApplicationSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://deskive.com';

  return generateProductSchema({
    name: 'Deskive',
    description: 'All-in-one workspace platform for team collaboration, project management, file sharing, video calls, and productivity tools.',
    category: 'BusinessApplication',
    image: `${siteUrl}/logo.png`,
    url: siteUrl,
    offers: {
      price: '29.00',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      ratingValue: 4.8,
      reviewCount: 1250,
    },
    features: [
      'Team Chat & Messaging',
      'Project Management',
      'File Storage & Sharing',
      'Calendar & Scheduling',
      'Video Conferencing',
      'AI Assistant',
      'Notes & Documentation',
      'Analytics & Reporting',
    ],
  });
}
