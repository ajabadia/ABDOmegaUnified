'use client';

/**
 * @purpose Gestiona y renderiza notificaciones emergentes con animaciones de Framer-Motion en el editor de manifesto OMEGA.
 * @purpose_en Manages and renders toast notifications with Framer-Motion animations in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:4,imports:3,sig:1ao3ymf
 * @lastUpdated 2026-06-20T09:44:24.319Z
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────

const TOAST_DURATION = 4000;
let toastCounter = 0;

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />,
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  },
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    icon: <Info className="w-3.5 h-3.5 text-primary shrink-0" />,
  },
};

// ── Provider ──────────────────────────────────────────────────────────

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++toastCounter}`;
    const toast: Toast = { id, message, variant, createdAt: Date.now() };
    setToasts((prev) => [...prev, toast]);

    const timer = setTimeout(() => dismissToast(id), TOAST_DURATION);
    timersRef.current.set(id, timer);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// ── Container (animated) ──────────────────────────────────────────────

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[380px] w-full" role="status" aria-live="polite" aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xs border ${style.border} ${style.bg} wb-surface backdrop-blur-md shadow-2xl`}
              style={{ willChange: 'transform, opacity' }}
            >
              {style.icon}
              <p className="text-[10px] font-medium text-white/80 leading-relaxed flex-1 min-w-0 break-words">
                {toast.message}
              </p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="p-0.5 hover:bg-white/10 rounded-xs text-white/30 hover:text-white/70 transition-colors shrink-0 mt-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
