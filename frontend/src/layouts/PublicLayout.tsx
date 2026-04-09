/**
 * PublicLayout Component
 * Layout wrapper for all public marketing pages
 */

import React from 'react';
import { ModernHeader } from '../components/landing/ModernHeader';
import { ModernFooter } from '../components/landing/ModernFooter';
import { StarBackground } from '../components/ui/star-background';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <style>{`
        @keyframes gradientFlow {
          0%, 100% {
            background-position: 0% 50%;
          }
          25% {
            background-position: 100% 25%;
          }
          50% {
            background-position: 100% 75%;
          }
          75% {
            background-position: 0% 100%;
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        /* Glassmorphism styles */
        .glass-effect {
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }

        .glass-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card-hover:hover {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 60px 0 rgba(31, 38, 135, 0.5);
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.1);
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #0891b2 0%, #059669 100%);
        }

        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }

        /* Enhance text rendering */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
      <div
        className="min-h-screen flex flex-col relative bg-white"
      >
        <div className="relative z-10 flex flex-col min-h-screen">
          <ModernHeader />
          <div className="pt-[72px] md:pt-[80px]">
            <main className="flex-1">{children}</main>
          </div>
          <ModernFooter />
        </div>
      </div>
    </>
  );
}

export default PublicLayout;