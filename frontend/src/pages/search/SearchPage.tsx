/**
 * Search Page
 * Main search interface page
 */

import { UniversalSearchView } from '../../components/search/UniversalSearchView';

export function SearchPage() {
  return (
    <div className="h-full flex flex-col bg-background">
      <UniversalSearchView />
    </div>
  );
}
