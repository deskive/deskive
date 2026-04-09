// src/lib/api/auth-api.ts
import { api } from '@/lib/fetch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, AuthResponse } from '@/types';

// Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  fullName?: string;
  username?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  metadata?: any;
}

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

// API Functions
export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('auth/login', data, {
      requireAuth: false,
    });

    console.log('🔑 Login response:', response);

    // Store auth data - handle multiple token field names
    const token = (response as any).token || (response as any).access_token || (response as any).accessToken;
    const rawUser = response.user;

    // Map snake_case fields to camelCase
    // Handle multiple avatar field names from backend (avatar_url, avatarUrl, profileImage)
    const user = rawUser ? {
      ...rawUser,
      avatarUrl: (rawUser as any).avatar_url || (rawUser as any).avatarUrl || (rawUser as any).profileImage || (rawUser as any).metadata?.avatarUrl,
      fullName: (rawUser as any).full_name || (rawUser as any).fullName,
      createdAt: (rawUser as any).created_at || (rawUser as any).createdAt,
      updatedAt: (rawUser as any).updated_at || (rawUser as any).updatedAt,
    } : null;

    console.log('🔑 Extracted token:', token);
    console.log('🔑 Extracted user:', user);

    if (token) {
      localStorage.setItem('auth_token', token);
      console.log('✅ Token saved to localStorage');
    }

    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      console.log('✅ User saved to localStorage');
    }

    return { ...response, user: user! };
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data, {
      requireAuth: false,
    });

    console.log('🔑 Register response:', response);

    // Check if email verification is required
    const requiresVerification = (response as any).requiresVerification;

    // Store auth data - handle multiple token field names
    const token = (response as any).token || (response as any).access_token || (response as any).accessToken;
    const rawUser = response.user;

    // Map snake_case fields to camelCase
    // Handle multiple avatar field names from backend (avatar_url, avatarUrl, profileImage)
    const user = rawUser ? {
      ...rawUser,
      avatarUrl: (rawUser as any).avatar_url || (rawUser as any).avatarUrl || (rawUser as any).profileImage || (rawUser as any).metadata?.avatarUrl,
      fullName: (rawUser as any).full_name || (rawUser as any).fullName,
      createdAt: (rawUser as any).created_at || (rawUser as any).createdAt,
      updatedAt: (rawUser as any).updated_at || (rawUser as any).updatedAt,
    } : null;

    console.log('🔑 Extracted token:', token);
    console.log('🔑 Extracted user:', user);
    console.log('🔑 Requires verification:', requiresVerification);

    // Only store token if we have one (not when email verification is required)
    if (token) {
      localStorage.setItem('auth_token', token);
      console.log('✅ Token saved to localStorage');
    }

    if (user && !requiresVerification) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      console.log('✅ User saved to localStorage');
    }

    return { ...response, user: user!, requiresVerification };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', null, {
        silentAuthFailure: true,
      });
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('lastWorkspaceId');
      localStorage.removeItem('currentWorkspaceId');
      sessionStorage.removeItem('redirectAfterLogin');
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<{ user: any } | any>('/auth/me');
    // Handle both response formats: { user: {...} } and direct user object
    const userData = (response as any).user || response;

    // Map snake_case fields to camelCase for TypeScript compatibility
    // and ensure countryCode is preserved in metadata
    // Handle multiple avatar field names from backend (avatar_url, avatarUrl, profileImage)
    return {
      ...userData,
      avatarUrl: userData.avatar_url || userData.avatarUrl || userData.profileImage || (userData.metadata?.avatarUrl),
      fullName: userData.full_name || userData.fullName,
      createdAt: userData.created_at || userData.createdAt,
      updatedAt: userData.updated_at || userData.updatedAt,
      // Preserve metadata and add countryCode if it exists at root level
      metadata: {
        ...(userData.metadata || {}),
        ...(userData.countryCode && { countryCode: userData.countryCode }),
      },
    };
  },

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await api.patch<User>('/auth/profile', data);

    // Update stored user data
    localStorage.setItem('auth_user', JSON.stringify(response));

    return response;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post('/auth/forgot-password', { email }, {
      requireAuth: false,
    });
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return api.post('/auth/reset-password', data, {
      requireAuth: false,
    });
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return api.post('/auth/verify-email', { token }, {
      requireAuth: false,
    });
  },

  async resendEmailVerification(): Promise<{ message: string }> {
    return api.post('/auth/resend-verification', null);
  },

  async refreshToken(): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/refresh', null, {
      silentAuthFailure: true,
    });
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return api.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },
};

// React Query Hooks
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      // Set user data immediately in the cache
      if (data.user) {
        queryClient.setQueryData(authKeys.user(), data.user);
      }

      // Invalidate and refetch to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      await queryClient.refetchQueries({ queryKey: authKeys.user() });

      // Don't redirect here - let the caller handle navigation
      // This prevents page reload and allows proper SPA navigation
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async (data) => {
      // Set user data immediately in the cache
      if (data.user) {
        queryClient.setQueryData(authKeys.user(), data.user);
      }

      // Invalidate and refetch to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: authKeys.all });
      await queryClient.refetchQueries({ queryKey: authKeys.user() });

      // Don't redirect here - let the caller handle navigation
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/auth/login';
    },
  });
};

export const useCurrentUser = () => {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      try {
        const user = await authApi.getCurrentUser();
        return user;
      } catch (error) {
        console.error('❌ Failed to fetch current user:', error);
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        throw error;
      }
    },
    enabled: hasToken, // Only fetch if we have a token
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on auth failures
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.user(), data);
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      window.location.href = '/auth/login';
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: authApi.verifyEmail,
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
  });
};
// Backward compatibility: export as authService
export const authService = authApi;
