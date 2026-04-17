// src/lib/fetch.ts
import { API_CONFIG } from "@/lib/config";

interface FetchWithAuthOptions extends RequestInit {
  requireAuth?: boolean;
  silentAuthFailure?: boolean; // Don't redirect on auth failure, just fail silently
}

export async function fetchWithAuth(
  path: string,
  options: FetchWithAuthOptions = {}
) {
  const url = API_CONFIG.getApiUrl(path);
  const requireAuth = options.requireAuth ?? true;
  const silentAuthFailure = options.silentAuthFailure ?? false;
  let token: string | undefined;

  try {
    // Get token from localStorage
    token = localStorage.getItem('auth_token') || undefined;
  } catch (error) {
    console.error("Failed to get auth token:", error);
  }

  // Check if body is FormData - if so, don't set Content-Type (let browser set it with boundary)
  const isFormData = options.body instanceof FormData;

  // Create headers with proper typing
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),  // Don't set Content-Type for FormData
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (requireAuth) {
    // Only redirect if auth is required AND not a silent failure
    if (typeof window !== "undefined" && !silentAuthFailure) {
      // Don't redirect if we're already on an auth page
      const isAuthPage = window.location.pathname.startsWith('/auth/') || 
                        window.location.pathname.startsWith('/login') ||
                        window.location.pathname.startsWith('/register');
      
      if (!isAuthPage) {
        // Save current URL for redirect after login
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterLogin', currentUrl);
        
        window.location.href = "/auth/login";
      }
      
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (requireAuth && silentAuthFailure) {
      // Return 401 without redirecting for silent failures
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Execute the fetch
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized errors, but only if auth is required and not silent
    if (
      response.status === 401 &&
      requireAuth &&
      !silentAuthFailure &&
      typeof window !== "undefined"
    ) {
      console.error("Authentication failed - redirecting to login");
      // Clear auth token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      // Don't redirect if we're already on an auth page
      const isAuthPage = window.location.pathname.startsWith('/auth/') || 
                        window.location.pathname.startsWith('/login') ||
                        window.location.pathname.startsWith('/register');
      
      if (!isAuthPage) {
        // Save current URL for redirect after login
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterLogin', currentUrl);
        
        window.location.href = "/auth/login";
      }
    }
    
    // Handle 413 Payload Too Large - this is a special case where we want to show a custom error message
    if (response.status === 413) {
      let errorMessage = 'File too large';
      try {
        const cloned = response.clone(); 
        const errorData = await cloned.json();

        const maxBytes = errorData?.details?.maxBytes;
        const receivedBytes = errorData?.details?.receivedBytes;

        const MB = 1024 * 1024;

        const maxMB = maxBytes ? (maxBytes / MB).toFixed(2) : null;
        const receivedMB = receivedBytes ? (receivedBytes / MB).toFixed(2) : null;

        if (maxMB && receivedMB) {
          errorMessage = `File too large (${receivedMB} MB). Max allowed is ${maxMB} MB`;
        } else if (maxMB) {
          errorMessage = `File too large. Max allowed is ${maxMB} MB`;
        }

      } catch (error) {
        console.error('Failed to parse 413 response', error);
      }
      throw new Error(errorMessage);
    }
 
    return response;
  } catch (error) {
    console.error(`API request to ${path} failed:`, error);
    throw error;
  }
}

// Helper function to handle common API response patterns
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorData = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } else {
        errorMessage = await response.text();
      }
    } catch (e) {
      // If we can't parse the error, use the status text
      errorMessage = response.statusText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }
  
  return response.json();
}

// Convenience methods for common HTTP verbs
export const api = {
  async get<T>(path: string, options?: FetchWithAuthOptions): Promise<T> {
    const response = await fetchWithAuth(path, {
      ...options,
      method: 'GET',
    });
    return handleApiResponse<T>(response);
  },

  async post<T>(path: string, data?: any, options?: FetchWithAuthOptions): Promise<T> {
    // Check if data is FormData - don't stringify it
    const isFormData = data instanceof FormData;

    const response = await fetchWithAuth(path, {
      ...options,
      method: 'POST',
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
    return handleApiResponse<T>(response);
  },

  async put<T>(path: string, data?: any, options?: FetchWithAuthOptions): Promise<T> {
    // Check if data is FormData - don't stringify it
    const isFormData = data instanceof FormData;

    const response = await fetchWithAuth(path, {
      ...options,
      method: 'PUT',
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
    return handleApiResponse<T>(response);
  },

  async patch<T>(path: string, data?: any, options?: FetchWithAuthOptions): Promise<T> {
    // Check if data is FormData - don't stringify it
    const isFormData = data instanceof FormData;

    const response = await fetchWithAuth(path, {
      ...options,
      method: 'PATCH',
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
    return handleApiResponse<T>(response);
  },

  async delete<T>(path: string, options?: FetchWithAuthOptions): Promise<T> {
    const response = await fetchWithAuth(path, {
      ...options,
      method: 'DELETE',
    });
    return handleApiResponse<T>(response);
  },
};