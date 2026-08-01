'use client';

/**
 * @purpose Gestiona operaciones para entidades en el editor de manifesto OMEGA, incluyendo actualizar, duplicar y eliminar elementos.
 * @purpose_en Manages operations for entities in the OMEGA manifest editor, including updating, duplicating, and removing items.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:15aazgs
 * @lastUpdated 2026-06-20T10:46:25.417Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode } from '@/omega-ui-core/types/manifest';
import {
  findNodeInTree,
  updateNodeInTree,
  findLegacyItem,
  applyUpdatesToNode,
  insertNodeInTree,
  findParentInTree,
  adaptManifestEntityToNode,
  adaptNodeToManifestEntity,
  removeNodeFromTree,
  removeNodesFromTree,
} from './ucaInspectorAdapter';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';
import { regenerateEntityId, cloneAndRegenerateNodeIds } from '../../utils/idManagement';
import { getOccupiedBoxes, resolveFreePosition } from '@/omega-ui-core/utils/spatialUtils';
import { buildManifestFromTree } from './entityCRUDUtils';

export const useEntityOperations = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void,
) => {
  /**
   * updateItem — Single normalization path for all entity updates.
   *
   * CONTRACT (Phase 39 — v9.1.4-dev):
   * - Every call passes through `applyUpdatesToNode`, regardless of whether
   *   the target entity is in the UCA tree or in a legacy array.
   * - The function tolerates both legacy patches (`Partial<ManifestEntity>`
   *   with top-level `pos`/`size`/`presentation`) and native patches
   *   (`Partial<OmegaNode>` with nested `layout.pos`/`layout.size`).
   * - If the entity is in the UCA tree → normalize in place, then call
   *   `updateNodeInTree`, then rebuild the manifest via `buildManifestFromTree`.
   * - If the entity is only in legacy arrays → adapt to a synthetic OmegaNode,
   *   normalize, then either migrate to the tree (UCA mode) or project back
   *   to the legacy array via `adaptNodeToManifestEntity` (legacy mode).
   * - If the entity is not found anywhere → no-op + log.
   * - History label is always `Update Entity: ${id}`.
   */
  const updateItem = useCallback((id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => {
    updateManifest((latestManifest) => {
      const isUCA = latestManifest.ui?.useUCA !== false;
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) { addLog('[updateItem] No UCA tree.'); return {}; }
      const nodeInTree = findNodeInTree(currentTree, id);

      // Path A — Entity exists in the UCA tree: normalize and update in place.
      if (nodeInTree) {
        const translated = applyUpdatesToNode(nodeInTree, updates);
        const finalUpdates: Partial<OmegaNode> = {
          layout: translated.layout,
          style: translated.style,
          bind: translated.bind,
          role: translated.role,
          cellRef: translated.cellRef,
        };
        const nextTree = updateNodeInTree(currentTree, id, finalUpdates);
        return buildManifestFromTree(latestManifest, nextTree);
      }

      // Path B — Entity not in the UCA tree: try legacy arrays.
      const legacyItem = findLegacyItem(latestManifest, id);
      if (!legacyItem) {
        addLog(`[updateItem] Entity not found: ${id}`);
        return {};
      }

      // Adapt legacy → OmegaNode, normalize, then route to UCA tree or legacy array.
      const syntheticNode = adaptManifestEntityToNode(legacyItem);
      const translated = applyUpdatesToNode(syntheticNode, updates);

      if (isUCA) {
        // Migrate the normalized legacy entity into the UCA tree.
        const nextTree = insertNodeInTree(currentTree, translated);
        return buildManifestFromTree(latestManifest, nextTree);
      }

      // Legacy mode: project the normalized OmegaNode back to a ManifestEntity
      // and write it into the appropriate legacy array.
      const updatedEntity = adaptNodeToManifestEntity(translated);
      const isJack = legacyItem.role === 'port' || legacyItem.type === 'port'
        || (latestManifest.ui?.jacks || []).some((j: ManifestEntity) => j.id === id);

      if (isJack) {
        const nextJacks = (latestManifest.ui?.jacks || []).map((j: ManifestEntity) => j.id === id ? updatedEntity : j);
        return { ui: { ...latestManifest.ui, jacks: nextJacks } };
      }

      const nextControls = (latestManifest.ui?.controls || []).map((c: ManifestEntity) => c.id === id ? updatedEntity : c);
      return { ui: { ...latestManifest.ui, controls: nextControls } };
    }, `Update Entity: ${id}`);
  }, [updateManifest, addLog]);

  /**
   * updateItems — Batch atomic update for multiple nodes.
   * Accepts a map of node IDs to their partial updates and applies them all
   * in a single transaction, avoiding race conditions from multiple synchronous
   * `updateManifest` calls.
   */
  const updateItems = useCallback((updatesMap: Record<string, Partial<OmegaNode>>) => {
    updateManifest((latestManifest) => {
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) return {};
      let nextTree: OmegaNode = { ...currentTree };

      Object.entries(updatesMap).forEach(([id, updates]) => {
        const nodeInTree = findNodeInTree(nextTree, id);
        if (nodeInTree) {
          const translated = applyUpdatesToNode(nodeInTree, updates);
          const finalUpdates: Partial<OmegaNode> = {
            layout: translated.layout,
            style: translated.style,
            bind: translated.bind,
            role: translated.role,
            cellRef: translated.cellRef,
          };
          nextTree = updateNodeInTree(nextTree, id, finalUpdates);
        }
      });

      return buildManifestFromTree(latestManifest, nextTree);
    }, `Update Multiple Entities (${Object.keys(updatesMap).length} nodes)`);
  }, [updateManifest]);

  /**
   * duplicateItem — Clones an entity with regenerated IDs and offset position.
   */
  const duplicateItem = useCallback((id: string) => {
    const isUCA = manifest.ui?.useUCA !== false;

    // Use findItem logic inline: check UCA tree first, then legacy
    let item: ManifestEntity | OmegaNode | undefined;
    if (isUCA && manifest.ui?.tree) {
      item = findNodeInTree(manifest.ui.tree, id);
    }
    if (!item) {
      item = findLegacyItem(manifest, id);
    }
    if (!item) return;

    // Industrial Cloning and ID Regeneration (RISK-003 & RISK-004 Fix)
    let newItem: ManifestEntity | OmegaNode;
    const occupied = getOccupiedBoxes(manifest);

    if ('kind' in item) {
      const cloned = cloneAndRegenerateNodeIds(item as OmegaNode);
      const desiredPos = {
        x: (cloned.node.layout?.pos?.x || 0) + 20,
        y: (cloned.node.layout?.pos?.y || 0) + 15,
      };
      const size = cloned.node.layout?.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);

      newItem = {
        ...cloned.node,
        layout: {
          ...cloned.node.layout,
          pos: resolvedPos,
        },
      };
    } else {
      const cloned = regenerateEntityId(item as ManifestEntity);
      const desiredPos = {
        x: (cloned.pos?.x || 0) + 20,
        y: (cloned.pos?.y || 0) + 15,
      };
      const size = cloned.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);

      newItem = {
        ...cloned,
        pos: resolvedPos,
      };
    }

    const newId = newItem.id;

    // Helper: insert a node as sibling of another node
    const insertSiblingNode = (root: OmegaNode, siblingId: string, newNode: OmegaNode): OmegaNode => {
      if (root.children) {
        const idx = root.children.findIndex(c => c.id === siblingId);
        if (idx !== -1) {
          const nextChildren = [...root.children];
          nextChildren.splice(idx + 1, 0, newNode);
          return { ...root, children: nextChildren };
        }
        const nextChildren = root.children.map(child => insertSiblingNode(child, siblingId, newNode));
        return { ...root, children: nextChildren };
      }
      return root;
    };

    if (isUCA && manifest.ui?.tree) {
      // Sibling insertion strategy
      const parentNode = findParentInTree(manifest.ui.tree, id);
      let nextTree: OmegaNode;
      if (parentNode) {
        nextTree = insertSiblingNode(manifest.ui.tree, id, newItem as OmegaNode);
      } else {
        nextTree = insertNodeInTree(manifest.ui.tree, newItem as OmegaNode);
      }
      const projections = treeToManifest(nextTree);
      updateManifest({
        nodes: [nextTree],
        ui: {
          ...manifest.ui,
          tree: nextTree,
          controls: projections.ui?.controls ?? projections.controls ?? manifest.ui?.controls ?? [],
          jacks: projections.ui?.jacks ?? projections.jacks ?? manifest.ui?.jacks ?? [],
          layout: {
            ...manifest.ui?.layout,
            width: manifest.ui?.layout?.width || 800,
            height: manifest.ui?.layout?.height || 600,
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? [],
          },
        },
      }, `Duplicate UCA Node: ${id} → ${newId}`, true);
    } else {
      // Legacy Array Mode
      const isControl = manifest.ui?.controls?.some((c: ManifestEntity) => c.id === id);
      if (isControl) {
        const newList = [...(manifest.ui?.controls || []), newItem as ManifestEntity];
        updateManifest({ ui: { ...manifest.ui, controls: newList } }, `Duplicate Control: ${id}`, true);
      } else {
        const newList = [...(manifest.ui?.jacks || []), newItem as ManifestEntity];
        updateManifest({ ui: { ...manifest.ui, jacks: newList } }, `Duplicate Jack: ${id}`, true);
      }
    }

    addLog(`Duplicated entity: ${newId}`);
    return newId;
  }, [manifest, updateManifest, addLog]);

  /**
   * removeItem — Removes an entity from the UCA tree.
   */
  const removeItem = useCallback((id: string) => {
    updateManifest((latestManifest) => {
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) return {};

      const nextTree = removeNodeFromTree(currentTree, id);
      return buildManifestFromTree(latestManifest, nextTree);
    }, `Remove Entity: ${id}`, true);
    addLog(`Removed entity: ${id}`);
  }, [updateManifest, addLog]);

  /**
   * removeItems — Removes multiple entities atomically.
   */
  const removeItems = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    updateManifest((latestManifest) => {
      const currentTree = latestManifest.ui?.tree;
      if (!currentTree) return {};
      const nextTree = removeNodesFromTree(currentTree, ids);
      return buildManifestFromTree(latestManifest, nextTree);
    }, `Remove ${ids.length} entities`, true);
    ids.forEach(id => addLog(`Removed entity: ${id}`));
  }, [updateManifest, addLog]);

  return {
    updateItem,
    updateItems,
    duplicateItem,
    removeItem,
    removeItems,
  };
};
