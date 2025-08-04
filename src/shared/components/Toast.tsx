import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getAccentColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-l-green-400';
      case 'error':
        return 'border-l-red-400';
      case 'warning':
        return 'border-l-yellow-400';
      case 'info':
      default:
        return 'border-l-blue-400';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out mb-3
        ${isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isRemoving ? 'scale-95' : 'scale-100'}
      `}
    >
      <div className={`
        max-w-sm w-full pointer-events-auto bg-popover border border-border rounded-xl overflow-hidden
        ${getAccentColor()} border-l-2
      `}
      style={{
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
      }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text font-twitter">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                  {toast.message}
                </p>
              )}
              {toast.action && (
                <div className="mt-3">
                  <button
                    onClick={toast.action.onClick}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={handleRemove}
                className="w-6 h-6 rounded-full hover:bg-background-notes/20 flex items-center justify-center text-text-tertiary hover:text-text transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// Toast context and hook for managing toasts
const ToastContext = React.createContext<{
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Convenience functions for different toast types
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    showSuccess: (title: string, message?: string, action?: Toast['action']) => {
      addToast({ type: 'success', title, message, action });
    },
    showError: (title: string, message?: string, action?: Toast['action']) => {
      addToast({ type: 'error', title, message, action, duration: 7000 }); // Longer duration for errors
    },
    showWarning: (title: string, message?: string, action?: Toast['action']) => {
      addToast({ type: 'warning', title, message, action });
    },
    showInfo: (title: string, message?: string, action?: Toast['action']) => {
      addToast({ type: 'info', title, message, action });
    },
  };
};