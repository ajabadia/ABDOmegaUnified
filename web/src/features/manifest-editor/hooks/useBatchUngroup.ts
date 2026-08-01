'use client';

/**
 * @purpose Gestiona operaciones de grupo desglosadas en el editor de manifesto OMEGA, permitiendo a los usuarios desglosar grupos de manera atómica y encontrar/undar grupos que contienen hijos específicos.
 * @purpose_en Manages batch ungroup operations in the OMEGA manifest editor, allowing users to desglose groups atomically and find/undo groups containing specific children.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:4,sig:1iul1pf
 * @lastUpdated 2026-06-15T13:12:12.916Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, findParentInTree, removeNodesFromTree, insertNodeInTree } from '../hooks/entities/ucaInspectorAdapter';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';

/** Minimal editor interface required by useBatchUngroup */
export interface BatchUngroupEditor {
  addLog: (message: string) => void;
  ungroupNode: (id: string) => void;
}

/** Minimal updateManifest signature */
type UpdateManifestFn = (
  updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>),
  label?: string,
  forceHistory?: boolean,
) => void;

/**
 * Batch ungroup operations — ungroups multiple groups atomically in a single
 * transaction, and finds/undoes groups containing specific children.
 */
export function useBatchUngroup(
  manifest: OMEGA_Manifest,
  updateManifest: UpdateManifestFn,
  editor: BatchUngroupEditor,
) {
  const handleBatchUngroup = useCallback(
    (ids: string[]) => {
      updateManifest((prev: OMEGA_Manifest) => {
        const tree = prev.ui?.tree;
        if (!tree) return {};
        let nextTree: OmegaNode = JSON.parse(JSON.stringify(tree));
        for (const id of ids) {
          const groupNode = findNodeInTree(nextTree, id);
          if (!groupNode || (groupNode.kind !== 'group' && groupNode.kind !== 'container') || !groupNode.children?.length) continue;
          const parent = findParentInTree(nextTree, id);
          if (!parent) continue;
          const groupPos = groupNode.layout?.pos || { x: 0, y: 0 };
          const reparented = groupNode.children.map(child => ({
            ...child,
            layout: {
              ...child.layout,
              pos: {
                x: (child.layout?.pos?.x || 0) + groupPos.x,
                y: (child.layout?.pos?.y || 0) + groupPos.y,
              },
            },
          }));
          nextTree = removeNodesFromTree(nextTree, [id]);
          for (const child of reparented) {
            nextTree = insertNodeInTree(nextTree, child);
          }
        }
        const projections = treeToManifest(nextTree);
        editor.addLog(`[BATCH] Ungrouped ${ids.length} groups`);
        return {
          nodes: [nextTree],
          ui: {
            ...prev.ui,
            tree: nextTree,
            controls: projections.ui?.controls ?? projections.controls ?? prev.ui?.controls ?? [],
            jacks: projections.ui?.jacks ?? projections.jacks ?? prev.ui?.jacks ?? [],
            layout: {
              ...prev.ui?.layout,
              width: prev.ui?.layout?.width || 800,
              height: prev.ui?.layout?.height || 600,
              containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? prev.ui?.layout?.containers ?? [],
            },
          },
        };
      }, `Batch Ungroup ${ids.length} groups`, true);
    },
    [updateManifest, editor],
  );

  const handleBatchUndoGroup = useCallback(
    (childIds: string[]) => {
      const tree = manifest.ui?.tree;
      if (!tree) {
        editor.addLog('[BATCH UNDO] No tree available');
        return;
      }

      // Search for a group whose children match the given IDs
      const findGroupByChildren = (node: OmegaNode): string | null => {
        if ((node.kind === 'group' || node.kind === 'container') && node.children) {
          const childIdSet = new Set(node.children.map(c => c.id));
          if (childIds.every(id => childIdSet.has(id))) {
            return node.id;
          }
        }
        if (node.children) {
          for (const child of node.children) {
            const found = findGroupByChildren(child);
            if (found) return found;
          }
        }
        return null;
      };

      const groupId = findGroupByChildren(tree);
      if (groupId) {
        editor.ungroupNode(groupId);
        editor.addLog(`[BATCH UNDO] Ungrouped ${groupId} (${childIds.length} children)`);
      } else {
        editor.addLog('[BATCH UNDO] Could not find group containing those children');
      }
    },
    [manifest, editor],
  );

  return { handleBatchUngroup, handleBatchUndoGroup };
}
