/**
 * Article Schema Generator
 * For blog posts and article pages
 */

export interface ArticleAuthor {
  name: string;
  avatar?: string;
  bio?: string;
}

export interface ArticleData {
  title: string;
  excerpt: string;
  content: string;
  author: ArticleAuthor;
  publishedAt: string;
  updatedAt?: string;
  featuredImage?: string;
  tags?: Array<{ name: string }>;
  slug: string;
}

export interface ArticleSchema {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author: {
    '@type': string;
    name: string;
    image?: string;
    description?: string;
  };
  publisher: {
    '@type': string;
    name: string;
    logo: {
      '@type': string;
      url: string;
    };
  };
  mainEntityOfPage: {
    '@type': string;
    '@id': string;
  };
  keywords?: string;
  articleBody?: string;
  wordCount?: number;
}

/**
 * Generate Article schema for blog posts
 */
export function generateArticleSchema(article: ArticleData): ArticleSchema {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://deskive.com';
  const articleUrl = `${siteUrl}/blog/${article.slug}`;

  // Calculate word count
  const wordCount = article.content
    ? article.content.split(/\s+/).filter(word => word.length > 0).length
    : 0;

  // Extract keywords from tags
  const keywords = article.tags?.map(tag => tag.name).join(', ');

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.featuredImage || `${siteUrl}/og-default.png`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.author.name,
      image: article.author.avatar,
      description: article.author.bio,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Deskive',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    keywords,
    articleBody: article.content,
    wordCount,
  };
}

/**
 * Generate BlogPosting schema (alternative to Article)
 */
export function generateBlogPostingSchema(article: ArticleData): ArticleSchema {
  const schema = generateArticleSchema(article);
  return {
    ...schema,
    '@type': 'BlogPosting',
  };
}
