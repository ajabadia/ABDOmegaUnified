'use client';

/**
 * @purpose Gestiona el asistente de inicio para el bastidor en el editor de manifesto OMEGA, maneja su estado de dismiss y condición de visibilidad.
 * @purpose_en Manages the startup assistant for the rack in the OMEGA manifest editor, handling its dismiss state and visibility condition.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:1cveztn
 * @lastUpdated 2026-06-20T10:47:54.909Z
 */

import { useState, useCallback, useMemo } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

export interface RackStartupAssistantResult {
  isStartupDismissed: boolean;
  showAssistant: boolean;
  dismissAssistant: () => void;
  handleCreateFromScratch: (onCreate?: () => void) => void;
}

export function useRackStartupAssistant(
  manifest: OMEGA_Manifest,
  isLiveMode: boolean,
  allElementsCount: number,
): RackStartupAssistantResult {
  const [isStartupDismissed, setIsStartupDismissed] = useState(false);

  const showAssistant = useMemo(() => {
    if (isLiveMode || isStartupDismissed) return false;
    const tree = manifest.ui?.tree;
    const treeHasContent = !!tree && !!tree.children && tree.children.length > 0;
    const layoutHasContent = allElementsCount > 0;
    return !treeHasContent && !layoutHasContent;
  }, [isLiveMode, isStartupDismissed, manifest.ui?.tree, allElementsCount]);

  const dismissAssistant = useCallback(() => {
    setIsStartupDismissed(true);
  }, []);

  const handleCreateFromScratch = useCallback((onCreate?: () => void) => {
    setIsStartupDismissed(true);
    onCreate?.();
  }, []);

  return {
    isStartupDismissed,
    showAssistant,
    dismissAssistant,
    handleCreateFromScratch,
  };
}
