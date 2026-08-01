'use client';

/**
 * @purpose Gestiona operaciones para agrupar y desagrupar nodos, así como insertar plantillas en el árbol UCA del editor de manifesto OMEGA.
 * @purpose_en Manages operations for grouping and ungrouping nodes, as well as inserting blueprints in the UCA tree of the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:6bab0i
 * @lastUpdated 2026-06-20T10:46:45.893Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, removeNodesFromTree, insertNodeInTree, updateNodeInTree, findParentInTree } from './ucaInspectorAdapter';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';
import { getOccupiedBoxes, resolveFreePosition } from '@/omega-ui-core/utils/spatialUtils';

export const useGroupCRUD = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void
) => {

  const groupSelected = useCallback((ids: string[]) => {
    if (ids.length < 2) return;
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    const tree = manifest.ui.tree;

    // Collect all nodes and compute bounding box
    const nodes: OmegaNode[] = [];
    for (const id of ids) {
      const node = findNodeInTree(tree, id);
      if (node) nodes.push(node);
    }
    if (nodes.length < 2) return;

    // Bounding box center
    let minX = Infinity, minY = Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.layout?.pos?.x || 0);
      minY = Math.min(minY, n.layout?.pos?.y || 0);
    }

    // Create group node
    const groupId = `group_${crypto.randomUUID().slice(0, 8)}`;
    const groupNode: OmegaNode = {
      id: groupId,
      kind: 'group',
      role: 'composite',
      layout: {
        pos: { x: minX, y: minY },
        mode: 'absolute'
      },
      children: nodes.map(n => ({
        ...n,
        layout: {
          ...n.layout,
          pos: {
            x: (n.layout?.pos?.x || 0) - minX,
            y: (n.layout?.pos?.y || 0) - minY
          }
        }
      }))
    };

    // Remove original nodes, then insert group
    const cleanedTree = removeNodesFromTree(tree, ids);
    const nextTree = insertNodeInTree(cleanedTree, groupNode);
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
          containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? []
        }
      }
    }, `Group ${nodes.length} nodes → ${groupId}`, true);

    addLog(`Grouped ${nodes.length} nodes into ${groupId}`);
    return groupId;
  }, [manifest, updateManifest, addLog]);

  const groupDown = useCallback((id: string) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    const tree = manifest.ui.tree;
    const parentNode = findParentInTree(tree, id);
    if (!parentNode || !parentNode.children) return;

    const idx = parentNode.children.findIndex(c => c.id === id);
    if (idx === -1 || idx === parentNode.children.length - 1) return; // last child, cannot group down

    const sourceNode = parentNode.children[idx];
    const sibling = parentNode.children[idx + 1];

    if (sibling.kind === 'group' || sibling.kind === 'container') {
      const siblingPos = sibling.layout?.pos || { x: 0, y: 0 };
      const sourcePos = sourceNode.layout?.pos || { x: 0, y: 0 };
      
      const updatedSource: OmegaNode = {
        ...sourceNode,
        layout: {
          ...sourceNode.layout,
          pos: {
            x: sourcePos.x - siblingPos.x,
            y: sourcePos.y - siblingPos.y
          }
        }
      };

      const updatedSibling: OmegaNode = {
        ...sibling,
        children: [updatedSource, ...(sibling.children || [])]
      };

      const cleanTree = removeNodesFromTree(tree, [id]);
      const nextTree = updateNodeInTree(cleanTree, sibling.id, updatedSibling);
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
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? []
          }
        }
      }, `Move ${id} inside ${sibling.id}`, true);
      addLog(`Moved node ${id} inside group ${sibling.id}`);
    } else {
      groupSelected([id, sibling.id]);
    }
  }, [manifest, updateManifest, groupSelected, addLog]);

  const ungroupNode = useCallback((groupId: string) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    const tree = manifest.ui.tree;
    const groupNode = findNodeInTree(tree, groupId);
    if (!groupNode || (groupNode.kind !== 'group' && groupNode.kind !== 'container') || !groupNode.children?.length) return;

    const parent = findParentInTree(tree, groupId);
    if (!parent) return;

    // Reparent children to group's position (absolute coords within parent)
    const groupPos = groupNode.layout?.pos || { x: 0, y: 0 };
    const reparented = groupNode.children.map(child => ({
      ...child,
      layout: {
        ...child.layout,
        pos: {
          x: (child.layout?.pos?.x || 0) + groupPos.x,
          y: (child.layout?.pos?.y || 0) + groupPos.y
        }
      }
    }));

    // Remove group, then re-insert children at parent level
    let nextTree = removeNodesFromTree(tree, [groupId]);
    for (const child of reparented) {
      nextTree = insertNodeInTree(nextTree, child);
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
          containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? []
        }
      }
    }, `Ungroup ${groupId} → ${groupNode.children.length} children`, true);

    addLog(`Ungrouped ${groupId} into ${reparented.length} children`);
    return groupNode.children.map(c => c.id);
  }, [manifest, updateManifest, addLog]);

  const insertBlueprint = useCallback((groupNode: { id: string; label: string; pos: { x: number; y: number }; children: Array<{ id: string; type: string; label: string; pos: { x: number; y: number }; size?: { width: number; height: number }; style?: Record<string, unknown>; bind?: { target: string } }> }) => {
    const isUCA = manifest.ui?.useUCA !== false;
    if (!isUCA || !manifest.ui?.tree) return;

    // Clone IDs to avoid collisions
    const idMap = new Map<string, string>();
    const cloneId = (id: string) => {
      const newId = `${id}_${crypto.randomUUID().slice(0, 6)}`;
      idMap.set(id, newId);
      return newId;
    };

    // Convert GroupNode children to OmegaNode
    const omegaChildren: OmegaNode[] = groupNode.children.map(child => ({
      id: cloneId(child.id),
      kind: child.type === 'port' ? 'port' as const : 'cell' as const,
      cellRef: child.type,
      role: child.type === 'port' ? 'io' as const : 'control' as const,
      bind: child.bind?.target,
      layout: {
        pos: { x: child.pos.x, y: child.pos.y },
        size: child.size ? { width: child.size.width, height: child.size.height } : undefined
      },
      style: child.style ? { variant: child.style.variant as string } : undefined
    }));

    // Calculate blueprint bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    groupNode.children.forEach(c => {
      const cx = c.pos.x;
      const cy = c.pos.y;
      const cw = c.size?.width || 48;
      const ch = c.size?.height || 48;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + cw);
      maxY = Math.max(maxY, cy + ch);
    });
    const bpWidth = maxX - minX > 0 ? maxX - minX : 100;
    const bpHeight = maxY - minY > 0 ? maxY - minY : 100;
    const occupied = getOccupiedBoxes(manifest);
    const resolvedPos = resolveFreePosition(groupNode.pos, { width: bpWidth, height: bpHeight }, occupied, manifest);

    const newGroup: OmegaNode = {
      id: cloneId(groupNode.id),
      kind: 'group',
      role: 'composite',
      layout: {
        pos: resolvedPos,
        mode: 'absolute'
      },
      meta: { label: groupNode.label },
      children: omegaChildren
    };

    const nextTree = insertNodeInTree(manifest.ui.tree, newGroup);
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
          containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? []
        }
      }
    }, `Insert blueprint: ${groupNode.label}`, true);

    addLog(`Inserted blueprint: ${groupNode.label} (${omegaChildren.length} children)`);
    return idMap.get(groupNode.id);
  }, [manifest, updateManifest, addLog]);

  return {
    groupSelected,
    groupDown,
    ungroupNode,
    insertBlueprint
  };
};
