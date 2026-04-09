/**
 * deskive Analytics Integration for Deskive
 *
 * Lightweight, privacy-first analytics similar to Plausible/Umami
 * Uses a simple script tag approach - no SDK required
 *
 * Usage:
 * <script defer data-api-key="anon_xxx" src="https://api.deskive.com/js/analytics.js"></script>
 */

import { useEffect } from 'react';

// Get configuration from environment
const deskive_API_KEY = import.meta.env.VITE_deskive_ANON_KEY || '';
const deskive_API_URL = import.meta.env.VITE_deskive_API_URL || 'https://api.deskive.com';

// Check if analytics is enabled
const isAnalyticsEnabled = (): boolean => {
  return Boolean(deskive_API_KEY && deskive_API_KEY.startsWith('anon_'));
};

interface deskiveAnalyticsProps {
  debug?: boolean;
}

/**
 * deskive Analytics Component
 *
 * Drop-in component that loads deskive Analytics script
 * Place in App.tsx to enable tracking
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { deskiveAnalytics } from './components/analytics/deskiveAnalytics';
 *
 * function App() {
 *   return (
 *     <>
 *       <deskiveAnalytics debug={process.env.NODE_ENV === 'development'} />
 *       <Routes>...</Routes>
 *     </>
 *   );
 * }
 * ```
 */
export const deskiveAnalytics: React.FC<deskiveAnalyticsProps> = ({ debug = false }) => {
  useEffect(() => {
    // Skip if API key is not configured
    if (!isAnalyticsEnabled()) {
      if (debug) {
        console.log('[deskive Analytics] Not configured - set VITE_deskive_ANON_KEY');
      }
      return;
    }

    // Check if script is already loaded (persists across StrictMode remounts)
    const existingScript = document.getElementById('deskive-analytics-script');
    if (existingScript) {
      if (debug) {
        console.log('[deskive Analytics] Script already loaded');
      }
      return;
    }

    // Create and inject the script tag
    const script = document.createElement('script');
    script.id = 'deskive-analytics-script';
    script.defer = true;
    script.src = `${deskive_API_URL}/js/analytics.js`;
    script.setAttribute('data-api-key', deskive_API_KEY);
    script.setAttribute('data-api-url', deskive_API_URL);
    if (debug) {
      script.setAttribute('data-debug', 'true');
    }

    if (debug) {
      console.log('[deskive Analytics] Initializing with API URL:', deskive_API_URL);
    }

    script.onload = () => {
      if (debug) {
        console.log('[deskive Analytics] Script loaded successfully');
      }
    };

    script.onerror = (e) => {
      console.error('[deskive Analytics] Failed to load script', e);
    };

    document.head.appendChild(script);

    // No cleanup - let the script persist for the app lifetime
    // This prevents issues with React StrictMode double-mounting
  }, [debug]);

  // This component doesn't render anything
  return null;
};

// Global deskive interface (set by analytics.js script)
declare global {
  interface Window {
    deskive?: {
      track: (eventName: string, properties?: Record<string, any>) => void;
      pageview: () => void;
    };
  }
}

/**
 * Track a custom event
 *
 * @example
 * ```tsx
 * trackdeskiveEvent('signup_started', { plan: 'pro' });
 * ```
 */
export const trackdeskiveEvent = (
  eventName: string,
  properties?: Record<string, any>
): void => {
  if (window.deskive) {
    window.deskive.track(eventName, properties);
  }
};

/**
 * Track page view manually (usually auto-tracked)
 */
export const trackdeskivePageView = (): void => {
  if (window.deskive) {
    window.deskive.pageview();
  }
};

/**
 * Hook to access deskive Analytics
 * Returns the global deskive object if available
 */
export const usedeskiveAnalytics = () => {
  return window.deskive || null;
};

export default deskiveAnalytics;
