/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Gestiona cálculos espaciales y detección de colisiones para nodos en un editor de manifesto OMEGA.
 * @purpose_en Manages spatial calculations and collision detection for nodes in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:3,imports:1,sig:7f445n
 * @lastUpdated 2026-06-15T16:55:59.680Z
 */

import type { OMEGA_Manifest, OmegaNode } from '../types/manifest';

interface CollisionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxesIntersect(b1: CollisionBox, b2: CollisionBox) {
  return !(b1.x + b1.w <= b2.x || b2.x + b2.w <= b1.x || b1.y + b1.h <= b2.y || b2.y + b2.h <= b1.y);
}

export function getOccupiedBoxes(manifest: OMEGA_Manifest): CollisionBox[] {
  const boxes: CollisionBox[] = [];
  const isUCA = manifest.ui?.useUCA !== false;
  if (isUCA && manifest.ui?.tree) {
    const walk = (node: OmegaNode, parentX: number, parentY: number) => {
      const currentX = parentX + (node.layout?.pos?.x || 0);
      const currentY = parentY + (node.layout?.pos?.y || 0);
      
      const isStructural = node.kind === 'group' || node.kind === 'container' || node.kind === 'face' || node.kind === 'rack';
      const hasLayout = !!(node.layout?.pos || node.layout?.size);
      if (node.id !== 'RACK_MASTER' && !isStructural && hasLayout) {
        boxes.push({
          x: currentX,
          y: currentY,
          w: node.layout?.size?.width || 48,
          h: node.layout?.size?.height || 48
        });
      }
      node.children?.forEach(child => walk(child, currentX, currentY));
    };
    walk(manifest.ui.tree, 0, 0);
  } else {
    [...(manifest.ui?.controls || []), ...(manifest.ui?.jacks || [])].forEach(entity => {
      boxes.push({
        x: entity.pos?.x || 0,
        y: entity.pos?.y || 0,
        w: entity.size?.width || 48,
        h: entity.size?.height || 48
      });
    });
  }
  
  return boxes;
}

export function resolveFreePosition(
  desiredPos: { x: number; y: number },
  size: { width: number; height: number },
  occupied: CollisionBox[],
  manifest: OMEGA_Manifest
): { x: number; y: number } {
  const w = size.width || 48;
  const h = size.height || 48;

  const intersectsAny = (x: number, y: number) => {
    const box = { x, y, w, h };
    return occupied.some(b => boxesIntersect(box, b));
  };

  if (!intersectsAny(desiredPos.x, desiredPos.y)) {
    return desiredPos;
  }

  const rackWidth = manifest.ui?.layout?.width || manifest.ui?.dimensions?.width || 800;
  const rackHeight = manifest.ui?.layout?.height || manifest.ui?.dimensions?.height || 400;
  const step = 24;

  // Search in grid sequence for a free slot
  for (let y = 0; y <= rackHeight - h; y += step) {
    for (let x = 0; x <= rackWidth - w; x += step) {
      if (!intersectsAny(x, y)) {
        return { x, y };
      }
    }
  }

  // If too full (no slot found), place it outside the right edge
  return { x: rackWidth + 20, y: desiredPos.y };
}

/**
 * Calculate the bounding box of a subtree (rootNode + all children).
 * Returns { width, height } in pixels.
 */
export function computeSubtreeBounds(rootNode: OmegaNode): { width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const walk = (node: OmegaNode) => {
    const px = node.layout?.pos?.x || 0;
    const py = node.layout?.pos?.y || 0;
    const pw = node.layout?.size?.width || 48;
    const ph = node.layout?.size?.height || 48;
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px + pw);
    maxY = Math.max(maxY, py + ph);
    node.children?.forEach(walk);
  };

  walk(rootNode);

  const width = maxX - minX > 0 ? maxX - minX : 100;
  const height = maxY - minY > 0 ? maxY - minY : 100;
  return { width, height };
}
