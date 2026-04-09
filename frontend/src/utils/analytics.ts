/**
 * Google Analytics 4 Integration
 *
 * This utility provides GA4 tracking functions for Deskive.
 * It only tracks when GA_MEASUREMENT_ID is configured in production.
 */

// Get GA4 Measurement ID from environment
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Check if analytics is enabled
const isAnalyticsEnabled = (): boolean => {
  return Boolean(GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX');
};

// Google Analytics global object (gtag)
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Initialize Google Analytics
 * Call this once when the app starts
 */
export const initializeAnalytics = (): void => {
  if (!isAnalyticsEnabled()) {
    console.log('[Analytics] GA4 not configured - tracking disabled');
    return;
  }

  // gtag is loaded via script tag in index.html
  console.log('[Analytics] GA4 initialized:', GA_MEASUREMENT_ID);
};

/**
 * Track page views
 * Call this on route changes
 */
export const trackPageView = (page_path: string, page_title?: string): void => {
  if (!isAnalyticsEnabled() || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path,
    page_title: page_title || document.title,
  });
};

/**
 * Track custom events
 * Use this for user interactions like button clicks, form submissions, etc.
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
): void => {
  if (!isAnalyticsEnabled() || !window.gtag) return;

  window.gtag('event', eventName, eventParams);
};

/**
 * Track user sign-up conversions
 */
export const trackSignUp = (method: 'email' | 'google' | 'github' = 'email'): void => {
  trackEvent('sign_up', {
    method,
  });
};

/**
 * Track user login
 */
export const trackLogin = (method: 'email' | 'google' | 'github' = 'email'): void => {
  trackEvent('login', {
    method,
  });
};

/**
 * Track workspace creation
 */
export const trackWorkspaceCreated = (): void => {
  trackEvent('workspace_created', {
    event_category: 'engagement',
  });
};

/**
 * Track subscription/plan selection
 */
export const trackPlanSelected = (plan: string, billing: 'monthly' | 'yearly'): void => {
  trackEvent('select_plan', {
    plan_name: plan,
    billing_cycle: billing,
    event_category: 'conversion',
  });
};

/**
 * Track feature usage
 */
export const trackFeatureUsed = (feature: string): void => {
  trackEvent('feature_used', {
    feature_name: feature,
    event_category: 'engagement',
  });
};

/**
 * Track file uploads
 */
export const trackFileUpload = (fileType: string, fileSize: number): void => {
  trackEvent('file_upload', {
    file_type: fileType,
    file_size: fileSize,
    event_category: 'engagement',
  });
};

/**
 * Track video call started
 */
export const trackVideoCallStarted = (participants: number): void => {
  trackEvent('video_call_started', {
    participant_count: participants,
    event_category: 'engagement',
  });
};

/**
 * Track search queries
 */
export const trackSearch = (searchTerm: string, resultsCount: number): void => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
    event_category: 'engagement',
  });
};

/**
 * Track errors for monitoring
 */
export const trackError = (errorMessage: string, errorLocation: string): void => {
  trackEvent('exception', {
    description: errorMessage,
    fatal: false,
    location: errorLocation,
  });
};

/**
 * Track outbound link clicks
 */
export const trackOutboundLink = (url: string, label?: string): void => {
  trackEvent('click', {
    event_category: 'outbound',
    event_label: label || url,
    value: url,
  });
};

/**
 * Track CTA button clicks
 */
export const trackCTAClick = (ctaName: string, location: string): void => {
  trackEvent('cta_click', {
    cta_name: ctaName,
    page_location: location,
    event_category: 'engagement',
  });
};

/**
 * Set user properties (for logged-in users)
 */
export const setUserProperties = (properties: Record<string, any>): void => {
  if (!isAnalyticsEnabled() || !window.gtag) return;

  window.gtag('set', 'user_properties', properties);
};

/**
 * Set user ID (for logged-in users)
 */
export const setUserId = (userId: string): void => {
  if (!isAnalyticsEnabled() || !window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId,
  });
};

export default {
  initializeAnalytics,
  trackPageView,
  trackEvent,
  trackSignUp,
  trackLogin,
  trackWorkspaceCreated,
  trackPlanSelected,
  trackFeatureUsed,
  trackFileUpload,
  trackVideoCallStarted,
  trackSearch,
  trackError,
  trackOutboundLink,
  trackCTAClick,
  setUserProperties,
  setUserId,
};
