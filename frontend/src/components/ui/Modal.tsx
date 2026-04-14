import React, { useState, useEffect, createContext, useContext } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

// ==================== TYPES ====================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children?: React.ReactNode;
}

export interface ConfirmModalProps extends Omit<BaseModalProps, 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning' | 'success';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  icon?: React.ReactNode;
}

export interface AlertModalProps extends Omit<BaseModalProps, 'children'> {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  okText?: string;
  onOk?: () => void;
  icon?: React.ReactNode;
}

export interface FormModalProps extends BaseModalProps {
  onSubmit?: () => void | Promise<void>;
  submitText?: string;
  cancelText?: string;
  showFooter?: boolean;
  isLoading?: boolean;
}

interface ModalContextValue {
  confirm: (message: string, title?: string, options?: Partial<ConfirmModalProps>) => Promise<boolean>;
  alert: (message: string, title?: string, options?: Partial<AlertModalProps>) => Promise<void>;
}

// ==================== UTILITY FUNCTIONS ====================

const getSizeClasses = (size: ModalSize): string => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return sizes[size];
};

const getVariantClasses = (variant: 'primary' | 'danger' | 'warning' | 'success'): string => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-xl hover:shadow-purple-500/40',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-xl hover:shadow-red-500/40',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-xl hover:shadow-orange-500/40',
    success: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-xl hover:shadow-emerald-500/40',
  };
  return variants[variant];
};

const getAlertIcon = (type: 'info' | 'success' | 'warning' | 'error') => {
  const icons = {
    info: <Info className="w-6 h-6 text-blue-600" />,
    success: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    error: <AlertCircle className="w-6 h-6 text-red-600" />,
  };
  return icons[type];
};

const getAlertColors = (type: 'info' | 'success' | 'warning' | 'error') => {
  const colors = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
  };
  return colors[type];
};

// ==================== MODAL CONTEXT ====================

const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};

// ==================== BASE MODAL COMPONENT ====================

