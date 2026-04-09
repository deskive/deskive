/**
 * OptimizedImage Component
 * Optimized image component with lazy loading, error handling, and SEO best practices
 */

import { useState, useEffect, type ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** Image source URL */
  src: string;
  /** Alt text (required for SEO) */
  alt: string;
  /** Fallback image if src fails to load */
  fallback?: string;
  /** Width in pixels (recommended for CLS prevention) */
  width?: number;
  /** Height in pixels (recommended for CLS prevention) */
  height?: number;
  /** Enable lazy loading (default: true) */
  lazy?: boolean;
  /** CSS class name */
  className?: string;
  /** Image loading priority */
  priority?: 'high' | 'low' | 'auto';
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * OptimizedImage Component
 *
 * Features:
 * - Lazy loading by default
 * - Error handling with fallback
 * - Width/height for CLS prevention
 * - SEO-friendly alt text
 * - Loading states
 */
export function OptimizedImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  width,
  height,
  lazy = true,
  className = '',
  priority = 'auto',
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
      setHasError(true);
      onError?.();
    }
    setIsLoading(false);
  };

  // Build style object for dimensions
  const dimensionStyles: React.CSSProperties = {};
  if (width) dimensionStyles.width = width;
  if (height) dimensionStyles.height = height;

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      fetchPriority={priority}
      onLoad={handleLoad}
      onError={handleError}
      className={`${className} ${isLoading ? 'opacity-0 transition-opacity duration-300' : 'opacity-100'} ${hasError ? 'grayscale' : ''}`}
      style={dimensionStyles}
      {...props}
    />
  );
}

/**
 * Default fallback placeholder
 * Can be used when no image is available
 */
export const DEFAULT_PLACEHOLDER = '/images/placeholder.png';

/**
 * Common image sizes for Deskive platform
 */
export const IMAGE_SIZES = {
  avatar: { width: 40, height: 40 },
  avatarLarge: { width: 80, height: 80 },
  thumbnail: { width: 150, height: 150 },
  card: { width: 300, height: 200 },
  hero: { width: 1200, height: 600 },
  og: { width: 1200, height: 630 },
  logo: { width: 200, height: 50 },
} as const;
