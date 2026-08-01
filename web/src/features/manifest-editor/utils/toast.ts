/**
 * @purpose Gestiona notificaciones emergentes para mostrar mensajes a través de la aplicación sin depender de React Context.
 * @purpose_en Manages toast notifications for displaying messages across the application without relying on React Context.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:1ym3nbo
 * @lastUpdated 2026-06-15T15:17:30.868Z
 */

import type { ToastVariant } from '../hooks/useToast';

type ToastFn = (message: string) => void;

interface ToastRegistry {
  success: ToastFn;
  error: ToastFn;
  warning: ToastFn;
  info: ToastFn;
}

let registeredImpl: ToastRegistry | null = null;

/**
 * Toast singleton — llama a toast.success() / toast.error() / etc.
 * desde cualquier parte del código. No requiere React Context.
 */
export const toast = {
  success: (message: string) => registeredImpl?.success(message),
  error: (message: string) => registeredImpl?.error(message),
  warning: (message: string) => registeredImpl?.warning(message),
  info: (message: string) => registeredImpl?.info(message),

  /** @internal Registra la implementación (llamado por ToastContainer al montarse) */
  _register: (impl: ToastRegistry) => { registeredImpl = impl; },

  /** @internal Desregistra la implementación (llamado por ToastContainer al desmontarse) */
  _unregister: () => { registeredImpl = null; },
};

/** @internal Helper para crear la implementación desde addToast */
export function createToastRegistry(addToast: (message: string, variant?: ToastVariant) => void): ToastRegistry {
  return {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    warning: (msg: string) => addToast(msg, 'warning'),
    info: (msg: string) => addToast(msg, 'info'),
  };
}
