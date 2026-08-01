/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona las restricciones espaciales y lógica para nodos en el editor de manifesto OMEGA.
 * @purpose_en Manages spatial constraints and logic for nodes in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:5,imports:1,sig:rov4e3
 * @lastUpdated 2026-06-15T16:54:10.870Z
 */

import type { OmegaNode, OMEGA_Manifest, GridConfig } from '../types/manifest';
  
/**
 * OMEGA ERA 7.2.3 - SPATIAL GOVERNANCE
 * Hierarchical Constraints & Bounding Box Logic
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * snapToGrid
 * Discretizes a position based on grid settings.
 */
export function snapToGrid(pos: { x: number; y: number }, config: GridConfig): { x: number; y: number } {
  if (!config.enabled) return pos;
  
  return {
    x: Math.round(pos.x / config.spacingX) * config.spacingX,
    y: Math.round(pos.y / config.spacingY) * config.spacingY,
  };
}

/**
 * clampChildToParent
 * Clamps a child rectangle so it remains entirely within the parent rectangle.
 * Coordinates are local to the parent.
 */
export function clampChildToParent(child: Rect, parent: Rect, margin = 0): { x: number; y: number } {
  // Calculate valid range for child position
  const minX = margin;
  const maxX = parent.width - margin - child.width;
  const minY = margin;
  const maxY = parent.height - margin - child.height;

  // Clamp position
  return {
    x: Math.min(Math.max(child.x, minX), maxX),
    y: Math.min(Math.max(child.y, minY), maxY),
  };
}

/**
 * getParentRect
 * Resolves the bounding box of a parent node in its own local coordinate system.
 */
export function getParentRect(parent: OmegaNode, manifest: OMEGA_Manifest): Rect {
  if (parent.kind === 'rack') {
    return {
      x: 0,
      y: 0,
      width: manifest.ui?.dimensions?.width || 1200,
      height: manifest.ui?.dimensions?.height || 800
    };
  }

  // For containers and other structural nodes, use their resolved size
  return {
    x: 0,
    y: 0,
    width: parent.layout?.size?.width || 400, // Fallback to safe defaults
    height: parent.layout?.size?.height || 300
  };
}

/**
 * getNodeSize
 * Resolves the size of a node, with fallbacks for cells.
 */
export function getNodeSize(node: OmegaNode): { width: number; height: number } {
  return {
    width: node.layout?.size?.width || 48,
    height: node.layout?.size?.height || 48
  };
}
