// src/lib/config.ts
export const API_CONFIG = {
  // Base URL without version
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3002',
  // API version path
  apiVersion: import.meta.env.VITE_API_VERSION || '/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,

  getApiUrl(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Construct full URL with base URL + API version + path
    return `${this.baseUrl}${this.apiVersion}/${cleanPath}`;
  }
};

export const QUERY_CONFIG = {
  staleTime: 60 * 1000, // 1 minute (default for all queries)
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  retry: 1,
};

export const SITE_CONFIG = {
  name: 'Deskive',
  description: 'All-in-One Workspace Platform',
  url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',

  // Open Graph Image
  ogImage: '/og_image.png', // 1200x630px recommended for social media

  // Social Media Links
  social: {
    twitter: 'https://x.com/deskive',
    facebook: 'https://www.deskive.com',
    // linkedin: 'https://www.linkedin.com/company/info-inlet',
    // github: 'https://github.com/deskive-com',
  },

  // Social Media Handles (for meta tags)
  socialHandles: {
    twitter: '@deskive',
  },
};