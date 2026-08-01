'use client';

/**
 * @purpose Gestiona operaciones CRUD para contenedores de diseño en un editor de manifesto OMEGA.
 * @purpose_en Manages CRUD operations for layout containers in an OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:t8cqb1
 * @lastUpdated 2026-06-15T13:10:37.008Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, LayoutContainer } from '@/omega-ui-core/types/manifest';

export const useLayoutCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest>, label?: string) => void,
  addLog: (msg: string) => void
) => {

  const addContainer = useCallback(() => {
    const id = `CONTAINER_${Date.now().toString().slice(-4)}`;
    const newContainer: LayoutContainer = {
      id,
      label: 'New Section',
      pos: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      variant: 'default'
    };

    const nextLayout = { ...manifest.ui.layout, width: manifest.ui.layout?.width || 800, height: manifest.ui.layout?.height || 600, containers: [...(manifest.ui.layout?.containers || []), newContainer] };
    updateManifest({ ui: { ...manifest.ui, layout: nextLayout as OMEGA_Manifest['ui']['layout'] } }, `Add Container: ${id}`);
    addLog(`Added new layout container: ${id}`);
    return id;
  }, [manifest, updateManifest, addLog]);

  const updateContainer = useCallback((id: string, updates: Partial<LayoutContainer>) => {
    const nextContainers = manifest.ui.layout?.containers?.map(c => c.id === id ? { ...c, ...updates } : c) || [];
    const nextLayout: NonNullable<OMEGA_Manifest['ui']['layout']> = {
      width: 800,
      height: 600,
      ...(manifest.ui.layout || {}),
      containers: nextContainers
    };
    updateManifest({ ui: { ...manifest.ui, layout: nextLayout } }, `Update Container: ${id}`);
  }, [manifest, updateManifest]);

  const removeContainer = useCallback((id: string) => {
    const nextContainers = manifest.ui.layout?.containers?.filter(c => c.id !== id) || [];
    
    // Also clear references in items
    const nextControls = (manifest.ui?.controls || []).map(c => c.presentation?.container === id ? { ...c, presentation: { ...c.presentation, container: undefined } } : c);
    const nextJacks = (manifest.ui?.jacks || []).map(j => j.presentation?.container === id ? { ...j, presentation: { ...j.presentation, container: undefined } } : j);

    const nextLayout = { ...manifest.ui.layout, width: manifest.ui.layout?.width || 800, height: manifest.ui.layout?.height || 600, containers: nextContainers };
    updateManifest({ ui: { ...manifest.ui, layout: nextLayout as OMEGA_Manifest['ui']['layout'], controls: nextControls, jacks: nextJacks } }, `Remove Container: ${id}`);
    addLog(`Removed container: ${id}`);
  }, [manifest, updateManifest, addLog]);

  return {
    addContainer,
    updateContainer,
    removeContainer
  };
};
