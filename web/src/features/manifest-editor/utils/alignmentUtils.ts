'use client';

/**
 * @purpose Gestiona la alineación y distribución de nodos en el manifesto OMEGA.
 * @purpose_en Manages alignment and distribution of nodes in the OMEGA manifest.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:5,imports:4,sig:1fxgvlq
 * @lastUpdated 2026-06-20T11:08:37.233Z
 */

import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from '@/omega-ui-core/utils/treeUtils';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';
import {
  type AlignType,
  type DistType,
  type UpdateManifestFn,
  RACK_ROOT_IDS,
} from '@/features/manifest-editor/utils/alignmentConstants';

// ── Rack root detection ─────────────────────────────────────────────

function isRackRootNode(node: OmegaNode | undefined): boolean {
  if (!node) return false;
  if (node.kind !== 'rack') return false;
  return RACK_ROOT_IDS.has(node.id);
}

// ── Position gathering ──────────────────────────────────────────────

export function gatherPositions(
  root: OmegaNode | null,
  ids: string[],
): { id: string; x: number; y: number; w: number; h: number }[] {
  if (!root) return [];
  const result: { id: string; x: number; y: number; w: number; h: number }[] = [];
  const rootIsRack = isRackRootNode(root);

  for (const id of ids) {
    if (rootIsRack && id === root.id) continue;
    const node = findNodeInTree(root, id);
    if (!node) continue;
    if (isRackRootNode(node)) continue;
    const pos = node.layout?.pos;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number' || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
    result.push({
      id,
      x: pos.x,
      y: pos.y,
      w: node.layout?.size?.width ?? 48,
      h: node.layout?.size?.height ?? 48,
    });
  }
  return result;
}

// ── Alignment ───────────────────────────────────────────────────────

export function computeAlignedPositions(
  items: { id: string; x: number; y: number; w: number; h: number }[],
  type: AlignType,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (items.length === 0) return out;

  switch (type) {
    case 'left': {
      const targetX = Math.min(...items.map(i => i.x));
      for (const i of items) out.set(i.id, { x: targetX, y: i.y });
      break;
    }
    case 'center-h': {
      const targetX = Math.round(
        (Math.min(...items.map(i => i.x)) + Math.max(...items.map(i => i.x + i.w))) / 2,
      );
      for (const i of items) out.set(i.id, { x: targetX - Math.round(i.w / 2), y: i.y });
      break;
    }
    case 'right': {
      const targetX = Math.max(...items.map(i => i.x + i.w));
      for (const i of items) out.set(i.id, { x: targetX - i.w, y: i.y });
      break;
    }
    case 'top': {
      const targetY = Math.min(...items.map(i => i.y));
      for (const i of items) out.set(i.id, { x: i.x, y: targetY });
      break;
    }
    case 'center-v': {
      const targetY = Math.round(
        (Math.min(...items.map(i => i.y)) + Math.max(...items.map(i => i.y + i.h))) / 2,
      );
      for (const i of items) out.set(i.id, { x: i.x, y: targetY - Math.round(i.h / 2) });
      break;
    }
    case 'bottom': {
      const targetY = Math.max(...items.map(i => i.y + i.h));
      for (const i of items) out.set(i.id, { x: i.x, y: targetY - i.h });
      break;
    }
  }
  return out;
}

// ── Distribution ────────────────────────────────────────────────────

export function computeDistributedPositions(
  items: { id: string; x: number; y: number; w: number; h: number }[],
  type: DistType,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (items.length < 3) return out;

  if (type === 'dist-h') {
    const sorted = [...items].sort((a, b) => a.x - b.x);
    const first = sorted[0].x;
    const last = sorted[sorted.length - 1].x;
    const step = (last - first) / (sorted.length - 1);
    for (let i = 0; i < sorted.length; i++) {
      out.set(sorted[i].id, { x: Math.round(first + step * i), y: sorted[i].y });
    }
  } else {
    const sorted = [...items].sort((a, b) => a.y - b.y);
    const first = sorted[0].y;
    const last = sorted[sorted.length - 1].y;
    const step = (last - first) / (sorted.length - 1);
    for (let i = 0; i < sorted.length; i++) {
      out.set(sorted[i].id, { x: sorted[i].x, y: Math.round(first + step * i) });
    }
  }
  return out;
}

