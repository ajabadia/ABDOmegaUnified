'use client';

/**
 * @purpose Gestiona notificaciones en el editor de manifesto OMEGA envolviendo el componente ToastProvider para compatibilidad con renderizado en servidor.
 * @purpose_en Manages notifications in the OMEGA manifest editor by wrapping the ToastProvider component for server-side rendering compatibility.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:87uc47
 * @lastUpdated 2026-06-15T17:04:27.158Z
 */

import { ToastProvider } from '@/features/manifest-editor/components/ToastContainer';
import type { ReactNode } from 'react';

export default function ToastProviderClient({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
