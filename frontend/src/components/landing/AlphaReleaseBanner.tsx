/**
 * AlphaReleaseBanner Component
 * Warning banner for alpha pre-release status
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AlphaReleaseBanner: React.FC = () => {
  return (
    <div className="w-full bg-red-50 border-b border-red-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm sm:text-base text-red-700 font-medium text-center">
            <span className="font-bold">Alpha Pre-Release:</span> User data may be lost or removed without notice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlphaReleaseBanner;
export { AlphaReleaseBanner };
