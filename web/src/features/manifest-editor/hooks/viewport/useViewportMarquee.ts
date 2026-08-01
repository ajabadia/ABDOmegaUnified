'use client';

/**
 * @purpose Gestiona el seleccionado marquee y la funcionalidad arrastrar-pantalla en el viewport del editor de manifesto OMEGA.
 * @purpose_en Manages the marquee selection and drag-to-pan functionality in the viewport of the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:3,imports:1,sig:7ng85q
 * @lastUpdated 2026-06-20T11:08:33.267Z
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  sectionLeft: number;
  sectionTop: number;
}

export interface ViewportMarqueeResult {
  isDraggingPan: boolean;
  marquee: MarqueeState | null;
  handleSectionMouseDown: (e: React.MouseEvent, viewMode: string, activeTool: string | null | undefined, isLiveMode: boolean) => void;
  didMarqueeRef: React.MutableRefObject<boolean>;
  /** Register a callback for when marquee completes (for intersection + merge in parent) */
  setOnMarqueeComplete: (cb: ((marquee: MarqueeState, isShiftKey: boolean) => void) | null) => void;
  /** Set the pan handler used during drag-to-pan */
  setPanHandler: (fn: ((dx: number, dy: number) => void) | null) => void;
}

export function useViewportMarquee(): ViewportMarqueeResult {
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const didMarqueeRef = useRef(false);
  const isShiftKeyRef = useRef(false);
  const onPanRef = useRef<((dx: number, dy: number) => void) | null>(null);
  const onMarqueeCompleteRef = useRef<((marquee: MarqueeState, isShiftKey: boolean) => void) | null>(null);
  const setOnMarqueeComplete = useCallback((cb: ((marquee: MarqueeState, isShiftKey: boolean) => void) | null) => {
    onMarqueeCompleteRef.current = cb;
  }, []);

  const setPanHandler = useCallback((fn: ((dx: number, dy: number) => void) | null) => {
    onPanRef.current = fn;
  }, []);

  // Window-level mouse handlers for marquee and drag-to-pan
  useEffect(() => {
    if (!marquee && !isDraggingPan) return;

    const handleMove = (e: MouseEvent) => {
      if (marquee) {
        setMarquee(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      } else if (isDraggingPan && dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          hasDraggedRef.current = true;
        }
        onPanRef.current?.(dx, dy);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleUp = (e: MouseEvent) => {
      if (marquee) {
        const dx = Math.abs(e.clientX - marquee.startX);
        const dy = Math.abs(e.clientY - marquee.startY);
        if (dx > 4 || dy > 4) {
          didMarqueeRef.current = true;
          // Pass shift key state to parent for merge logic
          onMarqueeCompleteRef.current?.(marquee, isShiftKeyRef.current);
        }
        setMarquee(null);
      } else if (isDraggingPan) {
        setIsDraggingPan(false);
        dragStartRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [marquee, isDraggingPan]);

  const handleSectionMouseDown = useCallback((
    e: React.MouseEvent,
    viewMode: string,
    activeTool: string | null | undefined,
    isLiveMode: boolean,
  ) => {
    if (isLiveMode) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[id^="uca-"]')) return;
    if ((e.target as HTMLElement).closest('.viewport-controls, .ruler-overlay, [data-toolbar], [data-ghost-overlay]')) return;

    // Capture shift/ctrl for later use in marquee merge
    isShiftKeyRef.current = !!(e.shiftKey || e.ctrlKey);

    if (viewMode === 'rack' && activeTool === 'marquee') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMarquee({ startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY, sectionLeft: rect.left, sectionTop: rect.top });
      return;
    }

    if (viewMode === 'orbital' || (viewMode === 'rack' && activeTool === 'select')) {
      setIsDraggingPan(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;
      e.preventDefault();
    }
  }, []);

  return {
    isDraggingPan,
    marquee,
    handleSectionMouseDown,
    didMarqueeRef,
    setOnMarqueeComplete,
    setPanHandler,
  };
}
