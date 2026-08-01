'use client';

/**
 * @purpose Gestiona operaciones CRUD para entidades, modulaciones y contenedores de layout en el editor de manifesto OMEGA.
 * @purpose_en Manages CRUD operations for entities, modulations, and layout containers in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:1vaofxn
 * @lastUpdated 2026-06-15T13:21:36.435Z
 */

import { useEntityCRUD } from './entities/useEntityCRUD';
import { useModulationCRUD } from './entities/useModulationCRUD';
import { useLayoutCRUD } from './entities/useLayoutCRUD';
import { useTemplateCRUD } from './entities/useTemplateCRUD';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA Entity Manager (v7.2.3)
 * Orchestrator hook that composes specialized CRUD operations for entities, 
 * modulations, and layout containers.
 */
export const useEntityManager = (
  manifest: OMEGA_Manifest, 
  _setManifest: (updater: OMEGA_Manifest | ((prev: OMEGA_Manifest) => OMEGA_Manifest), label?: string) => void, 
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void
) => {
  
  // 1. Entity CRUD (Controls & Jacks)
  const entityOps = useEntityCRUD(manifest, updateManifest, addLog);

  // 2. Modulation CRUD (Patching)
  const modulationOps = useModulationCRUD(updateManifest);

  // 3. Layout CRUD (Containers)
  const layoutOps = useLayoutCRUD(manifest, updateManifest, addLog);

  // 4. Template CRUD (Fase 15)
  const templateOps = useTemplateCRUD(manifest, updateManifest, addLog);

  return {
    ...entityOps,
    pasteEntity: entityOps.pasteEntity,
    pasteEntities: entityOps.pasteEntities,
    removeItems: entityOps.removeItems,
    ...modulationOps,
    ...layoutOps,
    ...templateOps
  };
};
