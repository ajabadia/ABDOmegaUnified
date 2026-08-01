'use client';

/**
 * @purpose Gestiona el estado de arrastre y lógica para crear conexiones de modulación en el SVG de overlay.
 * @purpose_en Manages the drag state and logic for creating connections of modulation in the overlay SVG.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:rr9exf
 * @lastUpdated 2026-06-19T18:48:31.031Z
 */

import { useState, useCallback, useEffect } from 'react';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';
import type { PortHandle } from './connectionOverlayUtils';
import { SNAP_RADIUS } from './connectionOverlayUtils';

interface DragState {
  sourceId: string;
  mouseX: number;
  mouseY: number;
  containerOffset: { left: number; top: number };
}

interface UseConnectionDragResult {
  dragState: DragState | null;
  hoveredLink: string | null;
  setHoveredLink: (id: string | null) => void;
  hoveredHandle: string | null;
  setHoveredHandle: (id: string | null) => void;
  handleHandleMouseDown: (e: React.MouseEvent, handleId: string) => void;
  handleLinkClick: (e: React.MouseEvent, linkId: string) => void;
  /** Ghost line endpoint (snapped) X in container coords */
  ghostX: number;
  /** Ghost line endpoint (snapped) Y in container coords */
  ghostY: number;
  /** Source handle for the ghost line, or null */
  sourceHandle: PortHandle | undefined;
  /** Nearest handle within snap radius, or null */
  nearbyHandle: PortHandle | undefined;
}

export function useConnectionDrag(
  containerRef: React.RefObject<HTMLDivElement | null>,
  handles: PortHandle[],
  manifest: OMEGA_Manifest,
  onAddModulation: (mod: OMEGA_Modulation) => void,
  onRemoveModulation: (id: string) => void,
  refreshPositions: () => void,
): UseConnectionDragResult {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  // ── Drag start ────────────────────────────────────────────────────
  const handleHandleMouseDown = useCallback((e: React.MouseEvent, handleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    setDragState({
      sourceId: handleId,
      mouseX: e.clientX,
      mouseY: e.clientY,
      containerOffset: { left: rect?.left ?? 0, top: rect?.top ?? 0 },
    });
  }, [containerRef]);

  // ── Track mouse during drag + drop ────────────────────────────────
  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: MouseEvent) => {
      setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    };

    const handleUp = () => {
      if (!dragState) return;

      const container = containerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const mouseContainerX = dragState.mouseX - containerRect.left;
        const mouseContainerY = dragState.mouseY - containerRect.top;

        const nearbyHandle = handles.find(h => {
          if (h.id === dragState.sourceId) return false;
          const dx = h.x - mouseContainerX;
          const dy = h.y - mouseContainerY;
          return Math.sqrt(dx * dx + dy * dy) <= SNAP_RADIUS;
        });

        const targetId = nearbyHandle?.id || null;

        if (targetId && targetId !== dragState.sourceId) {
          const exists = (manifest.modulations || []).some(
            m => (m.source === dragState.sourceId && m.target === targetId) ||
                 (m.source === targetId && m.target === dragState.sourceId)
          );
          if (!exists) {
            onAddModulation({
              id: `mod_${dragState.sourceId}_${targetId}`,
              source: dragState.sourceId,
              target: targetId,
              amount: 0.75,
              type: 'unipolar',
            });
            setTimeout(refreshPositions, 50);
          }
        }
      }

      setDragState(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragState, containerRef, manifest, onAddModulation, refreshPositions, handles]);

  // ── Delete link on click ──────────────────────────────────────────
  const handleLinkClick = useCallback((e: React.MouseEvent, linkId: string) => {
    e.stopPropagation();
    onRemoveModulation(linkId);
    setTimeout(refreshPositions, 50);
  }, [onRemoveModulation, refreshPositions]);

  // ── Ghost line coordinates ────────────────────────────────────────
  const ghostRawX = dragState ? (dragState.mouseX - dragState.containerOffset.left) : 0;
  const ghostRawY = dragState ? (dragState.mouseY - dragState.containerOffset.top) : 0;

  const nearbyHandle = dragState
    ? handles.find(h => {
        if (h.id === dragState.sourceId) return false;
        const dx = h.x - ghostRawX;
        const dy = h.y - ghostRawY;
        return Math.sqrt(dx * dx + dy * dy) <= SNAP_RADIUS;
      })
    : undefined;

  const ghostX = nearbyHandle ? nearbyHandle.x : ghostRawX;
  const ghostY = nearbyHandle ? nearbyHandle.y : ghostRawY;
  const sourceHandle = dragState ? handles.find(h => h.id === dragState.sourceId) : undefined;

  return {
    dragState,
    hoveredLink,
    setHoveredLink,
    hoveredHandle,
    setHoveredHandle,
    handleHandleMouseDown,
    handleLinkClick,
    ghostX,
    ghostY,
    sourceHandle,
    nearbyHandle,
  };
}
