/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Gestiona el comportamiento de redimensionado de nodos en el editor de manifesto OMEGA, incluyendo manejo de eventos de inicio de redimensionado, panning y fin de evento.
 * @purpose_en Manages the resizing behavior of nodes in the OMEGA manifest editor, including handling resize start, pan, and end events.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:qxwnqd
 * @lastUpdated 2026-06-20T11:09:29.096Z
 */

import React from 'react';
import type { PanInfo } from 'framer-motion';
import type { OmegaNode, OMEGA_Manifest, GridConfig } from '../../types/manifest';
import type { UCADebugContext } from '../ucaTypes';
import { getOriginalNodeSize, computeScaleUpdates } from '../utils/scaleUtils';
import { checkSubtreeMinSize } from '../utils/gridSnapUtils';

interface UseUCAResizeProps {
  node: OmegaNode;
  manifest: OMEGA_Manifest;
  debugContext?: UCADebugContext | undefined;
}

export function useUCAResize({ node, manifest, debugContext }: UseUCAResizeProps) {
  const [resizeOffset, setResizeOffset] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [isResizing, setIsResizing] = React.useState(false);
  const [isShiftActive, setIsShiftActive] = React.useState(false);
  const [isCtrlActive, setIsCtrlActive] = React.useState(false);
  const [isAltActive, setIsAltActive] = React.useState(false);

  const isResizingRef = React.useRef(false);
  const manifestRef = React.useRef(manifest);
  const nodeRef = React.useRef(node);
  const debugContextRef = React.useRef(debugContext);

  // Sync refs on every render — gesture callbacks use these to avoid stale closures.
  React.useEffect(() => {
    manifestRef.current = manifest;
    nodeRef.current = node;
    debugContextRef.current = debugContext;
  });

  const startSizeRef = React.useRef({ width: 0, height: 0 });
  const startPosRef = React.useRef({ x: 0, y: 0 });
  const ratioRef = React.useRef(1);
  const zoomFactorRef = React.useRef(1);
  const lastResizeValuesRef = React.useRef({ w: 0, h: 0, x: 0, y: 0 });

  // Sync Shift/Ctrl/Alt states globally on keydown/keyup to prevent window capturing delays
  React.useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      setIsShiftActive(e.shiftKey);
      setIsCtrlActive(e.ctrlKey);
      setIsAltActive(e.altKey);
    };
    window.addEventListener('keydown', handleKeys);
    window.addEventListener('keyup', handleKeys);
    return () => {
      window.removeEventListener('keydown', handleKeys);
      window.removeEventListener('keyup', handleKeys);
    };
  }, []);

  const handleResizeStart = (e: unknown) => {
    if (e) (e as Event).stopPropagation();
    const ctx = debugContextRef.current;
    if (ctx?.isLiveMode) return;

    // Start Undo/Redo transaction
    if (ctx?.startTransaction) {
      ctx.startTransaction('Resize Element');
    }

    const zoomFactor = ctx?.zoom ?? 1;
    zoomFactorRef.current = zoomFactor;

    const activeNode = nodeRef.current;
    const size = getOriginalNodeSize(activeNode);
    startSizeRef.current = size;
    startPosRef.current = {
      x: activeNode.layout?.pos?.x ?? 0,
      y: activeNode.layout?.pos?.y ?? 0
    };

    ratioRef.current = size.width > 0 ? size.width / size.height : 1;
    isResizingRef.current = true;
    setIsResizing(true);
    
    // Capture initial modifiers from start event if available
    const mouseEvt = e as MouseEvent;
    const isShift = !!(mouseEvt?.shiftKey) || isShiftActive;
    const isCtrl = !!(mouseEvt?.ctrlKey) || isCtrlActive;
    const isAlt = !!(mouseEvt?.altKey) || isAltActive;
    setIsShiftActive(isShift);
    setIsCtrlActive(isCtrl);
    setIsAltActive(isAlt);

    lastResizeValuesRef.current = { w: size.width, h: size.height, x: startPosRef.current.x, y: startPosRef.current.y };
    setResizeOffset({ x: 0, y: 0, width: size.width, height: size.height });
  };

  const handleResizePan = (corner: 'nw' | 'ne' | 'sw' | 'se', event: MouseEvent | TouchEvent, info: PanInfo) => {
    const ctx = debugContextRef.current;
    if (ctx?.isLiveMode || !isResizingRef.current) return;

    const zoom = zoomFactorRef.current;
    const dx = info.offset.x / zoom;
    const dy = info.offset.y / zoom;

    const startW = startSizeRef.current.width;
    const startH = startSizeRef.current.height;
    const startX = startPosRef.current.x;
    const startY = startPosRef.current.y;
    const ratio = ratioRef.current;

    const activeManifest = manifestRef.current;
    const gridConfig = activeManifest.ui?.layout?.grid as GridConfig | undefined;
    const gridEnabled = gridConfig?.enabled ?? false;

    const isShift = !!(event?.shiftKey) || isShiftActive;
    const isCtrl = !!(event?.ctrlKey) || isCtrlActive;
    const isAlt = !!(event?.altKey) || isAltActive;

    if (isShift !== isShiftActive) setIsShiftActive(isShift);
    if (isCtrl !== isCtrlActive) setIsCtrlActive(isCtrl);
    if (isAlt !== isAltActive) setIsAltActive(isAlt);

    let newW = startW;
    let newH = startH;
    let newX = startX;
    let newY = startY;

    // 1. Calculate raw dimensions depending on the corner dragged & Alt symmetric key
    if (isAlt) {
      const centerX = startX + startW / 2;
      const centerY = startY + startH / 2;

      if (corner === 'se') {
        newW = startW + 2 * dx;
        newH = startH + 2 * dy;
      } else if (corner === 'sw') {
        newW = startW - 2 * dx;
        newH = startH + 2 * dy;
      } else if (corner === 'ne') {
        newW = startW + 2 * dx;
        newH = startH - 2 * dy;
      } else if (corner === 'nw') {
        newW = startW - 2 * dx;
        newH = startH - 2 * dy;
      }

      // Enforce symmetric center
      newX = centerX - newW / 2;
      newY = centerY - newH / 2;
    } else {
      if (corner === 'se') {
        newW = startW + dx;
        newH = startH + dy;
      } else if (corner === 'sw') {
        newW = startW - dx;
        newH = startH + dy;
        newX = startX + dx;
      } else if (corner === 'ne') {
        newW = startW + dx;
        newH = startH - dy;
        newY = startY + dy;
      } else if (corner === 'nw') {
        newW = startW - dx;
        newH = startH - dy;
        newX = startX + dx;
        newY = startY + dy;
      }
    }

    // 2. Snap to Grid Math
    const snapToGrid = gridEnabled || isCtrl;
    const spacingX = gridConfig?.spacingX ?? 24;
    const spacingY = gridConfig?.spacingY ?? 24;

    if (snapToGrid) {
      if (isShift) {
        // Snap to Grid AND Proportional: snap dominant axis, scale secondary proportionally
        if (Math.abs(dx) > Math.abs(dy)) {
          const factor = isAlt ? 2 : 1;
          newW = Math.round((startW + factor * dx) / spacingX) * spacingX;
          newH = newW / ratio;
        } else {
          const factor = isAlt ? 2 : 1;
          newH = Math.round((startH + factor * dy) / spacingY) * spacingY;
          newW = newH * ratio;
        }
      } else {
        // Snap to Grid only
        newW = Math.round(newW / spacingX) * spacingX;
        newH = Math.round(newH / spacingY) * spacingY;
      }
      
      // Recalculate positions after snapping in symmetric mode
      if (isAlt) {
        const centerX = startX + startW / 2;
        const centerY = startY + startH / 2;
        newX = centerX - newW / 2;
        newY = centerY - newH / 2;
      } else {
        if (corner === 'sw') {
          newX = startX + (startW - newW);
        } else if (corner === 'ne') {
          newY = startY + (startH - newH);
        } else if (corner === 'nw') {
          newX = startX + (startW - newW);
          newY = startY + (startH - newH);
        }
      }
    } else if (isShift) {
      // Proportional scale only (no snap)
      if (Math.abs(dx) > Math.abs(dy)) {
        const factor = isAlt ? 2 : 1;
        newW = startW + factor * dx;
        newH = newW / ratio;
      } else {
        const factor = isAlt ? 2 : 1;
        newH = startH + factor * dy;
        newW = newH * ratio;
      }

      // Recalculate positions after proportional resize
      if (isAlt) {
        const centerX = startX + startW / 2;
        const centerY = startY + startH / 2;
        newX = centerX - newW / 2;
        newY = centerY - newH / 2;
      } else {
        if (corner === 'sw') {
          newX = startX + (startW - newW);
        } else if (corner === 'ne') {
          newY = startY + (startH - newH);
        } else if (corner === 'nw') {
          newX = startX + (startW - newW);
          newY = startY + (startH - newH);
        }
      }
    }

    // 3. Size constraints (Min & Max Limits)
    const rackW = activeManifest.ui?.dimensions?.width ?? 800;
    const rackH = activeManifest.ui?.dimensions?.height ?? 400;
    const maxLimit = Math.min(rackW, rackH);

    // Apply minimum safety constraint
    if (newW < 16) {
      newW = 16;
      if (isShift) newH = newW / ratio;
    }
    if (newH < 16) {
      newH = 16;
      if (isShift) newW = newH * ratio;
    }

    // Apply maximum chassis constraint
    if (newW > maxLimit) {
      newW = maxLimit;
      if (isShift) newH = newW / ratio;
    }
    if (newH > maxLimit) {
      newH = maxLimit;
      if (isShift) newW = newH * ratio;
    }

    // Clamp relative to child element constraints in subtree
    const scaleX = startW > 0 ? newW / startW : 1;
    const scaleY = startH > 0 ? newH / startH : 1;
    if (!checkSubtreeMinSize(nodeRef.current, scaleX, scaleY)) {
      // Revert size updates if it shrinks any child below 16px
      return;
    }

    // Keep track of values to commit at the end of the drag to avoid React depth/hydration errors
    lastResizeValuesRef.current = {
      w: Math.round(newW),
      h: Math.round(newH),
      x: Math.round(newX),
      y: Math.round(newY)
    };

    // Update parent context for live visual feedback in DOM
    if (ctx?.onUpdateResizeOffset) {
      ctx.onUpdateResizeOffset({
        x: newX - startX,
        y: newY - startY,
        width: newW,
        height: newH,
        resizedNodeId: nodeRef.current.id
      });
    }

    setResizeOffset({
      x: newX - startX,
      y: newY - startY,
      width: newW,
      height: newH
    });
  };

  const handleResizeEnd = () => {
    isResizingRef.current = false;
    setIsResizing(false);
    setResizeOffset(null);

    // Use ref to avoid stale closure — framer-motion may capture onPanEnd
    // at gesture start, so debugContext from the closure could be outdated.
    const ctx = debugContextRef.current;
    const nodeId = nodeRef.current.id;

    // Commit final layout sizing updates to the document store
    const { w, h, x, y } = lastResizeValuesRef.current;
    if (w > 0 && h > 0) {
      const updates = computeScaleUpdates(nodeId, w, h, x, y, manifestRef.current);
      if (ctx?.onUpdateNodes) {
        ctx.onUpdateNodes(updates);
      } else {
        Object.entries(updates).forEach(([id, upd]) => {
          ctx?.onUpdateNode?.(id, upd);
        });
      }
    }

    // Clean up temporary visual scaling offset
    if (ctx?.onUpdateResizeOffset) {
      ctx.onUpdateResizeOffset(null);
    }

    // Commit Undo/Redo transaction
    if (ctx?.commitTransaction) {
      ctx.commitTransaction();
    }
  };

  return {
    resizeOffset,
    isResizing,
    isShiftActive,
    isCtrlActive,
    isAltActive,
    handleResizeStart,
    handleResizePan,
    handleResizeEnd
  };
}
