'use client';

/**
 * @purpose Gestiona operaciones CRUD para entidades en el editor de manifesto OMEGA.
 * @purpose_en Manages CRUD operations for entities in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:qtvvgj
 * @lastUpdated 2026-06-20T10:46:06.662Z
 */

import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { useGroupCRUD } from './useGroupCRUD';
import { useEntityFinder } from './useEntityFinder';
import { useEntityOperations } from './useEntityOperations';
import { useEntityFactory } from './useEntityFactory';
import { useEntityTreeOps } from './useEntityTreeOps';

export const useEntityCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void,
) => {
  const { findItem } = useEntityFinder(manifest);
  const { updateItem, updateItems, duplicateItem, removeItem, removeItems } = useEntityOperations(manifest, updateManifest, addLog);
  const { addEntity, pasteEntity, pasteEntities } = useEntityFactory(manifest, updateManifest, addLog);
  const { moveNode, moveNodeUpDown } = useEntityTreeOps(manifest, updateManifest, addLog);
  const { groupSelected, groupDown, ungroupNode, insertBlueprint } = useGroupCRUD(manifest, updateManifest, addLog);

  return {
    findItem,
    updateItem,
    updateItems,
    duplicateItem,
    removeItem,
    removeItems,
    addEntity,
    pasteEntity,
    pasteEntities,
    groupSelected,
    groupDown,
    ungroupNode,
    insertBlueprint,
    moveNode,
    moveNodeUpDown,
  };
};
