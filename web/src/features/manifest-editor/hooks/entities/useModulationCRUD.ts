'use client';

/**
 * @purpose Gestiona operaciones CRUD para modulaciones en un manifesto OMEGA utilizando hook de React.
 * @purpose_en Manages CRUD operations for modulations in an OMEGA manifest using React hooks.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:0486f4
 * @lastUpdated 2026-06-15T13:10:41.198Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

export const useModulationCRUD = (
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void
) => {
  
  const addModulation = useCallback((mod: OMEGA_Modulation) => {
    updateManifest((prev: OMEGA_Manifest) => ({
      modulations: [...(prev.modulations || []), mod]
    }), `Add Modulation: ${mod.id}`);
  }, [updateManifest]);

  const removeModulation = useCallback((id: string) => {
    updateManifest((prev: OMEGA_Manifest) => ({
      modulations: (prev.modulations || []).filter(m => m.id !== id)
    }), `Remove Modulation: ${id}`);
  }, [updateManifest]);

  const updateModulation = useCallback((id: string, updates: Partial<OMEGA_Modulation>) => {
    updateManifest((prev: OMEGA_Manifest) => ({
      modulations: (prev.modulations || []).map(m => m.id === id ? { ...m, ...updates } : m)
    }), `Update Modulation: ${id}`);
  }, [updateManifest]);

  return {
    addModulation,
    removeModulation,
    updateModulation
  };
};
