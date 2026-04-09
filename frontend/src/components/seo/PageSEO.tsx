import { SEOHead } from './SEOHead';
import type { SEOHeadProps } from './SEOHead';
import { StructuredData } from './StructuredData';

export interface PageSEOProps extends SEOHeadProps {
  structuredData?: Record<string, any> | Record<string, any>[];
}

export function PageSEO({ structuredData, ...seoProps }: PageSEOProps) {
  return (
    <>
      <SEOHead {...seoProps} />
      {structuredData && <StructuredData data={structuredData} />}
    </>
  );
}
