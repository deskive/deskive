/**
 * File Breadcrumbs Component
 * Navigation breadcrumbs for file explorer
 */

import React from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface Breadcrumb {
  id: string | null;
  name: string;
}

interface FileBreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (folderId: string | null) => void;
}

export function FileBreadcrumbs({ breadcrumbs, onNavigate }: FileBreadcrumbsProps) {
  // Debug logging
  React.useEffect(() => {
    console.log('🗺️ Breadcrumbs component render:', breadcrumbs.map(b => b.name).join(' > '));
  });

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 hover:bg-muted"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4" />
      </Button>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id || 'root'}>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 hover:bg-muted ${
              index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : ''
            }`}
            onClick={() => onNavigate(crumb.id)}
          >
            {crumb.name}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}
