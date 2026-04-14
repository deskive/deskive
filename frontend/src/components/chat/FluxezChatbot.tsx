/**
 * deskive Chatbot Integration for Deskive
 *
 * Lightweight chatbot widget that loads via a simple script tag approach
 * Similar to deskiveAnalytics - no SDK required
 *
 * Usage:
 * <script defer data-api-key="anon_xxx" src="https://api.deskive.com/js/chatbot.js"></script>
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Get configuration from environment
const deskive_API_KEY = import.meta.env.VITE_deskive_ANON_KEY || '';
const deskive_API_URL = import.meta.env.VITE_deskive_API_URL || 'https://api.deskive.com';

// Check if chatbot is enabled
const isChatbotEnabled = (): boolean => {
  return Boolean(deskive_API_KEY && deskive_API_KEY.startsWith('anon_'));
};

// Public pages where chatbot should be shown
const PUBLIC_PATHS = [
  '/',
  '/home',
  '/pricing',
  '/downloads',
  '/products',
  '/features',
  '/privacy',
  '/terms',
  '/cookies',
  '/data-deletion',
  '/careers',
  '/press',
  '/changelog',
  '/support',
];

// Internal paths where chatbot should be hidden
const INTERNAL_PATH_PREFIXES = [
  '/workspaces',
  '/dashboard',
  '/blog',
  '/settings',
  '/profile',
  '/admin',
  '/call',
  '/video',
  '/incoming-call',
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// Check if current path is a public page
const isPublicPage = (pathname: string): boolean => {
  // First check if it's an internal path - always hide
  if (INTERNAL_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return false;
  }
  // Exact matches or starts with public paths
  return PUBLIC_PATHS.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  );
};

interface deskiveChatbotProps {
  debug?: boolean;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  greeting?: string;
  placeholder?: string;
}

/**
 * deskive Chatbot Component
 *
 * Drop-in component that loads deskive Chatbot script
 * Place in App.tsx to enable the chat widget
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { deskiveChatbot } from './components/chat/deskiveChatbot';
 *
 * function App() {
 *   return (
 *     <>
 *       <deskiveChatbot
 *         debug={process.env.NODE_ENV === 'development'}
 *         position="bottom-right"
 *         primaryColor="#8B5CF6"
 *         greeting="Hi! How can I help you today?"
 *       />
 *       <Routes>...</Routes>
 *     </>
 *   );
 * }
 * ```
 */
