import { Helmet } from '@dr.pogodin/react-helmet';
import { getSmartCanonicalUrl, getBaseUrl } from '../../utils/canonical';
import { SITE_CONFIG } from '../../lib/config';

export interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export function SEOHead({
  title,
  description,
  canonical,
  ogImage = '/og_image.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  keywords = [],
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
  nofollow = false,
}: SEOHeadProps) {
  const siteUrl = getBaseUrl();
  const fullTitle = title && title.includes('Deskive') ? title : `${title || 'Page'} | Deskive`;
  // Auto-generate canonical URL if not provided, with smart query param handling
  const canonicalUrl = canonical || getSmartCanonicalUrl();
  const ogImageUrl = ogImage?.startsWith('http') ? ogImage : `${siteUrl}${ogImage || '/og-image.png'}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      {author && <meta name="author" content={author} />}

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {(noindex || nofollow) && (
        <meta
          name="robots"
          content={`${noindex ? 'noindex' : 'index'},${nofollow ? 'nofollow' : 'follow'}`}
        />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Deskive" />
      <meta property="og:locale" content="en_US" />
      {/* Facebook Page link */}
      <meta property="article:publisher" content={SITE_CONFIG.social.facebook} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter / X */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:site" content={SITE_CONFIG.socialHandles.twitter} />
      <meta name="twitter:creator" content={SITE_CONFIG.socialHandles.twitter} />
    </Helmet>
  );
}
