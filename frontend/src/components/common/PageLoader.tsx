/**
 * Page Loader Component
 * Used as Suspense fallback for lazy-loaded routes
 */

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Inline Page Loader - for use within layouts (no min-h-screen)
 */
export function InlinePageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
