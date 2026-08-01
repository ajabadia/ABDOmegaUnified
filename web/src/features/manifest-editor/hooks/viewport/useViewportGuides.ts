'use client';

/**
 * @purpose Gestiona el sincronismo del estado de guías y reglas desde el manifesto, mediante sincronización de manifesto a través de callback.
 * @purpose_en Manages the synchronization of guides and rulers state from the manifest, with manifest sync via callback.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:3,sig:1crtmvz
 * @lastUpdated 2026-06-20T20:07:40.663Z
 */

import { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import type { OMEGA_Manifest, GridGuide } from '@/omega-ui-core/types/manifest';
import { toggleGridField, updateGuides } from '../../utils/gridHelpers';

export interface ViewportGuidesResult {
  showGuides: boolean;
  guides: GridGuide[];
  handleToggleRulers: () => void;
  handleGuidesChange: (newGuides: GridGuide[]) => void;
}

/**
 * Hook para sincronizar guías/reglas desde el manifest y escribir cambios al manifest.
 * @param manifest - El manifest OMEGA actual
 * @param onUpdateManifest - Callback opcional para persistir cambios al manifest
 */
export function useViewportGuides(
  manifest: OMEGA_Manifest,
  onUpdateManifest?: (updates: Partial<OMEGA_Manifest>) => void,
): ViewportGuidesResult {
  const grid = manifest.ui?.layout?.grid;
  const manifestShowGuides = grid?.showGuides ?? false;

  const [showGuides, setShowGuides] = useState(manifestShowGuides);
  const [guides, setGuides] = useState<GridGuide[]>(() => grid?.guides ?? []);

  // Sync local state with manifest props — using useRef to track previous values
  // avoids setState-in-render anti-pattern which can cause "Maximum update depth exceeded"
  const prevShowGuidesRef = useRef(manifestShowGuides);
  useEffect(() => {
    if (manifestShowGuides !== prevShowGuidesRef.current) {
      prevShowGuidesRef.current = manifestShowGuides;
      setShowGuides(manifestShowGuides);
    }
  }, [manifestShowGuides]);

  const prevGuidesRef = useRef(grid?.guides);
  useEffect(() => {
    const newGuides = grid?.guides;
    if (newGuides !== prevGuidesRef.current) {
      prevGuidesRef.current = newGuides;
      if (newGuides) startTransition(() => setGuides(newGuides));
    }
  }, [grid?.guides]);

  const handleToggleRulers = useCallback(() => {
    setShowGuides(prev => !prev);
    if (onUpdateManifest) {
      onUpdateManifest(toggleGridField(manifest, 'showGuides'));
    }
  }, [manifest, onUpdateManifest]);

  const handleGuidesChange = useCallback((newGuides: GridGuide[]) => {
    setGuides(newGuides);
    if (onUpdateManifest) {
      onUpdateManifest(updateGuides(manifest, newGuides));
    }
  }, [manifest, onUpdateManifest]);

  return {
    showGuides,
    guides,
    handleToggleRulers,
    handleGuidesChange,
  };
}
