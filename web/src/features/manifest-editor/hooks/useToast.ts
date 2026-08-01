'use client';

/**
 * @purpose Gestiona una cola de notificaciones de panecillo con función de auto-extinción, soporta diferentes variantes y limita el número de notificaciones visibles simultáneamente.
 * @purpose_en Manages a queue of toast notifications with auto-dismiss functionality, supports different variants and limits the number of visible notifications simultaneously.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:4,imports:1,sig:qvd361
 * @lastUpdated 2026-06-15T13:23:05.420Z
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
}

export interface ToastActions {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  warning: 4000,
  error: 5000,
};

const MAX_TOASTS = 5;

let toastIdCounter = 0;

/**
 * useToast — maneja una cola de notificaciones toast con auto-dismiss.
 *
 * - Cada toast se auto-destruye según su variante (success/info: 3s, warning: 4s, error: 5s)
 * - Máximo MAX_TOASTS (5) visibles simultáneamente
 * - Soporta añadir, remover individual y limpiar todo
 */
export function useToast(): ToastActions {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const toast: Toast = { id, message, variant, createdAt: Date.now() };

    setToasts((prev) => {
      const next = [...prev, toast];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    // Auto-dismiss timer
    const dismissMs = AUTO_DISMISS_MS[variant];
    const timer = setTimeout(() => {
      removeToast(id);
    }, dismissMs);
    timersRef.current.set(id, timer);

    return id;
  }, [removeToast]);

  const clearToasts = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
    setToasts([]);
  }, []);

  return useMemo(() => ({ toasts, addToast, removeToast, clearToasts }), [toasts, addToast, removeToast, clearToasts]);
}
