/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Calcula dimensiones dinamicas para un Nodo de Celda considerando desplazamientos de arrastre, desplazamientos de redimensionamiento, selección múltiple y escalado de tamaño base.
 * @purpose_en Calculates dynamic dimensions for a CellNode considering drag offsets, resize offsets, multi-selection, and base size scaling.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:blf9n3
 * @lastUpdated 2026-06-20T18:38:16.663Z
 */

import type { OmegaNode } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { BASE_CELL_SIZES } from '../utils/cellNodeUtils';

interface UseCellNodeDimensionsOptions {
  node: OmegaNode;
  debugContext?: UCADebugContext | undefined;
  dragOffset: { x: number; y: number } | null;
  isSelected: boolean;
  isMultiSelected: boolean;
}

interface UseCellNodeDimensionsReturn {
  /** Computed current X position (with drag/resize offset) */
  currentX: number;
  /** Computed current Y position (with drag/resize offset) */
  currentY: number;
  /** Computed current width (with resize offset) */
  currentW: number;
  /** Computed current height (with resize offset) */
  currentH: number;
  /** Scale factor for X axis (currentW / baseW) */
  scaleX: number;
  /** Scale factor for Y axis (currentH / baseH) */
  scaleY: number;
  /** Whether this node is currently being resized */
  isBeingResized: boolean;
}

/**
 * Calculates dynamic dimensions for a cell node considering drag offsets,
 * resize offsets, multi-selection, and base size scaling.
 */
export function useCellNodeDimensions({
  node,
  debugContext,
  dragOffset,
  isSelected,
  isMultiSelected,
}: UseCellNodeDimensionsOptions): UseCellNodeDimensionsReturn {
  // Check if we are currently being resized
  const activeResizeOffset = debugContext?.activeResizeOffset;
  const isBeingResized = !!(activeResizeOffset && activeResizeOffset.resizedNodeId === node.id);

  // Determine which offset to apply (self-drag, multi-drag, or resize)
  const isSelectedElsewhere = !!(
    debugContext?.activeDragOffset &&
    debugContext.activeDragOffset.draggedNodeId !== node.id &&
    (isSelected || isMultiSelected)
  );

  const offsetToApply = isSelectedElsewhere
    ? debugContext!.activeDragOffset!
    : (dragOffset || { x: 0, y: 0 });

  // Calculate dynamic dimensions
  const currentW = isBeingResized ? activeResizeOffset!.width : (node.layout?.size?.width ?? 48);
  const currentH = isBeingResized ? activeResizeOffset!.height : (node.layout?.size?.height ?? 48);
  const currentX = isBeingResized
    ? ((node.layout?.pos?.x || 0) + activeResizeOffset!.x)
    : ((node.layout?.pos?.x || 0) + offsetToApply.x);
  const currentY = isBeingResized
    ? ((node.layout?.pos?.y || 0) + activeResizeOffset!.y)
    : ((node.layout?.pos?.y || 0) + offsetToApply.y);

  // Compute visual scale for primitive elements
  const kind = node.cellRef || node.kind || 'knob';
  const baseSize = BASE_CELL_SIZES[kind] || { width: 48, height: 48 };
  const scaleX = currentW / baseSize.width;
  const scaleY = currentH / baseSize.height;

  return {
    currentX,
    currentY,
    currentW,
    currentH,
    scaleX,
    scaleY,
    isBeingResized,
  };
}