/**
 * Distribuye elementos uniformemente en ambos ejes (X e Y) simultáneamente.
 */
export function computeDistributedBothPositions(
  items: { id: string; x: number; y: number; w: number; h: number }[],
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (items.length < 3) return out;

  // Distribute horizontally
  const hSorted = [...items].sort((a, b) => a.x - b.x);
  const hFirst = hSorted[0].x;
  const hLast = hSorted[hSorted.length - 1].x;
  const hStep = (hLast - hFirst) / (hSorted.length - 1);
  const hPositions = new Map<string, number>();
  for (let i = 0; i < hSorted.length; i++) {
    hPositions.set(hSorted[i].id, Math.round(hFirst + hStep * i));
  }

  // Distribute vertically
  const vSorted = [...items].sort((a, b) => a.y - b.y);
  const vFirst = vSorted[0].y;
  const vLast = vSorted[vSorted.length - 1].y;
  const vStep = (vLast - vFirst) / (vSorted.length - 1);
  const vPositions = new Map<string, number>();
  for (let i = 0; i < vSorted.length; i++) {
    vPositions.set(vSorted[i].id, Math.round(vFirst + vStep * i));
  }

  // Combine both axes
  for (const item of items) {
    const nx = hPositions.get(item.id) ?? item.x;
    const ny = vPositions.get(item.id) ?? item.y;
    out.set(item.id, { x: nx, y: ny });
  }
  return out;
}

// ── Batch update ────────────────────────────────────────────────────

/**
 * Atomic batch update: applies all position changes in a single manifest
 * update so React sees one coherent state.
 */
export function applyPositionBatch(
  newPositions: Map<string, { x: number; y: number }>,
  onUpdateManifest: UpdateManifestFn,
  label: string,
) {
  if (newPositions.size === 0) return;
  onUpdateManifest((prev: OMEGA_Manifest) => {
    const tree = prev.ui?.tree;
    if (!tree) return {};
    const nextTree = applyBatchPositionsToTree(tree, newPositions);
    const legacyProjections = treeToManifest(nextTree);
    return {
      nodes: [nextTree],
      ui: {
        ...prev.ui,
        tree: nextTree,
        controls: legacyProjections.ui?.controls ?? legacyProjections.controls ?? prev.ui?.controls ?? [],
        jacks: legacyProjections.ui?.jacks ?? legacyProjections.jacks ?? prev.ui?.jacks ?? [],
        layout: {
          ...(prev.ui?.layout as Record<string, unknown>),
          width: prev.ui?.layout?.width || 800,
          height: prev.ui?.layout?.height || 600,
          containers:
            legacyProjections.ui?.layout?.containers
            ?? legacyProjections.layout?.containers
            ?? prev.ui?.layout?.containers
            ?? [],
        },
      },
    };
  }, label);
}

function applyBatchPositionsToTree(
  root: OmegaNode,
  positions: Map<string, { x: number; y: number }>,
): OmegaNode {
  if (positions.size === 0) return root;
  const walk = (node: OmegaNode): OmegaNode => {
    const pos = positions.get(node.id);
    const updated: OmegaNode = pos
      ? {
          ...node,
          layout: {
            ...node.layout,
            pos: { x: pos.x, y: pos.y },
            size: node.layout?.size,
          },
        }
      : node;
    if (updated.children?.length) {
      let changed = false;
      const nextChildren = updated.children.map((c) => {
        const w = walk(c);
        if (w !== c) changed = true;
        return w;
      });
      if (changed) return { ...updated, children: nextChildren };
    }
    return updated;
  };
  return walk(root);
}
