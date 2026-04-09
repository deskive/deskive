/**
 * Protected Route Component
 * Ensures user is authenticated before accessing protected pages
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper function to check if user has required role
const checkUserRole = (userRole: string | undefined, requiredRole: string): boolean => {
  if (!userRole) return false;

  // Normalize to uppercase for comparison (deskive returns lowercase)
  const normalizedUserRole = userRole.toUpperCase();
  const normalizedRequiredRole = requiredRole.toUpperCase();

  const roleHierarchy = {
    'ADMIN': ['ADMIN', 'MODERATOR', 'USER'],
    'MODERATOR': ['MODERATOR', 'USER'],
    'USER': ['USER'],
  };

  return roleHierarchy[normalizedRequiredRole as keyof typeof roleHierarchy]?.includes(normalizedUserRole) || false;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'MODERATOR' | 'USER';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Check for mobile WebView token
  const mobileToken = searchParams.get('token');
  const isMobileView = searchParams.get('mobile') === 'true';
  const [mobileAuthProcessing, setMobileAuthProcessing] = useState(false);

  // Handle mobile WebView token authentication
  useEffect(() => {
    if (isMobileView && mobileToken && !isAuthenticated && !isLoading) {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken !== mobileToken) {
        console.log('📱 ProtectedRoute: Storing mobile token and triggering auth refresh');
        setMobileAuthProcessing(true);
        localStorage.setItem('auth_token', mobileToken);
        window.dispatchEvent(new CustomEvent('auth-token-stored'));
        // Give auth context time to process
        setTimeout(() => setMobileAuthProcessing(false), 2000);
      }
    }
  }, [isMobileView, mobileToken, isAuthenticated, isLoading]);

  // Show loading spinner while checking authentication
  if (isLoading || mobileAuthProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        {isMobileView && (
          <p className="ml-3 text-muted-foreground">Authenticating...</p>
        )}
      </div>
    );
  }

  // For mobile WebView with token, always allow through and let the page handle auth
  if (isMobileView && mobileToken) {
    // Store token if not already stored
    if (!localStorage.getItem('auth_token')) {
      localStorage.setItem('auth_token', mobileToken);
    }
    // Allow through without waiting for auth context
    return <>{children}</>;
  }

  // Redirect to login if not authenticated (desktop only at this point)
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }


  // Check role-based access if requiredRole is specified
  if (requiredRole && user) {
    const hasRequiredRole = checkUserRole(user.role, requiredRole);
    if (!hasRequiredRole) {
      return <Navigate to="/" replace />;
    }
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default ProtectedRoute;