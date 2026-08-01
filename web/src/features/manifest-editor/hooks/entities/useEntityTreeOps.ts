'use client';

/**
 * @purpose Gestiona operaciones relacionadas con el árbol de entidad en el editor de manifesto OMEGA, incluyendo mover nodos y reordenarlos.
 * @purpose_en Manages operations related to the entity tree in the OMEGA manifest editor, including moving nodes and reordering them.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:jddq7h
 * @lastUpdated 2026-06-19T18:49:35.776Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import {
  findNodeInTree,
  updateNodeInTree,
  findParentInTree,
  calculateWorldPosition,
  removeNodeFromTree,
} from './ucaInspectorAdapter';
import { buildManifestFromTree } from './entityCRUDUtils';

export const useEntityTreeOps = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void,
) => {
  const moveNode = useCallback((nodeId: string, targetParentId: string, index?: number) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    updateManifest((prev) => {
      const tree = prev.ui?.tree;
      if (!tree) return {};

      // 1. Find the source node
      const sourceNode = findNodeInTree(tree, nodeId);
      if (!sourceNode) {
        addLog(`[moveNode] Source node not found: ${nodeId}`);
        return {};
      }

      // 2. Prevent dragging a group into itself or its descendants
      const isDescendant = (parent: OmegaNode, childId: string): boolean => {
        if (parent.id === childId) return true;
        if (parent.children) {
          return parent.children.some(c => isDescendant(c, childId));
        }
        return false;
      };

      const targetParentNode = findNodeInTree(tree, targetParentId);
      if (targetParentNode && isDescendant(sourceNode, targetParentId)) {
        addLog(`[moveNode] Cannot move group ${nodeId} into its own descendant ${targetParentId}`);
        return {};
      }

      // 3. Calculate absolute world position of the source node
      const sourceAbsPos = calculateWorldPosition(tree, nodeId) || { x: 0, y: 0 };

      // 4. Calculate absolute world position of the target parent node
      const parentAbsPos = targetParentId === tree.id
        ? { x: 0, y: 0 }
        : (calculateWorldPosition(tree, targetParentId) || { x: 0, y: 0 });

      // 5. Remove the source node from its current parent
      const cleanedTree = removeNodeFromTree(tree, nodeId);

      // 6. Calculate new relative coordinates
      const newRelPos = {
        x: sourceAbsPos.x - parentAbsPos.x,
        y: sourceAbsPos.y - parentAbsPos.y,
      };

      // 7. Update node's relative position
      const updatedNode: OmegaNode = {
        ...sourceNode,
        layout: {
          ...sourceNode.layout,
          pos: newRelPos,
        },
      };

      // 8. Insert the updated node inside target parent's children at index
      const insertNodeAtParentIndex = (root: OmegaNode, parentId: string, nodeToInsert: OmegaNode, idx?: number): OmegaNode => {
        if (root.id === parentId) {
          const nextChildren = [...(root.children || [])];
          const targetIdx = (idx !== undefined && idx >= 0 && idx <= nextChildren.length) ? idx : nextChildren.length;
          nextChildren.splice(targetIdx, 0, nodeToInsert);
          return { ...root, children: nextChildren };
        }
        if (root.children) {
          return {
            ...root,
            children: root.children.map(child => insertNodeAtParentIndex(child, parentId, nodeToInsert, idx)),
          };
        }
        return root;
      };

      const nextTree = insertNodeAtParentIndex(cleanedTree, targetParentId, updatedNode, index);
      return buildManifestFromTree(prev, nextTree);
    }, `Move Node: ${nodeId}`, true);

    addLog(`Moved node: ${nodeId} to parent ${targetParentId}`);
  }, [manifest, updateManifest, addLog]);

  const moveNodeUpDown = useCallback((nodeId: string, direction: 'up' | 'down') => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    updateManifest((prev) => {
      const tree = prev.ui?.tree;
      if (!tree) return {};

      const parent = findParentInTree(tree, nodeId);
      if (!parent || !parent.children) {
        addLog(`[moveNodeUpDown] Parent not found or root node: ${nodeId}`);
        return {};
      }

      const childrenList = [...parent.children];
      const idx = childrenList.findIndex(c => c.id === nodeId);
      if (idx === -1) return {};

      if (direction === 'up') {
        if (idx === 0) return {}; // already at top
        // Swap
        const temp = childrenList[idx];
        childrenList[idx] = childrenList[idx - 1];
        childrenList[idx - 1] = temp;
      } else {
        if (idx === childrenList.length - 1) return {}; // already at bottom
        // Swap
        const temp = childrenList[idx];
        childrenList[idx] = childrenList[idx + 1];
        childrenList[idx + 1] = temp;
      }

      const updatedParent = {
        ...parent,
        children: childrenList,
      };

      const nextTree = updateNodeInTree(tree, parent.id, updatedParent);
      return buildManifestFromTree(prev, nextTree);
    }, `Reorder Node: ${nodeId} ${direction}`, true);

    addLog(`Reordered node: ${nodeId} ${direction}`);
  }, [manifest, updateManifest, addLog]);

  return { moveNode, moveNodeUpDown };
};