export const DeskiveChatbot: React.FC<deskiveChatbotProps> = ({
  debug = false,
  position = 'bottom-right',
  primaryColor = '#2563EB',
  greeting = 'Hi! How can I help you today?',
  placeholder = 'Type your message...',
}) => {
  const location = useLocation();

  useEffect(() => {
    // Skip if API key is not configured
    if (!isChatbotEnabled()) {
      if (debug) {
        console.log('[deskive Chatbot] Not configured - set VITE_deskive_ANON_KEY');
      }
      return;
    }

    const shouldShow = isPublicPage(location.pathname);

    // Always aggressively close and hide the chatbot first
    if (window.deskiveChatbot) {
      try {
        window.deskiveChatbot.close();
      } catch (e) {
        if (debug) console.error('[deskive Chatbot] Error closing:', e);
      }
    }

    // Hide all chatbot elements (only used on internal pages)
    const hideAllChatbotElements = () => {
      // Hide everything on internal pages
      const selectors = [
        '#deskive-chatbot-widget',
        '#deskive-chatbot',
        '#deskive-chatbot-container',
        '#deskive-chat-widget',
        '[id*="deskive-chat"]',
        '[class*="deskive-chat"]',
        '[class*="chatbot-widget"]',
        '[class*="chatbot-container"]',
        'iframe[src*="deskive"]',
        'iframe[src*="chatbot"]',
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const htmlEl = el as HTMLElement;
          // Don't hide the script tag
          if (!htmlEl.id || !htmlEl.id.includes('script')) {
            htmlEl.style.display = 'none';
            htmlEl.style.visibility = 'hidden';
            htmlEl.style.opacity = '0';
            htmlEl.style.pointerEvents = 'none';
          }
        });
      });
    };

    // Hide or show chatbot based on page type
    if (!shouldShow) {
      if (debug) {
        console.log('[deskive Chatbot] Hidden on internal page:', location.pathname);
      }
      hideAllChatbotElements();
      return;
    }

    // Show chatbot on public pages (but keep dialog closed, only show button)
    if (debug) {
      console.log('[deskive Chatbot] Showing on public page:', location.pathname);
    }

    // Check if script is already loaded (persists across StrictMode remounts)
    const existingScript = document.getElementById('deskive-chatbot-script');

    // ALWAYS restore visibility when on public page, even if script exists
    // This fixes the issue where bot doesn't show when navigating from internal to public pages
    setTimeout(() => {
      const widgetButtons = document.querySelectorAll(
        '#deskive-chatbot-widget, #deskive-chatbot-button, [class*="chatbot-button"], [class*="chatbot-launcher"]'
      );

      widgetButtons.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.removeProperty('display');
        htmlEl.style.removeProperty('visibility');
        htmlEl.style.removeProperty('opacity');
        htmlEl.style.removeProperty('pointer-events');
      });

      // But keep dialog/container closed
      const dialogs = document.querySelectorAll(
        '[class*="chatbot-dialog"], [class*="chatbot-container"], [class*="chat-window"]'
      );

      dialogs.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.classList.remove('open', 'expanded', 'visible');
      });
    }, 100);

    if (existingScript) {
      if (debug) {
        console.log('[deskive Chatbot] Script already loaded, visibility restored');
      }
      return;
    }

    // Create and inject the script tag
    const script = document.createElement('script');
    script.id = 'deskive-chatbot-script';
    script.defer = true;
    script.src = `${deskive_API_URL}/js/chatbot.js`;
    script.setAttribute('data-api-key', deskive_API_KEY);
    script.setAttribute('data-api-url', deskive_API_URL);
    script.setAttribute('data-position', position);
    script.setAttribute('data-primary-color', primaryColor);
    script.setAttribute('data-greeting', greeting);
    script.setAttribute('data-placeholder', placeholder);
    if (debug) {
      script.setAttribute('data-debug', 'true');
    }

    if (debug) {
      console.log('[deskive Chatbot] Initializing with API URL:', deskive_API_URL);
    }

    script.onload = () => {
      if (debug) {
        console.log('[deskive Chatbot] Script loaded successfully');
      }

      // Force close chatbot on load (prevent auto-open)
      setTimeout(() => {
        if (window.deskiveChatbot) {
          window.deskiveChatbot.close();
          if (debug) {
            console.log('[deskive Chatbot] Forced closed on load');
          }
        }
      }, 100);

      // Additional force close after a delay
      setTimeout(() => {
        if (window.deskiveChatbot) {
          window.deskiveChatbot.close();
        }
      }, 500);

      // Aggressive close button handling - use event delegation
      const handleCloseClick = (e: Event) => {
        const target = e.target as HTMLElement;

        // Check if clicked element or its parents are close buttons
        if (
          target.matches('button, [role="button"], svg, path') &&
          (
            target.closest('[class*="close"]') ||
            target.closest('[aria-label*="close" i]') ||
            target.closest('button[class*="chatbot"]') ||
            target.textContent?.includes('×') ||
            target.innerHTML?.includes('×')
          )
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (window.deskiveChatbot) {
            window.deskiveChatbot.close();
            if (debug) {
              console.log('[deskive Chatbot] Closed via button click');
            }
          }

          // Only hide the dialog/window, NOT the button
          document.querySelectorAll('[class*="chatbot-dialog"], [class*="chatbot-window"], [class*="chat-container"]:not([class*="button"])').forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.display = 'none';
            htmlEl.classList.remove('open', 'expanded', 'visible');
          });
        }
      };

      // Add event listener to document for close buttons
      document.addEventListener('click', handleCloseClick, true);
      document.addEventListener('mousedown', handleCloseClick, true);

      // Monitor for unexpected auto-opening and force close
      let lastClosedTime = Date.now();
      const observer = new MutationObserver(() => {
        const now = Date.now();

        // Only check if not recently closed (prevent infinite loop)
        if (now - lastClosedTime < 500) return;

        // Check if chatbot dialog/container is open/visible
        const chatbotContainers = document.querySelectorAll(
          '[class*="chatbot-container"], [class*="chatbot-dialog"], [id*="chatbot-dialog"], ' +
          '[class*="deskive-chat-container"], [class*="deskive-chat-widget"]'
        );

        chatbotContainers.forEach(container => {
          const htmlEl = container as HTMLElement;
          const isVisible = (
            htmlEl.style.display !== 'none' &&
            htmlEl.style.visibility !== 'hidden' &&
            (htmlEl.classList.contains('open') ||
             htmlEl.classList.contains('expanded') ||
             htmlEl.classList.contains('visible'))
          );

          // If it's visible but we're on internal page, aggressively close
          if (isVisible && !isPublicPage(window.location.pathname)) {
            if (window.deskiveChatbot) {
              window.deskiveChatbot.close();
              lastClosedTime = Date.now();
            }
            htmlEl.style.display = 'none';
            htmlEl.classList.remove('open', 'expanded', 'visible');

            if (debug) {
              console.log('[deskive Chatbot] Auto-closed on internal page');
            }
          }
        });
      });

      // Start observing document for changes
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    };

    script.onerror = (e) => {
      console.error('[deskive Chatbot] Failed to load script', e);
    };

    document.head.appendChild(script);

    // No cleanup - let the script persist for the app lifetime
    // This prevents issues with React StrictMode double-mounting
  }, [debug, position, primaryColor, greeting, placeholder, location.pathname]);

  // Add CSS override to control chatbot visibility based on page type
  useEffect(() => {
    const isPublic = isPublicPage(location.pathname);

    // Create or update style tag
    let styleTag = document.getElementById('deskive-chatbot-override-styles') as HTMLStyleElement;

    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'deskive-chatbot-override-styles';
      document.head.appendChild(styleTag);
    }

    if (!isPublic) {
      // Hide on internal pages - use !important only for internal pages
      styleTag.textContent = `
        [id*="deskive-chat"],
        [class*="deskive-chat"],
        [class*="chatbot-widget"],
        [class*="chatbot-container"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
    } else {
      // Reset styles on public pages - DON'T force display type, just remove hiding
      styleTag.textContent = `
        /* Remove all hiding on public pages */
        [id*="deskive-chat"]:not([class*="dialog"]):not([class*="window"]),
        [class*="deskive-chat"]:not([class*="dialog"]):not([class*="window"]),
        [class*="chatbot-button"],
        [class*="chatbot-launcher"],
        [class*="chatbot-widget"]:not([class*="dialog"]) {
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* But keep dialogs closed unless user opens them */
        [class*="chatbot-dialog"]:not(.open):not(.visible),
        [class*="chatbot-container"]:not(.open):not(.visible),
        [class*="chat-window"]:not(.open):not(.visible) {
          display: none;
        }
      `;

      // Aggressively remove any inline styles and restore visibility
      // Multiple timeouts to catch bot loading at different times
      const restoreVisibility = () => {
        document.querySelectorAll(
          '#deskive-chatbot-widget, #deskive-chatbot-button, ' +
          '[class*="chatbot-button"], [class*="chatbot-launcher"], ' +
          '[id*="deskive-chat"]:not([id*="dialog"]), [class*="deskive-chat"]:not([class*="dialog"])'
        ).forEach(el => {
          const htmlEl = el as HTMLElement;
          // Remove inline hiding styles
          htmlEl.style.removeProperty('display');
          htmlEl.style.removeProperty('visibility');
          htmlEl.style.removeProperty('opacity');
          htmlEl.style.removeProperty('pointer-events');
        });
      };

      // Run multiple times to catch async bot initialization
      setTimeout(restoreVisibility, 50);
      setTimeout(restoreVisibility, 150);
      setTimeout(restoreVisibility, 300);
      setTimeout(restoreVisibility, 500);
    }
  }, [location.pathname]);

  // Add Escape key handler to close chatbot
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (window.deskiveChatbot) {
          window.deskiveChatbot.close();
          if (debug) {
            console.log('[deskive Chatbot] Closed via Escape key');
          }
        }

        // Only hide the dialog/window, NOT the button
        document.querySelectorAll('[class*="chatbot-dialog"], [class*="chatbot-window"], [class*="chat-container"]:not([class*="button"])').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.display = 'none';
          htmlEl.classList.remove('open', 'expanded', 'visible');
        });
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [debug]);

  // This component doesn't render anything - the script handles the DOM
  return null;
};

// Global deskive chatbot interface (set by chatbot.js script)
declare global {
  interface Window {
    deskiveChatbot?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      sendMessage: (message: string) => void;
      setUser: (user: { id?: string; name?: string; email?: string }) => void;
      destroy: () => void;
    };
  }
}

/**
 * Open the chatbot widget
 */
export const opendeskiveChatbot = (): void => {
  if (window.deskiveChatbot) {
    window.deskiveChatbot.open();
  }
};

/**
 * Close the chatbot widget
 */
export const closedeskiveChatbot = (): void => {
  if (window.deskiveChatbot) {
    window.deskiveChatbot.close();
  }
};

/**
 * Toggle the chatbot widget
 */
export const toggledeskiveChatbot = (): void => {
  if (window.deskiveChatbot) {
    window.deskiveChatbot.toggle();
  }
};

/**
 * Send a message programmatically
 */
export const senddeskiveMessage = (message: string): void => {
  if (window.deskiveChatbot) {
    window.deskiveChatbot.sendMessage(message);
  }
};

/**
 * Set user info for the chatbot
 */
export const setdeskiveChatUser = (user: { id?: string; name?: string; email?: string }): void => {
  if (window.deskiveChatbot) {
    window.deskiveChatbot.setUser(user);
  }
};

/**
 * Hook to access deskive Chatbot
 * Returns the global deskiveChatbot object if available
 */
export const usedeskiveChatbot = () => {
  return window.deskiveChatbot || null;
};

export default DeskiveChatbot;
