/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

'use client';

/**
 * @purpose Hook que maneja la interacción de perilla (knob drag) para nodos UCA en modo LIVE: arrastre vertical para controlar valor 0-1.
 * @purpose_en Hook that handles knob drag interaction for UCA nodes in LIVE mode: vertical drag to control 0-1 value.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:s2q13w
 * @lastUpdated 2026-06-20T22:29:06.551Z
 */

import { useRef } from 'react';
import type { UCADebugContext } from '../ucaTypes';

interface UseKnobInteractionOptions {
  nodeId: string;
  runtimeValue: number;
  isKnob: boolean;
  debugContext?: UCADebugContext | undefined;
}

interface UseKnobInteractionReturn {
  knobDragRef: React.RefObject<HTMLDivElement | null>;
  handleKnobDragStart: (e: React.PointerEvent) => void;
  handleKnobDragMove: (e: React.PointerEvent) => void;
  handleKnobDragEnd: (e: React.PointerEvent) => void;
}

/**
 * Provides pointer event handlers for knob drag interaction in LIVE mode.
 * Vertical drag distance maps to a 0-1 value range.
 */
export function useKnobInteraction({
  nodeId,
  runtimeValue,
  isKnob,
  debugContext,
}: UseKnobInteractionOptions): UseKnobInteractionReturn {
  const knobDragRef = useRef<HTMLDivElement>(null);
  const knobStartY = useRef<number>(0);
  const knobStartValue = useRef<number>(0);

  const handleKnobDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    knobStartY.current = e.clientY;
    knobStartValue.current = runtimeValue;
    knobDragRef.current?.setPointerCapture(e.pointerId);
  };

  const handleKnobDragMove = (e: React.PointerEvent) => {
    if (debugContext?.isLiveMode && isKnob && debugContext?.onUpdateRuntimeValue) {
      const dy = knobStartY.current - e.clientY;
      const newValue = Math.max(0, Math.min(1, knobStartValue.current + dy / 150));
      debugContext.onUpdateRuntimeValue(nodeId, newValue);
    }
  };

  const handleKnobDragEnd = (e: React.PointerEvent) => {
    knobDragRef.current?.releasePointerCapture(e.pointerId);
  };

  return {
    knobDragRef,
    handleKnobDragStart,
    handleKnobDragMove,
    handleKnobDragEnd,
  };
}
