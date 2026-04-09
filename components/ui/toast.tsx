'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: typeof CheckCircle }> = {
  success: { bg: 'bg-green-600', icon: CheckCircle },
  error: { bg: 'bg-red-600', icon: XCircle },
  warning: { bg: 'bg-yellow-500', icon: AlertTriangle },
  info: { bg: 'bg-gray-800', icon: CheckCircle },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const style = VARIANT_STYLES[t.variant];
            const Icon = style.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto mx-4 max-w-sm w-full ${style.bg} text-white rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <p className="flex-1 text-sm font-medium">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="shrink-0 p-0.5 rounded-full hover:bg-white/20">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
