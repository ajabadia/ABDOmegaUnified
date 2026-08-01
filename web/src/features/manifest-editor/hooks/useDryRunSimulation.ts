'use client';

/**
 * @purpose Gestiona el estado del botón LFO para elementos seleccionados en el editor de manifesto OMEGA utilizando una función personalizada.
 * @purpose_en Manages the LFO toggle state for selected property elements in the OMEGA manifest editor using a custom hook.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:4,imports:1,sig:5klvh6
 * @lastUpdated 2026-06-20T10:50:26.538Z
 */

import { useSyncExternalStore, useCallback } from 'react';

// Shared transient registry for client-side dry-run LFO simulation
export const dryRunLfoRegistry: Record<string, number> = {};
export const dryRunActiveSimulations: Record<string, boolean> = {};

// ── Subscription mechanism for useSyncExternalStore ──────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribeToStore(onStoreChange: Listener): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * Notify all subscribers that the dry-run store has changed.
 * Exportable so that external mutators (e.g. useRackSimulation) can
 * trigger re-renders after updating the registries.
 */
export function notifyDryRunListeners(): void {
  listeners.forEach(fn => fn());
}

/**
 * useDryRunSimulation (v8.3)
 * Manages the LFO toggle state for the selected property element.
 * Uses useSyncExternalStore instead of the legacy force-update pattern
 * (useState(0) with setTick).
 */
export function useDryRunSimulation(activeId: string | null) {
  const getSnapshot = useCallback(
    () => (activeId ? !!dryRunActiveSimulations[activeId] : false),
    [activeId],
  );

  const isPlaying = useSyncExternalStore(subscribeToStore, getSnapshot, () => false);

  const toggleSimulation = useCallback(() => {
    if (!activeId) return;
    const nextState = !dryRunActiveSimulations[activeId];
    dryRunActiveSimulations[activeId] = nextState;

    if (!nextState) {
      delete dryRunLfoRegistry[activeId];
    }

    notifyDryRunListeners();
  }, [activeId]);

  return { isPlaying, toggleSimulation };
}
