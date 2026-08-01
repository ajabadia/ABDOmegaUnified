'use client';

/**
 * @purpose Gestiona la visibilidad de la cuadrícula y guías en el viewport.
 * @purpose_en Manages grid and guide visibility in the viewport.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { toggleGridField } from '../utils/gridHelpers';

export interface WorkbenchGridState {
  gridVisible: boolean;
  showGuides: boolean;
  handleToggleGrid: () => void;
  handleToggleGuides: () => void;
}

export function useWorkbenchGrid(
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>)) => void,
): WorkbenchGridState {
  const grid = manifest.ui?.layout?.grid;
  const gridVisible = grid?.visible ?? false;
  const showGuides = grid?.showGuides ?? false;

  const handleToggleGrid = useCallback(() => {
    updateManifest(toggleGridField(manifest, 'visible'));
  }, [manifest, updateManifest]);

  const handleToggleGuides = useCallback(() => {
    updateManifest(toggleGridField(manifest, 'showGuides'));
  }, [manifest, updateManifest]);

  return { gridVisible, showGuides, handleToggleGrid, handleToggleGuides };
}
