import { toast as sonnerToast } from 'sonner'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  action?: ToastAction
  duration?: number
}

export function useToast() {
  const toast = ({ title, description, variant, action, duration }: ToastProps) => {
    const toastOptions: any = {
      description,
      duration,
    }

    if (action) {
      toastOptions.action = {
        label: action.label,
        onClick: action.onClick,
      }
    }

    if (variant === 'destructive') {
      sonnerToast.error(title || 'Error', toastOptions)
    } else {
      sonnerToast.success(title || 'Success', toastOptions)
    }
  }

  return { toast }
}
