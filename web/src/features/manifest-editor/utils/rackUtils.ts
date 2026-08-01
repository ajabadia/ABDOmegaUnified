/**
 * @purpose Funciones utilitarias para el VirtualRack: filtrado de árbol UCA y snap-to-grid.
 * @purpose_en Utility functions for VirtualRack: UCA tree filtering and snap-to-grid.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:3,sig:h5swei
 * @lastUpdated 2026-06-20T22:29:06.541Z
 */

import type { OMEGA_Manifest, HybridEntityUpdate, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';
import { snapToGrid } from '@/omega-ui-core/uca/spatialConstraints';

/** Snap a node's position to grid — writes layout: { pos } only (no spread). */
export function handleSnapToGrid(
  id: string,
  manifest: OMEGA_Manifest,
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void
) {
  const rootTree = manifest.ui?.tree;
  if (!rootTree) return;
  const node = findNodeInTree(rootTree, id);
  if (node && node.layout?.pos) {
    const gridConfig = manifest.ui?.layout?.grid || { spacingX: 24, spacingY: 24, snapMode: 'center', enabled: true, visible: true, showGuides: false };
    const snapped = snapToGrid(node.layout.pos, { ...gridConfig, enabled: true });
    onUpdateItem(id, { layout: { pos: { x: Math.round(snapped.x), y: Math.round(snapped.y) } } });
  }
}

/** Filter tree by hidden IDs — recursive, returns new tree omitting hidden nodes. */
export function filterTree(n: OmegaNode | null | undefined, hiddenIds: string[]): OmegaNode | null {
  if (!n) return null;
  if (hiddenIds.includes(n.id)) return null;
  if (n.children) {
    return {
      ...n,
      children: n.children
        .map(c => filterTree(c, hiddenIds))
        .filter((c): c is OmegaNode => c !== null),
    };
  }
  return n;
}
