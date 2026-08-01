/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Gestiona operaciones de arrastre para nodos UCA en el editor de manifesto OMEGA, actualizando posiciones y manejo de reordenamiento según la entrada del usuario.
 * @purpose_en Manages drag operations for UCA nodes in the OMEGA manifest editor, updating positions and handling reordering based on user input.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:1ybcl7u
 * @lastUpdated 2026-06-20T11:09:21.192Z
 */

import React from 'react';
import type { PanInfo } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, Position, GridConfig } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { clampChildToParent, getParentRect, getNodeSize, snapToGrid } from '../../uca/spatialConstraints';

import { calculateTargetIndex, findParentInTree, findNodeInTree } from '../../uca/treeUtils';

interface UseUCADragProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  debugContext?: UCADebugContext | undefined;
  worldPos: Position;
  labelRef: React.RefObject<HTMLSpanElement | null>;
  localLabelRef: React.RefObject<HTMLSpanElement | null>;
  isLayoutGoverned?: boolean | undefined;
  parentNode?: OmegaNode | null | undefined;
}

/**
 * useUCADrag — Pan-based drag for UCA nodes.
 */
export function useUCADrag({
  node,
  manifest,
  debugContext,
  worldPos,
  labelRef,
  localLabelRef,
  isLayoutGoverned,
  parentNode
}: UseUCADragProps) {
  const [dragOffset, setDragOffset] = React.useState<{ x: number, y: number } | null>(null);
  const [targetIndex, setTargetIndex] = React.useState<number | null>(null);

  const startPosRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Shared draggability computation (DRY) ─────────────────────────────
  const isRootNode = node.id === 'root' || node.id === manifest.ui?.tree?.id;
  const parentIsDraggableContainer = !!(
    parentNode &&
    parentNode.id !== 'root' &&
    parentNode.id !== manifest.ui?.tree?.id &&
    parentNode.kind !== 'rack' &&
    (parentNode.kind === 'container' || parentNode.kind === 'face' || parentNode.kind === 'group') &&
    !(debugContext?.lockedNodeIds?.includes(parentNode.id)) &&
    (parentNode.layout?.mode === 'absolute' || !parentNode.layout?.mode)
  );
  const isDraggable = !debugContext?.isLiveMode && node.kind !== 'rack' && !isRootNode && !debugContext?.lockedNodeIds?.includes(node.id) && !parentIsDraggableContainer;
  const zoomFactorRef = React.useRef(1);

  const updateHUD = (offset: { x: number, y: number }) => {
    if (labelRef.current) {
      const wx = Math.round(worldPos.x + offset.x);
      const wy = Math.round(worldPos.y + offset.y);
      labelRef.current.innerText = `W: ${wx}, ${wy}`;
    }
    if (localLabelRef.current) {
      const lx = Math.round((node.layout?.pos?.x || 0) + offset.x);
      const ly = Math.round((node.layout?.pos?.y || 0) + offset.y);
      localLabelRef.current.innerText = `L: ${lx}, ${ly}`;
    }
  };

  const handlePanStart = () => {
    if (debugContext?.isLiveMode) return;
    if (debugContext?.startTransaction) {
      debugContext.startTransaction('Move Element');
    }
    const zoomFactor = debugContext?.zoom ?? 1;
    zoomFactorRef.current = zoomFactor;
    startPosRef.current = {
      x: node.layout?.pos?.x || 0,
      y: node.layout?.pos?.y || 0
    };
    setDragOffset({ x: 0, y: 0 });
    debugContext?.onUpdateDragOffset?.(null);
  };

  const handlePan = (_: unknown, info: PanInfo) => {
    if (debugContext?.isLiveMode) return;
    const zoomFactor = zoomFactorRef.current;
    const offset = {
      x: info.offset.x / zoomFactor,
      y: info.offset.y / zoomFactor
    };

    setDragOffset(offset);
    updateHUD(offset);

    // Propagate offset to other selected elements
    const isPartOfSelection = debugContext?.selectedId === node.id || debugContext?.multiSelectedIds?.includes(node.id);
    if (isPartOfSelection && debugContext?.onUpdateDragOffset) {
      debugContext.onUpdateDragOffset({ x: offset.x, y: offset.y, draggedNodeId: node.id });
    }

    // Reorder Logic (Phase 4.4.3)
    if (isLayoutGoverned && parentNode?.layout?.mode && parentNode.children) {
      const mode = parentNode.layout.mode as 'stack-v' | 'stack-h';
      const pointerPos = {
        x: startPosRef.current.x + info.offset.x,
        y: startPosRef.current.y + info.offset.y
      };

      const newIndex = calculateTargetIndex(node.id, pointerPos, parentNode.children, mode);
      setTargetIndex(newIndex);
    }
  };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (debugContext?.isLiveMode) {
      debugContext?.onUpdateDragOffset?.(null);
      setDragOffset(null);
      setTargetIndex(null);
      return;
    }
    const wasGoverned = isLayoutGoverned;
    const finalTargetIndex = targetIndex;

    setDragOffset(null);
    setTargetIndex(null);

    if (wasGoverned) {
      if (finalTargetIndex !== null && parentNode && debugContext?.onUpdateNode) {
        const currentIndex = parentNode.children?.findIndex((c: OmegaNode) => c.id === node.id);
        if (currentIndex !== undefined && currentIndex !== -1 && currentIndex !== finalTargetIndex) {
          // Reorder persistence (Phase 4.4.3)
          debugContext.onUpdateNode(parentNode.id, {
            _reorder: { nodeId: node.id, targetIndex: finalTargetIndex }
          } as Record<string, unknown> as Partial<OmegaNode>);
        }
      }
      debugContext?.onUpdateDragOffset?.(null);
      return;
    }

    if (debugContext?.onUpdateNode) {
      const zoomFactor = zoomFactorRef.current;
      const dx = info.offset.x / zoomFactor;
      const dy = info.offset.y / zoomFactor;

      const gridConfig = manifest.ui.layout?.grid as GridConfig | undefined;
      const isPartOfSelection = debugContext.selectedId === node.id || debugContext.multiSelectedIds?.includes(node.id);

      if (isPartOfSelection && debugContext.multiSelectedIds && debugContext.multiSelectedIds.length > 0) {
        // Multi-drag: batch update all selected nodes atomically (Bug 1 fix)
        // Bug 2 fix: snap the dragged node's delta uniformly, then apply that
        // SAME delta to all selected nodes. Snapping each node independently
        // breaks relative alignment because nodes at different positions snap
        // to different grid lines.
        const updatesMap: Record<string, Partial<OmegaNode>> = {};
        const tree = manifest.ui?.tree;
        if (tree) {
          // Compute uniform delta from the dragged node (this node)
          const draggedOrigX = node.layout?.pos?.x || 0;
          const draggedOrigY = node.layout?.pos?.y || 0;
          const rawDraggedX = draggedOrigX + dx;
          const rawDraggedY = draggedOrigY + dy;
          const snappedDragged = gridConfig?.enabled
            ? snapToGrid({ x: rawDraggedX, y: rawDraggedY }, gridConfig)
            : { x: rawDraggedX, y: rawDraggedY };
          const uniformDx = Math.round(snappedDragged.x) - draggedOrigX;
          const uniformDy = Math.round(snappedDragged.y) - draggedOrigY;

          debugContext.multiSelectedIds.forEach((selectedId) => {
            const targetNode = findNodeInTree(tree, selectedId);
            if (targetNode && targetNode.layout?.pos) {
              const newX = (targetNode.layout.pos.x || 0) + uniformDx;
              const newY = (targetNode.layout.pos.y || 0) + uniformDy;
              updatesMap[selectedId] = {
                layout: { pos: { x: Math.round(newX), y: Math.round(newY) } }
              };
            }
          });
        }

        // Fire single atomic batch update, then clean up drag offset AFTER
        if (Object.keys(updatesMap).length > 0) {
          if (debugContext.onUpdateNodes) {
            debugContext.onUpdateNodes(updatesMap);
          } else {
            // Fallback to individual updates if batch not available
            Object.entries(updatesMap).forEach(([id, upd]) => {
              debugContext.onUpdateNode?.(id, upd);
            });
          }
        }
      } else {
        // Single-drag: update positions for this node
        const rawX = startPosRef.current.x + dx;
        const rawY = startPosRef.current.y + dy;
        const snappedPos = gridConfig?.enabled ? snapToGrid({ x: rawX, y: rawY }, gridConfig) : { x: rawX, y: rawY };
        let finalX = Math.round(snappedPos.x);
        let finalY = Math.round(snappedPos.y);

        const tree = manifest.ui?.tree;
        if (node.constraints?.clampToParent && tree) {
          const parent = findParentInTree(tree, node.id);
          if (parent) {
            const parentRect = getParentRect(parent, manifest);
            const size = getNodeSize(node);
            const clamped = clampChildToParent(
              { x: snappedPos.x, y: snappedPos.y, width: size.width, height: size.height },
              parentRect,
              node.constraints.margin || 0
            );
            finalX = clamped.x;
            finalY = clamped.y;
          }
        }

        debugContext.onUpdateNode(node.id, {
          layout: { pos: { x: finalX, y: finalY } }
        });
      }
    }

    // Clean up drag offset AFTER position update (Bug 1 fix — avoid premature visual jump)
    debugContext?.onUpdateDragOffset?.(null);

    if (debugContext?.commitTransaction) {
      debugContext.commitTransaction();
    }
  };

  const isSelected = debugContext?.selectedId === node.id;
  const isResizeMode = isSelected && debugContext?.activeTool === 'transform';
  const panHandlers = (isDraggable && !isResizeMode) ? {
    onPanStart: handlePanStart,
    onPan: handlePan,
    onPanEnd: handlePanEnd,
  } : {};

  return {
    dragOffset,
    targetIndex,
    isDraggable,
    panHandlers,
    handlePanStart,
    handlePan,
    handlePanEnd,
    setDragOffset
  };
}
