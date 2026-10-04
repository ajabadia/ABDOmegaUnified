'use client';

/**
 * @purpose Proporciona notificacion emergente.
 * @purpose_en Re-exports the `ToastProvider` and `useToast` components from a canonical implementation.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1h42r56
 * @lastUpdated 2026-06-17T22:23:04.694Z
 */

export { ToastProvider, useToast } from '../ToastContainer';
export type { Toast, ToastVariant } from '../ToastContainer';
