/**
 * Authentication Context
 * Manages user authentication state and methods
 */

import React, { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { useCurrentUser, useLogin, useRegister, useLogout, useUpdateProfile } from '../lib/api/auth-api';
import type { LoginRequest, RegisterRequest, UpdateProfileRequest } from '../lib/api/auth-api';
import { encryptionService } from '../lib/crypto';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // React Query hooks
  const { data: currentUser, isLoading: isLoadingUser, refetch: refetchUser } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const updateProfileMutation = useUpdateProfile();

  // Derive state from React Query
  const user = currentUser || null;
  const isAuthenticated = !!user;
  const isLoading = isLoadingUser || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending;

  // Check for stored token on mount and refetch user data
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    

    if (token && !currentUser && !isLoadingUser) {
      console.log('🔄 Refetching user data...');
      refetchUser();
    }
  }, [currentUser, isLoadingUser, refetchUser]);

  // Listen for auth token storage event (from OAuth callback)
  useEffect(() => {
    const handleAuthTokenStored = () => {
      console.log('🔐 Auth token stored event received, refetching user...');
      refetchUser();
    };

    window.addEventListener('auth-token-stored', handleAuthTokenStored);
    return () => window.removeEventListener('auth-token-stored', handleAuthTokenStored);
  }, [refetchUser]);

  // Initialize E2EE when user is authenticated
  useEffect(() => {
    const initializeEncryption = async () => {
      if (user && !encryptionService.isInitialized()) {
        try {
          console.log('🔒 Initializing end-to-end encryption...');
          await encryptionService.initialize(user.id);
          console.log('✅ E2EE initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize E2EE:', error);
          // Don't throw - allow app to continue without E2EE
        }
      } else if (!user && encryptionService.isInitialized()) {
        // Clear encryption keys on logout
        console.log('🔓 Clearing encryption keys...');
        await encryptionService.clearKeys();
      }
    };

    initializeEncryption();
  }, [user]);

  const login = async (credentials: LoginRequest) => {
    try {
      await loginMutation.mutateAsync(credentials);
      // Token storage handled by mutation, navigation handled by caller
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      await registerMutation.mutateAsync(data);
      // Token storage handled by mutation, navigation handled by caller
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // The mutation handles navigation and cleanup
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, we should clear local state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/auth/login';
    }
  };

  const updateProfile = async (data: UpdateProfileRequest) => {
    if (!user) return;

    try {
      await updateProfileMutation.mutateAsync(data);
      // The mutation handles updating the cache
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      await refetchUser();
    } catch (error) {
      console.error('Profile refresh failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;