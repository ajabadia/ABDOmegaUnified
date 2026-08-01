'use client';

/**
 * @purpose Gestiona manejo de manejadores de arrastre para arreglos paneles divididos.
 * @purpose_en Manages drag handlers for split pane layouts.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:109koj6
 * @lastUpdated 2026-06-20T11:08:05.404Z
 */

import { useCallback, useMemo } from 'react';

export interface DragHandlers {
  handleDragRatio: (delta: number) => void;
  handleDragPrimarySplitRatio: (delta: number) => void;
  handleDragSecondarySplitRatio: (delta: number) => void;
  handleDragRatioEnd: () => void;
}

export function useWorkbenchDragHandlers(
  actions: {
    setLayoutRatio: (ratio: number) => void;
    setPrimarySplitRatio: (ratio: number) => void;
    setSecondarySplitRatio: (ratio: number) => void;
  },
  layoutState: {
    ratio: number;
    primarySplitRatio: number;
    secondarySplitRatio: number;
  },
): DragHandlers {
  const handleDragRatio = useCallback((delta: number) => {
    actions.setLayoutRatio(layoutState.ratio + delta);
  }, [actions, layoutState.ratio]);

  const handleDragPrimarySplitRatio = useCallback((delta: number) => {
    actions.setPrimarySplitRatio(layoutState.primarySplitRatio + delta);
  }, [actions, layoutState.primarySplitRatio]);

  const handleDragSecondarySplitRatio = useCallback((delta: number) => {
    actions.setSecondarySplitRatio(layoutState.secondarySplitRatio + delta);
  }, [actions, layoutState.secondarySplitRatio]);

  const handleDragRatioEnd = useCallback(() => {}, []);

  return useMemo(() => ({
    handleDragRatio,
    handleDragPrimarySplitRatio,
    handleDragSecondarySplitRatio,
    handleDragRatioEnd,
  }), [handleDragRatio, handleDragPrimarySplitRatio, handleDragSecondarySplitRatio, handleDragRatioEnd]);
}
