'use client';

/**
 * @purpose Rastrea el estado dirty de los documentos y gestiona el guardado antes de salir.
 * @purpose_en Tracks dirty state of documents and manages beforeunload guard.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import { useState, useRef, useEffect } from 'react';
import type { DocumentState } from '../types/document';

export interface WorkbenchDirtyTracker {
  isDirty: boolean;
  lastSavedTime: string | null;
}

export function useWorkbenchDirtyTracker(
  documentsById: Record<string, DocumentState>,
): WorkbenchDirtyTracker {
  const docs = documentsById as Record<string, DocumentState>;
  const isDirty = Object.values(docs).some(doc => doc.isDirty);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const prevIsDirty = useRef(isDirty);

  useEffect(() => {
    if (prevIsDirty.current && !isDirty) {
      setLastSavedTime(new Date().toLocaleTimeString());
    }
    prevIsDirty.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = Object.values(docs).some(doc => doc.isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [docs]);

  return { isDirty, lastSavedTime };
}
