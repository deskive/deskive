/**
 * useToast Hook
 * Hook for displaying toast notifications using Sonner
 */

import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

export const useToast = () => {
  const toast = ({ title, description, variant = 'default', duration }: ToastProps) => {
    switch (variant) {
      case 'destructive':
        return sonnerToast.error(title, {
          description,
          duration,
        });
      case 'success':
        return sonnerToast.success(title, {
          description,
          duration,
        });
      default:
        return sonnerToast(title, {
          description,
          duration,
        });
    }
  };

  return { toast };
};