'use client';

/**
 * @purpose Gestiona historia de lotes y notificaciones para acciones en el editor de manifesto OMEGA.
 * @purpose_en Manages batch history and notifications for actions in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:9,imports:1,sig:1f2s3rt
 * @lastUpdated 2026-06-20T10:48:54.927Z
 */

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';

// ── Types ─────────────────────────────────────────────────────────────
export type BatchVariant = 'hide' | 'show' | 'lock' | 'unlock' | 'group' | 'ungroup';
export type BatchAction = 'visibility' | 'lock' | 'group';

export interface HistoryEntry {
  message: string;
  variant: BatchVariant;
  time: number;
  ids: string[];
  action: BatchAction;
  value: boolean;
}

export interface BatchNotification {
  message: string;
  variant: BatchVariant;
}

// ── Constants ─────────────────────────────────────────────────────────
const MAX_HISTORY = 20;
const STORAGE_KEY = 'omega_batch_history';

// Tailwind classes for batch notification visual styling, keyed by variant
export const BATCH_VARIANT_PILL: Record<BatchVariant, string> = {
  hide: 'bg-red-400/15 text-red-400 border border-red-400/30',
  show: 'bg-green-400/15 text-green-400 border border-green-400/30',
  lock: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  unlock: 'bg-white/10 text-white/70 border border-white/20',
  group: 'bg-sky-400/15 text-sky-400 border border-sky-400/30',
  ungroup: 'bg-fuchsia-400/15 text-fuchsia-400 border border-fuchsia-400/30',
};

export const BATCH_VARIANT_TOOLTIP: Record<BatchVariant, string> = {
  hide: 'border-red-400/40 text-red-400/80',
  show: 'border-green-400/40 text-green-400/80',
  lock: 'border-amber-400/40 text-amber-400/80',
  unlock: 'border-white/20 text-white/60',
  group: 'border-sky-400/40 text-sky-400/80',
  ungroup: 'border-fuchsia-400/40 text-fuchsia-400/80',
};

export const BATCH_VARIANT_TIMELINE: Record<BatchVariant, string> = {
  hide: 'border-red-400/40 bg-red-400/5 text-red-400/80',
  show: 'border-green-400/40 bg-green-400/5 text-green-400/80',
  lock: 'border-amber-400/40 bg-amber-400/5 text-amber-400/80',
  unlock: 'border-white/20 bg-white/5 text-white/60',
  group: 'border-sky-400/40 bg-sky-400/5 text-sky-400/80',
  ungroup: 'border-fuchsia-400/40 bg-fuchsia-400/5 text-fuchsia-400/80',
};

// Tailwind classes for batch action buttons (border + hover + text)
export const BATCH_VARIANT_BUTTON: Record<BatchVariant, string> = {
  hide: 'border border-red-400/30 hover:bg-red-400/10 hover:border-red-400/50 text-red-400/80 hover:text-red-400',
  show: 'border border-green-400/30 hover:bg-green-400/10 hover:border-green-400/50 text-green-400/80 hover:text-green-400',
  lock: 'border border-amber-400/30 hover:bg-amber-400/10 hover:border-amber-400/50 text-amber-400/80 hover:text-amber-400',
  unlock: 'border border-white/20 hover:bg-white/10 hover:border-white/40 text-white/60 hover:text-white',
  group: 'border border-sky-400/30 hover:bg-sky-400/10 hover:border-sky-400/50 text-sky-400/80 hover:text-sky-400',
  ungroup: 'border border-fuchsia-400/30 hover:bg-fuchsia-400/10 hover:border-fuchsia-400/50 text-fuchsia-400/80 hover:text-fuchsia-400',
};

// Load persisted history from localStorage (survives page refreshes)
function loadBatchHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useBatchHistory() {
  const [batchHistory, setBatchHistory] = useState<HistoryEntry[]>(loadBatchHistory);
  const [batchNotification, setBatchNotification] = useState<BatchNotification | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hoverHistory, setHoverHistory] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batchHistory));
    } catch {
      // localStorage full or unavailable — silently fail
    }
  }, [batchHistory]);

  // Auto-dismiss batch notification: show for 1700ms → fade out 300ms → clear
  useEffect(() => {
    if (!batchNotification) return;
    startTransition(() => setFadingOut(false));
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    const dismissTimer = setTimeout(() => {
      setFadingOut(true);
      fadeTimerRef.current = setTimeout(() => {
        setBatchNotification(null);
        setFadingOut(false);
        fadeTimerRef.current = null;
      }, 300);
    }, 1700);

    return () => {
      clearTimeout(dismissTimer);
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [batchNotification]);

  // Push a new history entry with IDs for undo support
  const pushBatchAction = useCallback((variant: BatchVariant, ids: string[], action: BatchAction, value: boolean) => {
    const label = variant === 'hide' ? 'hidden' : variant === 'show' ? 'shown' : `${variant}d`;
    const entry: HistoryEntry = { message: `${ids.length} ${label}`, variant, time: Date.now(), ids, action, value };
    setBatchHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
    setBatchNotification({ message: entry.message, variant });
  }, []);

  // Clear all history
  const clearBatchHistory = useCallback(() => {
    setBatchHistory([]);
    setShowHistory(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Check if a given entry is undoable
  const isEntryUndoable = useCallback((entry: HistoryEntry): boolean => {
    return entry.action === 'visibility' || entry.action === 'lock' || (entry.action === 'group' && entry.value === true);
  }, []);

  return {
    batchHistory,
    setBatchHistory,
    batchNotification,
    setBatchNotification,
    showHistory,
    setShowHistory,
    hoverHistory,
    setHoverHistory,
    fadingOut,
    pushBatchAction,
    clearBatchHistory,
    isEntryUndoable,
    MAX_HISTORY,
  };
}