export const Modal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  title,
  description,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={closeOnOverlayClick ? onClose : undefined}
              />
            </Dialog.Overlay>

            {/* Content */}
            <Dialog.Content
              asChild
              forceMount
              onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`fixed left-1/2 top-[5vh] -translate-x-1/2 z-50 w-full ${getSizeClasses(
                  size
                )} px-4 flex items-center justify-center`}
                style={{ maxHeight: '90vh' }}
              >
                <div className="bg-white dark:bg-gray-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto relative">
                  <div className="p-6 md:p-8">
                    {/* Close Button */}
                    {showCloseButton && (
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors z-10"
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    )}

                    {/* Header */}
                    {title && (
                      <div className="mb-4 pr-12">
                        <Dialog.Title className="text-2xl md:text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
                          {title}
                        </Dialog.Title>
                        {description && (
                          <Dialog.Description className="text-gray-600 dark:text-gray-400">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <div>{children}</div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

// ==================== CONFIRM MODAL ====================

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  size = 'sm',
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  icon,
  showCloseButton = true,
  closeOnOverlayClick = false,
  closeOnEscape = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      title={title}
      showCloseButton={showCloseButton}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
    >
      {/* Icon */}
      {icon && (
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}

      {/* Message */}
      <p className="text-gray-700 text-lg mb-8 text-center">{message}</p>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          disabled={isLoading}
          className={`flex-1 px-6 py-3 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${getVariantClasses(
            confirmVariant
          )}`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-3 border-white border-t-transparent rounded-full"
              />
              <span>Processing...</span>
            </div>
          ) : (
            confirmText
          )}
        </motion.button>
      </div>
    </Modal>
  );
};

// ==================== ALERT MODAL ====================

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  size = 'sm',
  title,
  message,
  type = 'info',
  okText = 'OK',
  onOk,
  icon,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const handleOk = () => {
    if (onOk) {
      onOk();
    }
    onClose();
  };

  const defaultTitle = title || {
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
  }[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      title={defaultTitle}
      showCloseButton={showCloseButton}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
    >
      {/* Icon */}
      <div className="flex justify-center mb-6">
        <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${getAlertColors(type)}`}>
          {icon || getAlertIcon(type)}
        </div>
      </div>

      {/* Message */}
      <p className="text-gray-700 text-lg mb-8 text-center">{message}</p>

      {/* Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleOk}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
      >
        {okText}
      </motion.button>
    </Modal>
  );
};

// ==================== FORM MODAL ====================

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  title,
  description,
  children,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  showFooter = true,
  isLoading = false,
  showCloseButton = true,
  closeOnOverlayClick = false,
  closeOnEscape = true,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit();
        onClose();
      } catch (error) {
        console.error('Form submission failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      title={title}
      description={description}
      showCloseButton={showCloseButton}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
    >
      <form onSubmit={handleSubmit}>
        {/* Form Content */}
        <div className="mb-6">{children}</div>

        {/* Footer */}
        {showFooter && (
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              disabled={isSubmitting || isLoading}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting || isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-3 border-white border-t-transparent rounded-full"
                  />
                  <span>Processing...</span>
                </div>
              ) : (
                submitText
              )}
            </motion.button>
          </div>
        )}
      </form>
    </Modal>
  );
};

// ==================== MODAL PROVIDER & UTILITY FUNCTIONS ====================

interface ModalState {
  type: 'confirm' | 'alert' | null;
  isOpen: boolean;
  title?: string;
  message: string;
  options?: any;
  resolve?: (value: any) => void;
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    isOpen: false,
    message: '',
  });

  const confirm = (
    message: string,
    title?: string,
    options?: Partial<ConfirmModalProps>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        type: 'confirm',
        isOpen: true,
        title: title || 'Confirm Action',
        message,
        options,
        resolve,
      });
    });
  };

  const alert = (
    message: string,
    title?: string,
    options?: Partial<AlertModalProps>
  ): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        type: 'alert',
        isOpen: true,
        title,
        message,
        options,
        resolve,
      });
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    setTimeout(() => {
      setModalState({ type: null, isOpen: false, message: '' });
    }, 200);
  };

  const handleConfirm = () => {
    if (modalState.resolve) {
      modalState.resolve(true);
    }
    closeModal();
  };

  const handleCancel = () => {
    if (modalState.resolve) {
      modalState.resolve(false);
    }
    closeModal();
  };

  const handleAlertOk = () => {
    if (modalState.resolve) {
      modalState.resolve(undefined);
    }
    closeModal();
  };

  const contextValue: ModalContextValue = {
    confirm,
    alert,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}

      {/* Confirm Modal */}
      {modalState.type === 'confirm' && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          onClose={handleCancel}
          title={modalState.title}
          message={modalState.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          {...(modalState.options || {})}
        />
      )}

      {/* Alert Modal */}
      {modalState.type === 'alert' && (
        <AlertModal
          isOpen={modalState.isOpen}
          onClose={handleAlertOk}
          title={modalState.title}
          message={modalState.message}
          onOk={handleAlertOk}
          {...(modalState.options || {})}
        />
      )}
    </ModalContext.Provider>
  );
};

// ==================== STANDALONE UTILITY FUNCTIONS ====================

// These can be used without context (for one-off usage)
let modalRoot: HTMLDivElement | null = null;

const ensureModalRoot = () => {
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }
  return modalRoot;
};

/**
 * Standalone confirm dialog
 * Usage: const result = await confirm('Are you sure?', 'Delete Item');
 */
export const confirm = (
  message: string,
  title?: string,
  options?: Partial<ConfirmModalProps>
): Promise<boolean> => {
  return new Promise((resolve) => {
    const root = ensureModalRoot();
    const container = document.createElement('div');
    root.appendChild(container);

    const cleanup = () => {
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 300);
    };

    const handleConfirm = () => {
      resolve(true);
      cleanup();
    };

    const handleCancel = () => {
      resolve(false);
      cleanup();
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRoot } = require('react-dom/client');
    const reactRoot = createRoot(container);

    reactRoot.render(
      <ConfirmModal
        isOpen={true}
        onClose={handleCancel}
        title={title || 'Confirm Action'}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        {...(options || {})}
      />
    );
  });
};

/**
 * Standalone alert dialog
 * Usage: await alert('Operation successful!', 'Success');
 */
export const alert = (
  message: string,
  title?: string,
  options?: Partial<AlertModalProps>
): Promise<void> => {
  return new Promise((resolve) => {
    const root = ensureModalRoot();
    const container = document.createElement('div');
    root.appendChild(container);

    const cleanup = () => {
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 300);
    };

    const handleOk = () => {
      resolve();
      cleanup();
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRoot } = require('react-dom/client');
    const reactRoot = createRoot(container);

    reactRoot.render(
      <AlertModal
        isOpen={true}
        onClose={handleOk}
        title={title}
        message={message}
        onOk={handleOk}
        {...(options || {})}
      />
    );
  });
};

// ==================== EXPORTS ====================

export default Modal;
