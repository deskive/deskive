/**
 * Auth Layout
 * Layout for authentication pages (login/register)
 */

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title = 'Welcome to Deskive',
  subtitle = 'Your collaborative workspace platform' 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          {/* Logo */}
          <div className="mx-auto h-12 w-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {title}
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600">
            {subtitle}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>&copy; 2024 Deskive. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;