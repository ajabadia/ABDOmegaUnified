/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

'use client';

/**
 * @purpose Gestiona el ajuste del saltado de red y las restricciones de árbol para el ajuste de tamaño de OMEGA.
 * @purpose_en Manages grid snapping and subtree constraints for OMEGA node resizing.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1w4srlj
 * @lastUpdated 2026-06-20T12:53:00.395Z
 */

import type { OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * Checks if any child inside the node's subtree would shrink below 16px
 * when scaled by the given factors.
 */
export function checkSubtreeMinSize(
  n: OmegaNode,
  scaleX: number,
  scaleY: number,
): boolean {
  if (!n.children || n.children.length === 0) return true;
  for (const child of n.children) {
    const childOrigW = child.layout?.size?.width ?? (child.kind === 'cell' || child.kind === 'port' ? 48 : 100);
    const childOrigH = child.layout?.size?.height ?? (child.kind === 'cell' || child.kind === 'port' ? 48 : 100);
    if (childOrigW * scaleX < 16 || childOrigH * scaleY < 16) {
      return false;
    }
    if (!checkSubtreeMinSize(child, scaleX, scaleY)) {
      return false;
    }
  }
  return true;
}
